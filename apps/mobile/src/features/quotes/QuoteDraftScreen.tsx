import type { CreateQuoteDraft } from '@cotali/contracts';
import {
  calculateLineTotalInCents,
  calculateQuoteTotals,
  QuoteDomainError,
} from '@cotali/domain';
import { randomUUID } from 'expo-crypto';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { formatBrl, formatBrlInput, parseBrlInput } from './money';
import { createQuoteDraft } from './quote-api';
import {
  clearLocalQuoteDraft,
  loadLocalQuoteDraft,
  saveLocalQuoteDraft,
} from './quote-draft-storage';
import type { LocalQuoteDraft, PaymentPlan } from './quote-draft-state';
import { QuoteLineEditor, type EditableQuoteLine } from './QuoteLineEditor';
import {
  VoiceCaptureCard,
  type CapturedRecording,
} from '../voice/VoiceCaptureCard';

const emptyLine = (): EditableQuoteLine => ({
  description: '',
  quantity: '1',
  unit: 'un',
  unitPrice: '',
});

export function QuoteDraftScreen() {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [services, setServices] = useState<EditableQuoteLine[]>([emptyLine()]);
  const [materials, setMaterials] = useState<EditableQuoteLine[]>([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('integral');
  const [installmentCount, setInstallmentCount] = useState('2');
  const [executionDeadline, setExecutionDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [mutationId, setMutationId] = useState(randomUUID);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<
    'error' | 'pending' | 'saved'
  >('pending');
  const [recording, setRecording] = useState<CapturedRecording | null>(null);
  const [pendingSubmission, setPendingSubmission] =
    useState<CreateQuoteDraft | null>(null);

  const localDraft = useMemo<LocalQuoteDraft>(
    () => ({
      clientName,
      clientPhone,
      discount,
      executionDeadline,
      installmentCount,
      materials,
      mutationId,
      notes,
      paymentMethod,
      paymentPlan,
      services,
      version: 1,
    }),
    [
      clientName,
      clientPhone,
      discount,
      executionDeadline,
      installmentCount,
      materials,
      mutationId,
      notes,
      paymentMethod,
      paymentPlan,
      services,
    ],
  );

  useEffect(() => {
    let active = true;
    void loadLocalQuoteDraft()
      .then((draft) => {
        if (!active || !draft) return;
        setClientName(draft.clientName);
        setClientPhone(draft.clientPhone);
        setDiscount(draft.discount);
        setExecutionDeadline(draft.executionDeadline);
        setInstallmentCount(draft.installmentCount);
        setMaterials(draft.materials);
        setMutationId(draft.mutationId);
        setNotes(draft.notes);
        setPaymentMethod(draft.paymentMethod);
        setPaymentPlan(draft.paymentPlan);
        setServices(draft.services);
      })
      .catch(() => setPersistenceStatus('error'))
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setPersistenceStatus('pending');
    const timeout = setTimeout(() => {
      void saveLocalQuoteDraft(localDraft)
        .then(() => setPersistenceStatus('saved'))
        .catch(() => setPersistenceStatus('error'));
    }, 400);
    return () => clearTimeout(timeout);
  }, [hydrated, localDraft]);

  const totals = useMemo(() => {
    try {
      return calculateQuoteTotals({
        discountInCents: parseBrlInput(discount) ?? 0,
        materials: materials.map(toDomainLine),
        services: services.map(toDomainLine),
      });
    } catch {
      return null;
    }
  }, [discount, materials, services]);

  function reviewQuote() {
    try {
      if (clientName.trim() === '')
        throw new Error('Informe o nome do cliente.');
      if (services.length === 0)
        throw new Error('Adicione pelo menos um serviço.');
      if (
        [...services, ...materials].some(
          (line) => line.description.trim() === '',
        )
      ) {
        throw new Error('Preencha a descrição de todas as linhas.');
      }
      if ([...services, ...materials].some((line) => line.unitPrice === '')) {
        throw new Error('Informe os preços antes de revisar o orçamento.');
      }
      if (paymentPlan === 'installments') {
        const count = Number(installmentCount);
        if (!Number.isInteger(count) || count < 2 || count > 24) {
          throw new Error('Informe entre 2 e 24 parcelas.');
        }
      }

      calculateQuoteTotals({
        discountInCents: parseBrlInput(discount) ?? 0,
        materials: materials.map(toDomainLine),
        services: services.map(toDomainLine),
      });
      setReviewing(true);
    } catch (error) {
      const message =
        error instanceof QuoteDomainError || error instanceof Error
          ? error.message
          : 'Revise os campos do orçamento.';
      Alert.alert('Ainda falta uma informação', message);
    }
  }

  async function confirmDraft() {
    const submission = pendingSubmission ?? buildSubmission();
    setPendingSubmission(submission);
    setSaving(true);

    try {
      const quote = await createQuoteDraft(submission);
      Alert.alert(
        'Orçamento salvo',
        `Rascunho ${quote.id.slice(0, 8)} criado com sucesso.`,
      );
      await clearLocalQuoteDraft();
      resetForm();
    } catch (error) {
      Alert.alert(
        'Não foi possível salvar',
        error instanceof Error
          ? error.message
          : 'Verifique a conexão e tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  function buildSubmission(): CreateQuoteDraft {
    return {
      client: { name: clientName.trim(), phone: normalizePhone(clientPhone) },
      conditions: {
        executionDeadline: executionDeadline.trim() || null,
        installmentCount:
          paymentPlan === 'installments' ? Number(installmentCount) : null,
        notes: notes.trim() || null,
        paymentMethod: paymentMethod.trim() || null,
        paymentPlanType: paymentPlan,
        validUntil: null,
      },
      discountInCents: parseBrlInput(discount) ?? 0,
      materials: materials.map(toDomainLine),
      mutationId,
      services: services.map(toDomainLine),
      source: 'manual',
    };
  }

  function resetForm() {
    setClientName('');
    setClientPhone('');
    setServices([emptyLine()]);
    setMaterials([]);
    setDiscount('');
    setPaymentMethod('Pix');
    setPaymentPlan('integral');
    setInstallmentCount('2');
    setExecutionDeadline('');
    setNotes('');
    setMutationId(randomUUID());
    setPendingSubmission(null);
    setRecording(null);
    setReviewing(false);
  }

  if (reviewing && totals) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        <Text style={styles.eyebrow}>REVISÃO DO ORÇAMENTO</Text>
        <Text style={styles.pageTitle}>{clientName}</Text>
        <Text style={styles.subtitle}>
          {clientPhone || 'Telefone não informado'}
        </Text>
        <ReviewLines lines={services} title="Serviços" />
        {materials.length > 0 && (
          <ReviewLines lines={materials} title="Materiais" />
        )}
        <Section title="Condições">
          <ReviewRow
            label="Pagamento"
            value={paymentMethod || 'Não informado'}
          />
          <ReviewRow
            label="Plano"
            value={paymentPlanLabel(paymentPlan, installmentCount)}
          />
          <ReviewRow
            label="Execução"
            value={executionDeadline || 'Não informado'}
          />
          {notes !== '' && <Text style={styles.notes}>{notes}</Text>}
        </Section>
        <View style={styles.totalCard}>
          <ReviewRow
            label="Serviços"
            value={formatBrl(totals.servicesInCents)}
          />
          <ReviewRow
            label="Materiais"
            value={formatBrl(totals.materialsInCents)}
          />
          <ReviewRow
            label="Desconto"
            value={`− ${formatBrl(totals.discountInCents)}`}
          />
          <View style={styles.divider} />
          <ReviewRow
            emphasized
            label="Total"
            value={formatBrl(totals.totalInCents)}
          />
        </View>
        <Pressable
          onPress={() => {
            setPendingSubmission(null);
            setReviewing(false);
          }}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Voltar e editar</Text>
        </Pressable>
        <Pressable
          disabled={saving}
          onPress={confirmDraft}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Salvando…' : 'Confirmar rascunho'}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>NOVO ORÇAMENTO</Text>
        <Text style={styles.pageTitle}>Monte o rascunho</Text>
        <Text style={styles.subtitle}>
          Fale uma vez ou preencha manualmente.
        </Text>
        <VoiceCaptureCard onRecordingChange={setRecording} />
        <Text
          style={
            persistenceStatus === 'error'
              ? styles.persistenceError
              : styles.persistenceStatus
          }
        >
          {persistenceStatus === 'saved'
            ? 'Rascunho salvo neste aparelho'
            : persistenceStatus === 'error'
              ? 'Não foi possível salvar o rascunho local'
              : 'Salvando rascunho…'}
        </Text>
        {recording && (
          <Text style={styles.recordingStatus}>
            Áudio capturado. O envio para interpretação será habilitado no
            próximo corte do fluxo de voz.
          </Text>
        )}
        <Section title="Cliente">
          <Field label="Nome">
            <TextInput
              autoCapitalize="words"
              onChangeText={setClientName}
              placeholder="Nome do cliente"
              placeholderTextColor="#829087"
              style={styles.input}
              value={clientName}
            />
          </Field>
          <Field label="WhatsApp">
            <TextInput
              keyboardType="phone-pad"
              onChangeText={setClientPhone}
              placeholder="(11) 99999-9999"
              placeholderTextColor="#829087"
              style={styles.input}
              value={clientPhone}
            />
          </Field>
        </Section>
        <LineSection
          kind="service"
          limit={5}
          lines={services}
          onChange={setServices}
          title="Serviços"
        />
        <LineSection
          kind="material"
          limit={10}
          lines={materials}
          onChange={setMaterials}
          title="Materiais"
        />
        <Section title="Condições">
          <Field label="Forma de pagamento">
            <TextInput
              onChangeText={setPaymentMethod}
              placeholder="Ex.: Pix, cartão ou dinheiro"
              placeholderTextColor="#829087"
              style={styles.input}
              value={paymentMethod}
            />
          </Field>
          <Text style={styles.label}>Plano de pagamento</Text>
          <View style={styles.segmented}>
            {(['integral', 'partial', 'installments'] as const).map(
              (option) => (
                <Pressable
                  key={option}
                  onPress={() => setPaymentPlan(option)}
                  style={[
                    styles.segment,
                    paymentPlan === option && styles.segmentActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      paymentPlan === option && styles.segmentTextActive,
                    ]}
                  >
                    {option === 'integral'
                      ? 'Integral'
                      : option === 'partial'
                        ? 'Parcial'
                        : 'Parcelado'}
                  </Text>
                </Pressable>
              ),
            )}
          </View>
          {paymentPlan === 'installments' && (
            <Field label="Número de parcelas">
              <TextInput
                keyboardType="number-pad"
                onChangeText={setInstallmentCount}
                style={styles.input}
                value={installmentCount}
              />
            </Field>
          )}
          <Field label="Prazo de execução">
            <TextInput
              onChangeText={setExecutionDeadline}
              placeholder="Ex.: até 5 dias úteis"
              placeholderTextColor="#829087"
              style={styles.input}
              value={executionDeadline}
            />
          </Field>
          <Field label="Desconto">
            <TextInput
              keyboardType="number-pad"
              onChangeText={setDiscount}
              placeholder="R$ 0,00"
              placeholderTextColor="#829087"
              style={styles.input}
              value={discount === '' ? '' : formatBrlInput(discount)}
            />
          </Field>
          <Field label="Observações">
            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="Informações importantes para o cliente"
              placeholderTextColor="#829087"
              style={[styles.input, styles.multiline]}
              value={notes}
            />
          </Field>
        </Section>
        <View style={styles.summary}>
          <View>
            <Text style={styles.totalLabel}>Total estimado</Text>
            <Text style={styles.totalValue}>
              {formatBrl(totals?.totalInCents ?? 0)}
            </Text>
          </View>
          <Pressable onPress={reviewQuote} style={styles.primaryButtonInline}>
            <Text style={styles.primaryButtonText}>Revisar</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LineSection({
  kind,
  limit,
  lines,
  onChange,
  title,
}: Readonly<{
  kind: 'material' | 'service';
  limit: number;
  lines: EditableQuoteLine[];
  onChange: (lines: EditableQuoteLine[]) => void;
  title: string;
}>) {
  return (
    <Section title={`${title} · ${lines.length}/${limit}`}>
      {lines.map((line, index) => (
        <QuoteLineEditor
          index={index}
          key={`${kind}-${index}`}
          kind={kind}
          line={line}
          onChange={(next) =>
            onChange(lines.map((current, i) => (i === index ? next : current)))
          }
          onRemove={() => onChange(lines.filter((_, i) => i !== index))}
        />
      ))}
      {lines.length < limit && (
        <Pressable
          onPress={() => onChange([...lines, emptyLine()])}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>
            + Adicionar {kind === 'service' ? 'serviço' : 'material'}
          </Text>
        </Pressable>
      )}
    </Section>
  );
}

function ReviewLines({
  lines,
  title,
}: Readonly<{ lines: EditableQuoteLine[]; title: string }>) {
  return (
    <Section title={title}>
      {lines.map((line, index) => (
        <View key={`${title}-${index}`} style={styles.reviewLine}>
          <View style={styles.reviewLineDescription}>
            <Text style={styles.reviewName}>{line.description}</Text>
            <Text
              style={styles.reviewMeta}
            >{`${line.quantity} ${line.unit}`}</Text>
          </View>
          <Text style={styles.reviewPrice}>
            {formatBrl(calculateLineTotalInCents(toDomainLine(line)) ?? 0)}
          </Text>
        </View>
      ))}
    </Section>
  );
}

function ReviewRow({
  emphasized = false,
  label,
  value,
}: Readonly<{ emphasized?: boolean; label: string; value: string }>) {
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewRowText, emphasized && styles.emphasized]}>
        {label}
      </Text>
      <Text style={[styles.reviewRowText, emphasized && styles.emphasized]}>
        {value}
      </Text>
    </View>
  );
}

function Section({
  children,
  title,
}: Readonly<{ children: ReactNode; title: string }>) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field({
  children,
  label,
}: Readonly<{ children: ReactNode; label: string }>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function toDomainLine(line: EditableQuoteLine) {
  return {
    description: line.description.trim(),
    quantity: line.quantity,
    unit: line.unit.trim() || null,
    unitPriceInCents: parseBrlInput(line.unitPrice),
  };
}

function paymentPlanLabel(plan: PaymentPlan, count: string): string {
  if (plan === 'integral') return 'Pagamento integral';
  if (plan === 'partial') return 'Pagamentos parciais';
  return `${count} parcelas`;
}

function normalizePhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return null;
  return digits.length <= 11 ? `+55${digits}` : `+${digits}`;
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    borderColor: '#16875D',
    borderRadius: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    padding: 14,
  },
  addButtonText: { color: '#147553', fontSize: 15, fontWeight: '700' },
  divider: { backgroundColor: '#CAD9D0', height: 1, marginVertical: 6 },
  emphasized: { color: '#102A20', fontSize: 20, fontWeight: '800' },
  eyebrow: {
    color: '#16875D',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  field: { gap: 7 },
  flex: { backgroundColor: '#F4F7F2', flex: 1 },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD8D0',
    borderRadius: 13,
    borderWidth: 1,
    color: '#102A20',
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  label: { color: '#3F5A4C', fontSize: 13, fontWeight: '700' },
  multiline: { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' },
  notes: { color: '#476052', fontSize: 14, lineHeight: 21 },
  pageTitle: {
    color: '#102A20',
    fontSize: 34,
    fontWeight: '800',
    marginTop: 8,
  },
  persistenceError: { color: '#A23B35', fontSize: 13, fontWeight: '700' },
  persistenceStatus: { color: '#527064', fontSize: 13, fontWeight: '700' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#16875D',
    borderRadius: 16,
    padding: 17,
  },
  primaryButtonInline: {
    backgroundColor: '#16875D',
    borderRadius: 14,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  reviewLine: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewLineDescription: { flex: 1 },
  reviewMeta: { color: '#718078', fontSize: 13, marginTop: 3 },
  reviewName: { color: '#19372A', fontSize: 16, fontWeight: '700' },
  reviewPrice: { color: '#19372A', fontSize: 15, fontWeight: '700' },
  recordingStatus: {
    backgroundColor: '#E4F0E9',
    borderRadius: 12,
    color: '#315D49',
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
  },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reviewRowText: { color: '#476052', fontSize: 15 },
  screen: {
    backgroundColor: '#F4F7F2',
    gap: 16,
    padding: 22,
    paddingBottom: 48,
    paddingTop: 64,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#16875D',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  secondaryButtonText: { color: '#147553', fontSize: 16, fontWeight: '800' },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    gap: 12,
    padding: 17,
  },
  sectionTitle: { color: '#19372A', fontSize: 18, fontWeight: '800' },
  segment: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 11,
  },
  segmentActive: { backgroundColor: '#16875D' },
  segmented: {
    backgroundColor: '#E9EFEB',
    borderRadius: 13,
    flexDirection: 'row',
    padding: 3,
  },
  segmentText: { color: '#526A5E', fontSize: 12, fontWeight: '700' },
  segmentTextActive: { color: '#FFFFFF' },
  subtitle: { color: '#5A7064', fontSize: 16, lineHeight: 23 },
  summary: {
    alignItems: 'center',
    backgroundColor: '#102A20',
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 18,
  },
  totalCard: {
    backgroundColor: '#E4F0E9',
    borderRadius: 20,
    gap: 10,
    padding: 18,
  },
  totalLabel: { color: '#B8C9BF', fontSize: 12, fontWeight: '700' },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 3,
  },
});
