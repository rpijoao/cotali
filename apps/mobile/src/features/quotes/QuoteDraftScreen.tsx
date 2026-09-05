import type {
  CreateQuoteDraft,
  QuoteDetails,
  VoiceQuoteEditInterpretation,
  VoiceInterpretation,
} from '@cotali/contracts';
import {
  applyQuoteClientNameEdit,
  applyQuoteLineEdit,
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
import {
  createQuoteDraft,
  interpretQuoteEdit,
  interpretQuoteVoice,
  updateQuoteRevision,
} from './quote-api';
import {
  clearLocalQuoteDraft,
  loadLocalQuoteDraft,
  saveLocalQuoteDraft,
} from './quote-draft-storage';
import type {
  LocalQuoteDraft,
  PaymentPlan,
  QuoteSource,
} from './quote-draft-state';
import { hasLocalQuoteDraftContent } from './quote-draft-state';
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
const NO_OP_EDIT_MESSAGE =
  'Não identificamos uma alteração aplicável. Diga um ajuste específico para um serviço, material ou nome de cliente.';

type QuoteDraftStep = 'capture' | 'details';

export function QuoteDraftScreen({
  editingQuote,
  onBackToHome,
  onSaved,
  startFresh = false,
}: Readonly<{
  editingQuote?: QuoteDetails;
  onBackToHome?: () => void;
  onSaved?: () => void;
  startFresh?: boolean;
}>) {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [services, setServices] = useState<EditableQuoteLine[]>([emptyLine()]);
  const [materials, setMaterials] = useState<EditableQuoteLine[]>([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [paymentPlan, setPaymentPlan] = useState<PaymentPlan>('integral');
  const [source, setSource] = useState<QuoteSource>('manual');
  const [installmentCount, setInstallmentCount] = useState('2');
  const [executionDeadline, setExecutionDeadline] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [mutationId, setMutationId] = useState(randomUUID);
  const [voiceMutationId, setVoiceMutationId] = useState(randomUUID);
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [persistenceStatus, setPersistenceStatus] = useState<
    'error' | 'pending' | 'saved'
  >('pending');
  const [recording, setRecording] = useState<CapturedRecording | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [editRecording, setEditRecording] = useState<CapturedRecording | null>(
    null,
  );
  const [editResult, setEditResult] =
    useState<VoiceQuoteEditInterpretation | null>(null);
  const [editMutationId, setEditMutationId] = useState(randomUUID);
  const [editStatus, setEditStatus] = useState<
    'failed' | 'idle' | 'processing' | 'ready'
  >('idle');
  const [lastEditUndo, setLastEditUndo] = useState<{
    clientName: string;
    materials: EditableQuoteLine[];
    services: EditableQuoteLine[];
    source: QuoteSource;
  } | null>(null);
  const [step, setStep] = useState<QuoteDraftStep>('capture');
  const [voiceStatus, setVoiceStatus] = useState<
    'failed' | 'idle' | 'processing' | 'ready'
  >('idle');
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
      source,
      services,
      validUntil,
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
      source,
      services,
      validUntil,
    ],
  );

  useEffect(() => {
    let active = true;
    if (editingQuote) {
      setClientName(editingQuote.client.name);
      setClientPhone(editingQuote.client.phone ?? '');
      setDiscount(String(editingQuote.discountInCents));
      setExecutionDeadline(editingQuote.conditions.executionDeadline ?? '');
      setInstallmentCount(
        editingQuote.conditions.installmentCount === null
          ? '2'
          : String(editingQuote.conditions.installmentCount),
      );
      setMaterials(editingQuote.materials.map(toEditableLine));
      setNotes(editingQuote.conditions.notes ?? '');
      setPaymentMethod(editingQuote.conditions.paymentMethod ?? '');
      setPaymentPlan(editingQuote.conditions.paymentPlanType);
      setSource(editingQuote.source);
      setServices(editingQuote.services.map(toEditableLine));
      setValidUntil(editingQuote.conditions.validUntil ?? '');
      setStep('details');
      setHydrated(true);
      return () => {
        active = false;
      };
    }
    if (startFresh) {
      void clearLocalQuoteDraft()
        .catch(() => setPersistenceStatus('error'))
        .finally(() => {
          if (active) setHydrated(true);
        });
      return () => {
        active = false;
      };
    }
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
        setSource(draft.source);
        setServices(draft.services);
        setValidUntil(draft.validUntil ?? '');
        if (hasLocalQuoteDraftContent(draft)) setStep('details');
      })
      .catch(() => setPersistenceStatus('error'))
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, [editingQuote, startFresh]);

  useEffect(() => {
    if (!hydrated || editingQuote) return;
    setPersistenceStatus('pending');
    const timeout = setTimeout(() => {
      void saveLocalQuoteDraft(localDraft)
        .then(() => setPersistenceStatus('saved'))
        .catch(() => setPersistenceStatus('error'));
    }, 400);
    return () => clearTimeout(timeout);
  }, [editingQuote, hydrated, localDraft]);

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
      if (
        validUntil.trim() !== '' &&
        !/^\d{4}-\d{2}-\d{2}$/.test(validUntil.trim())
      ) {
        throw new Error('Informe a validade no formato AAAA-MM-DD.');
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
      const quote = editingQuote
        ? await updateQuoteRevision(editingQuote.id, submission)
        : await createQuoteDraft(submission);
      Alert.alert(
        editingQuote ? 'Orçamento atualizado' : 'Orçamento salvo',
        editingQuote
          ? `Revisão ${quote.revisionNumber} salva com sucesso.`
          : `Rascunho ${quote.id.slice(0, 8)} criado com sucesso.`,
      );
      if (!editingQuote) await clearLocalQuoteDraft();
      resetForm();
      onSaved?.();
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

  async function processRecording() {
    if (!recording) return;
    const requestMutationId =
      voiceStatus === 'failed' ? randomUUID() : voiceMutationId;
    if (requestMutationId !== voiceMutationId) {
      setVoiceMutationId(requestMutationId);
    }
    setVoiceStatus('processing');
    try {
      const interpretation = await interpretQuoteVoice({
        mutationId: requestMutationId,
        uri: recording.uri,
      });
      setTranscript(interpretation.transcript);
      applyInterpretation(interpretation);
      setVoiceStatus('ready');
      const ambiguityMessage = interpretation.ambiguities.length
        ? ` Revise: ${interpretation.ambiguities.join(' ')}`
        : '';
      Alert.alert(
        'Áudio processado',
        `Confira os dados extraídos antes de salvar.${ambiguityMessage}`,
      );
    } catch (error) {
      setVoiceStatus('failed');
      Alert.alert(
        'Não foi possível processar',
        error instanceof Error
          ? error.message
          : 'Verifique a conexão e tente novamente.',
      );
    }
  }

  async function processEditRecording() {
    if (!editRecording) return;
    setEditStatus('processing');
    try {
      const result = await interpretQuoteEdit({
        draft: {
          client: {
            name: clientName.trim(),
            phone: clientPhone.trim(),
          },
          materials: materials.map(toEditContextLine),
          services: services.map(toEditContextLine),
        },
        mutationId: editMutationId,
        uri: editRecording.uri,
      });
      setEditResult(result);
      setEditStatus('ready');
      const isNoOp = result.command.intent === 'no_op';
      Alert.alert(
        isNoOp ? 'Nenhuma alteração identificada' : 'Alteração sugerida',
        isNoOp
          ? NO_OP_EDIT_MESSAGE
          : result.command.ambiguities.length
            ? result.command.ambiguities.join(' ')
            : 'Confira a alteração e toque em aplicar para confirmar.',
      );
    } catch (error) {
      setEditStatus('failed');
      Alert.alert(
        'Não foi possível processar',
        error instanceof Error
          ? error.message
          : 'Verifique a conexão e tente novamente.',
      );
    }
  }

  function applyEditCommand() {
    const command = editResult?.command;
    if (
      !command ||
      (command.intent !== 'update_line' && command.intent !== 'update_client')
    ) {
      Alert.alert(
        'Comando não aplicado',
        'Diga qual serviço, material ou nome de cliente deve ser alterado e tente novamente.',
      );
      return;
    }
    if (command.ambiguities.length > 0) {
      Alert.alert(
        'Preciso de mais detalhes',
        command.ambiguities.join(' ') ||
          'Não foi possível identificar uma única linha com segurança.',
      );
      return;
    }

    try {
      const previous = { clientName, materials, services, source };
      if (command.intent === 'update_client') {
        if (
          command.section !== 'client' ||
          command.index !== null ||
          command.changes.clientName === null ||
          hasLineChange(command)
        ) {
          Alert.alert(
            'Alteração não aplicada',
            'Não foi possível identificar um novo nome de cliente válido.',
          );
          return;
        }
        const nextName = applyQuoteClientNameEdit({
          name: command.changes.clientName,
        });
        setClientName(nextName);
        setLastEditUndo(previous);
        setSource('mixed');
        setEditRecording(null);
        setEditResult(null);
        setEditMutationId(randomUUID());
        setEditStatus('idle');
        Alert.alert(
          'Alteração aplicada',
          'Confira o nome do cliente antes de revisar.',
        );
        return;
      }

      if (
        command.section === null ||
        command.section === 'client' ||
        command.index === null ||
        command.changes.clientName !== null
      ) {
        Alert.alert(
          'Alteração não aplicada',
          'Não foi possível identificar uma linha de serviço ou material.',
        );
        return;
      }

      const result = applyQuoteLineEdit({
        materials: materials.map(toDomainLine),
        services: services.map(toDomainLine),
        command: {
          section: command.section,
          index: command.index,
          changes: {
            ...(command.changes.description !== null
              ? { description: command.changes.description }
              : {}),
            ...(command.changes.quantity !== null
              ? { quantity: command.changes.quantity }
              : {}),
            ...(command.changes.unit !== null
              ? { unit: command.changes.unit }
              : {}),
            ...(command.changes.unitPriceInCents !== null
              ? { unitPriceInCents: command.changes.unitPriceInCents }
              : {}),
          },
        },
      });
      setServices(result.services.map(toEditableLine));
      setMaterials(result.materials.map(toEditableLine));
      setLastEditUndo(previous);
      setSource('mixed');
      setEditRecording(null);
      setEditResult(null);
      setEditMutationId(randomUUID());
      setEditStatus('idle');
      Alert.alert('Alteração aplicada', 'Confira os dados antes de revisar.');
    } catch (error) {
      Alert.alert(
        'Alteração não aplicada',
        error instanceof QuoteDomainError || error instanceof Error
          ? error.message
          : 'Revise o comando e tente novamente.',
      );
    }
  }

  function undoLastEdit() {
    if (!lastEditUndo) return;
    setClientName(lastEditUndo.clientName);
    setServices(lastEditUndo.services);
    setMaterials(lastEditUndo.materials);
    setSource(lastEditUndo.source);
    setLastEditUndo(null);
    Alert.alert('Alteração desfeita', 'O rascunho voltou ao estado anterior.');
  }

  function openManualDetails() {
    setSource('manual');
    setStep('details');
  }

  function resetVoiceCapture() {
    setRecording(null);
    setTranscript(null);
    setEditRecording(null);
    setEditResult(null);
    setEditMutationId(randomUUID());
    setEditStatus('idle');
    setLastEditUndo(null);
    setVoiceMutationId(randomUUID());
    setVoiceStatus('idle');
    setStep('capture');
  }

  function applyInterpretation(interpretation: VoiceInterpretation) {
    setSource('interpretation');
    setLastEditUndo(null);
    setClientName(interpretation.client.name ?? '');
    setClientPhone(interpretation.client.phone ?? '');
    setServices(
      interpretation.services.length
        ? interpretation.services.map(toEditableLine)
        : [emptyLine()],
    );
    setMaterials(interpretation.materials.map(toEditableLine));
    setPaymentMethod(interpretation.conditions.paymentMethod ?? '');
    if (interpretation.conditions.paymentPlanType) {
      setPaymentPlan(interpretation.conditions.paymentPlanType);
    }
    setInstallmentCount(
      interpretation.conditions.installmentCount === null
        ? ''
        : String(interpretation.conditions.installmentCount),
    );
    setExecutionDeadline(interpretation.conditions.executionDeadline ?? '');
    setNotes(interpretation.conditions.notes ?? '');
    setDiscount(
      interpretation.discountInCents === null
        ? ''
        : String(interpretation.discountInCents),
    );
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
        validUntil: validUntil.trim() || null,
      },
      discountInCents: parseBrlInput(discount) ?? 0,
      materials: materials.map(toDomainLine),
      mutationId,
      services: services.map(toDomainLine),
      source,
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
    setSource('manual');
    setInstallmentCount('2');
    setExecutionDeadline('');
    setValidUntil('');
    setNotes('');
    setMutationId(randomUUID());
    setPendingSubmission(null);
    setRecording(null);
    setTranscript(null);
    setEditRecording(null);
    setEditResult(null);
    setEditMutationId(randomUUID());
    setEditStatus('idle');
    setLastEditUndo(null);
    setVoiceMutationId(randomUUID());
    setVoiceStatus('idle');
    setStep('capture');
    setReviewing(false);
  }

  if (reviewing && totals) {
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        {onBackToHome && (
          <Pressable onPress={onBackToHome} style={styles.backLink}>
            <Text style={styles.backLinkText}>
              {editingQuote ? '← Voltar ao orçamento' : '← Início'}
            </Text>
          </Pressable>
        )}
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
          {validUntil !== '' && (
            <ReviewRow label="Validade" value={validUntil} />
          )}
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

  if (step === 'capture') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.screen}
          keyboardShouldPersistTaps="handled"
        >
          {onBackToHome && (
            <Pressable onPress={onBackToHome} style={styles.backLink}>
              <Text style={styles.backLinkText}>
                {editingQuote ? '← Voltar ao orçamento' : '← Início'}
              </Text>
            </Pressable>
          )}
          <Text style={styles.eyebrow}>ETAPA 1 DE 2</Text>
          <Text style={styles.pageTitle}>Grave e confira</Text>
          <Text style={styles.subtitle}>
            Fale os detalhes do orçamento e revise a transcrição antes de
            preencher os dados.
          </Text>
          <VoiceCaptureCard
            onProcess={processRecording}
            onRecordingChange={(next) => {
              setRecording(next);
              setTranscript(null);
              if (next) {
                setVoiceMutationId(randomUUID());
              } else {
                setVoiceStatus('idle');
              }
            }}
            processing={voiceStatus === 'processing'}
            recording={recording}
          />
          {recording && (
            <Text
              style={
                voiceStatus === 'failed'
                  ? styles.persistenceError
                  : styles.recordingStatus
              }
            >
              {voiceStatus === 'processing'
                ? 'Enviando e transcrevendo o áudio…'
                : voiceStatus === 'ready'
                  ? 'Transcrição recebida. Confira o texto abaixo.'
                  : voiceStatus === 'failed'
                    ? 'O processamento falhou. Você pode tentar novamente.'
                    : 'Áudio capturado. Toque em Processar áudio para gerar a transcrição.'}
            </Text>
          )}
          {recording && transcript && voiceStatus === 'ready' && (
            <View style={styles.transcriptCard}>
              <Text style={styles.transcriptEyebrow}>TRANSCRIÇÃO</Text>
              <Text style={styles.transcriptTitle}>
                Confira o que entendemos
              </Text>
              <Text selectable style={styles.transcriptText}>
                {transcript}
              </Text>
              <Text style={styles.transcriptHint}>
                Se o texto estiver correto, avance para revisar os dados do
                orçamento.
              </Text>
              <Pressable
                onPress={() => setStep('details')}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>
                  Continuar para os dados
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable
            disabled={voiceStatus === 'processing'}
            onPress={openManualDetails}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>
              Preencher manualmente
            </Text>
          </Pressable>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
        {onBackToHome && (
          <Pressable onPress={onBackToHome} style={styles.backLink}>
            <Text style={styles.backLinkText}>
              {editingQuote ? '← Voltar ao orçamento' : '← Início'}
            </Text>
          </Pressable>
        )}
        <Text style={styles.eyebrow}>ETAPA 2 DE 2</Text>
        <Text style={styles.pageTitle}>Confira os dados</Text>
        <Text style={styles.subtitle}>
          Revise e complete as informações antes de salvar o orçamento.
        </Text>
        {editingQuote && (
          <Text style={styles.editingNotice}>
            Você está editando a revisão {editingQuote.revisionNumber}. Ao
            salvar, uma nova revisão será criada e a anterior ficará preservada.
          </Text>
        )}
        {!transcript && (
          <View style={styles.voiceRestartCard}>
            <Text style={styles.voiceRestartTitle}>
              Quer gravar uma nova descrição?
            </Text>
            <Text style={styles.commandHint}>
              Use esta opção para descrever o orçamento inteiro novamente.
              Depois do processamento, confira a transcrição antes de continuar
              para os dados.
            </Text>
            <Pressable
              onPress={resetVoiceCapture}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>
                Gravar nova descrição completa
              </Text>
            </Pressable>
          </View>
        )}
        {transcript && (
          <View style={styles.transcriptSummary}>
            <Text style={styles.transcriptEyebrow}>TRANSCRIÇÃO CONFERIDA</Text>
            <Text numberOfLines={5} style={styles.transcriptText}>
              {transcript}
            </Text>
            <Pressable
              onPress={resetVoiceCapture}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Gravar outro áudio</Text>
            </Pressable>
          </View>
        )}
        {!editingQuote && (
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
        )}
        <Section title="Ajuste por voz">
          <Text style={styles.commandHint}>
            Use este bloco somente para corrigir um dado específico depois de
            revisar o orçamento, como “altere o primeiro serviço para 3
            unidades” ou “altere o nome do cliente para Roberto Pedro Pereira”.
          </Text>
          <VoiceCaptureCard
            mode="edit"
            onProcess={processEditRecording}
            onRecordingChange={(next) => {
              setEditRecording(next);
              setEditResult(null);
              if (next) {
                setEditMutationId(randomUUID());
              } else {
                setEditStatus('idle');
              }
            }}
            processing={editStatus === 'processing'}
            recording={editRecording}
          />
          {editRecording && (
            <Text
              style={
                editStatus === 'failed'
                  ? styles.persistenceError
                  : styles.recordingStatus
              }
            >
              {editStatus === 'processing'
                ? 'Enviando o comando…'
                : editStatus === 'ready'
                  ? editResult?.command.intent === 'no_op'
                    ? `${NO_OP_EDIT_MESSAGE} Grave um ajuste específico ou use a opção de nova descrição acima.`
                    : 'Comando recebido. Confira a sugestão abaixo.'
                  : editStatus === 'failed'
                    ? 'O processamento falhou. Você pode tentar novamente.'
                    : 'Áudio capturado. Toque em Processar áudio.'}
            </Text>
          )}
          {editResult && editStatus === 'ready' && (
            <View style={styles.editPreviewCard}>
              <Text style={styles.transcriptEyebrow}>
                {editResult.command.intent === 'no_op'
                  ? 'AJUSTE NÃO IDENTIFICADO'
                  : 'COMANDO IDENTIFICADO'}
              </Text>
              <Text selectable style={styles.transcriptText}>
                {editResult.transcript}
              </Text>
              <Text style={styles.editPreviewText}>
                {describeEditCommand(
                  editResult,
                  clientName,
                  services,
                  materials,
                )}
              </Text>
              {editResult.command.ambiguities.length > 0 &&
                editResult.command.intent !== 'no_op' && (
                  <Text style={styles.persistenceError}>
                    {editResult.command.ambiguities.join(' ')}
                  </Text>
                )}
              <Pressable
                disabled={!isApplicableEditCommand(editResult.command)}
                onPress={applyEditCommand}
                style={[
                  styles.primaryButton,
                  !isApplicableEditCommand(editResult.command) &&
                    styles.disabledButton,
                ]}
              >
                <Text style={styles.primaryButtonText}>Aplicar alteração</Text>
              </Pressable>
            </View>
          )}
          {lastEditUndo && (
            <View style={styles.undoCard}>
              <Text style={styles.undoText}>
                A última alteração foi aplicada ao rascunho.
              </Text>
              <Pressable onPress={undoLastEdit} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>
                  Desfazer última alteração
                </Text>
              </Pressable>
            </View>
          )}
        </Section>
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
          onChange={(next) => {
            setServices(next);
            setLastEditUndo(null);
          }}
          title="Serviços"
        />
        <LineSection
          kind="material"
          limit={10}
          lines={materials}
          onChange={(next) => {
            setMaterials(next);
            setLastEditUndo(null);
          }}
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
          <Field label="Validade da proposta">
            <TextInput
              autoCapitalize="none"
              onChangeText={setValidUntil}
              placeholder="AAAA-MM-DD"
              placeholderTextColor="#829087"
              style={styles.input}
              value={validUntil}
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

function toEditContextLine(line: EditableQuoteLine) {
  return {
    description: line.description.trim(),
    quantity: line.quantity,
    unit: line.unit.trim(),
    unitPriceInCents: parseBrlInput(line.unitPrice),
  };
}

function toEditableLine(line: VoiceInterpretation['services'][number]) {
  return {
    description: line.description,
    quantity: line.quantity ?? '',
    unit: line.unit ?? '',
    unitPrice:
      line.unitPriceInCents === null ? '' : String(line.unitPriceInCents),
  };
}

function paymentPlanLabel(plan: PaymentPlan, count: string): string {
  if (plan === 'integral') return 'Pagamento integral';
  if (plan === 'partial') return 'Pagamentos parciais';
  return `${count} parcelas`;
}

function describeEditCommand(
  result: VoiceQuoteEditInterpretation,
  clientName: string,
  services: readonly EditableQuoteLine[],
  materials: readonly EditableQuoteLine[],
): string {
  const { command } = result;
  if (
    command.intent === 'update_client' &&
    command.section === 'client' &&
    command.index === null &&
    command.changes.clientName !== null
  ) {
    return `Nome do cliente: “${clientName || 'não informado'}” para “${command.changes.clientName}”.`;
  }
  if (
    command.intent !== 'update_line' ||
    command.section === null ||
    command.index === null
  ) {
    return 'Não identificamos uma alteração única para aplicar.';
  }

  const lines = command.section === 'services' ? services : materials;
  const current = lines[command.index];
  const label = command.section === 'services' ? 'Serviço' : 'Material';
  const change =
    command.changes.quantity !== null
      ? `quantidade de ${current?.quantity || '—'} para ${command.changes.quantity}`
      : command.changes.description !== null
        ? `descrição para “${command.changes.description}”`
        : command.changes.unit !== null
          ? `unidade para “${command.changes.unit}”`
          : command.changes.unitPriceInCents !== null
            ? `preço para ${formatBrl(command.changes.unitPriceInCents)}`
            : 'sem alteração identificada';
  return `${label} ${command.index + 1}: ${change}.`;
}

function isApplicableEditCommand(
  command: VoiceQuoteEditInterpretation['command'],
): boolean {
  if (command.ambiguities.length > 0) return false;
  if (command.intent === 'update_client') {
    return (
      command.section === 'client' &&
      command.index === null &&
      command.changes.clientName !== null &&
      !hasLineChange(command)
    );
  }
  if (
    command.intent !== 'update_line' ||
    (command.section !== 'services' && command.section !== 'materials') ||
    command.index === null ||
    command.changes.clientName !== null
  ) {
    return false;
  }
  return hasLineChange(command);
}

function hasLineChange(
  command: VoiceQuoteEditInterpretation['command'],
): boolean {
  return [
    command.changes.description,
    command.changes.quantity,
    command.changes.unit,
    command.changes.unitPriceInCents,
  ].some((value) => value !== null);
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
  backLink: { alignSelf: 'flex-start', paddingVertical: 2 },
  backLinkText: { color: '#147553', fontSize: 14, fontWeight: '800' },
  divider: { backgroundColor: '#CAD9D0', height: 1, marginVertical: 6 },
  commandHint: { color: '#5A7064', fontSize: 14, lineHeight: 21 },
  disabledButton: { opacity: 0.45 },
  editPreviewCard: {
    backgroundColor: '#F4F7F2',
    borderColor: '#CBD8D0',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 15,
  },
  editPreviewText: { color: '#19372A', fontSize: 16, fontWeight: '700' },
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
  editingNotice: {
    backgroundColor: '#E4F0E9',
    borderRadius: 12,
    color: '#315D49',
    fontSize: 13,
    lineHeight: 19,
    padding: 12,
  },
  transcriptCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD8D0',
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  transcriptEyebrow: {
    color: '#16875D',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  transcriptHint: { color: '#5A7064', fontSize: 13, lineHeight: 19 },
  transcriptSummary: {
    backgroundColor: '#E4F0E9',
    borderRadius: 16,
    gap: 9,
    padding: 15,
  },
  transcriptText: { color: '#19372A', fontSize: 16, lineHeight: 24 },
  transcriptTitle: { color: '#19372A', fontSize: 19, fontWeight: '800' },
  voiceRestartCard: {
    backgroundColor: '#E4F0E9',
    borderRadius: 16,
    gap: 10,
    padding: 15,
  },
  voiceRestartTitle: { color: '#19372A', fontSize: 16, fontWeight: '800' },
  undoCard: {
    backgroundColor: '#FFF8E8',
    borderColor: '#E4C982',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  undoText: { color: '#6A5420', fontSize: 14, lineHeight: 20 },
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
