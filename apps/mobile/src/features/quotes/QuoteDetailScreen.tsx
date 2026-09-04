import type { QuoteDetails, QuoteLineInput } from '@cotali/contracts';
import { calculateLineTotalInCents } from '@cotali/domain';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getQuoteDetails } from './quote-api';
import { formatBrl } from './money';

export function QuoteDetailScreen({
  onBack,
  quoteId,
}: Readonly<{
  onBack: () => void;
  quoteId: string;
}>) {
  const [quote, setQuote] = useState<QuoteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setQuote(await getQuoteDetails(quoteId));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar o orçamento.',
      );
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    void loadQuote();
  }, [loadQuote]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#1846E1" size="large" />
        <Text style={styles.loadingText}>Carregando orçamento…</Text>
      </View>
    );
  }

  if (!quote) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Não foi possível abrir</Text>
        <Text style={styles.errorText}>
          {error ?? 'O orçamento não foi encontrado.'}
        </Text>
        <Pressable onPress={loadQuote} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.backLink}>
          <Text style={styles.backLinkText}>← Voltar para início</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <Pressable onPress={onBack} style={styles.backLink}>
        <Text style={styles.backLinkText}>← Voltar para início</Text>
      </Pressable>
      <Text style={styles.eyebrow}>DETALHES DO ORÇAMENTO</Text>
      <View style={styles.titleRow}>
        <View style={styles.titleCopy}>
          <Text style={styles.pageTitle}>{quote.client.name}</Text>
          <Text style={styles.subtitle}>
            {quote.client.phone || 'WhatsApp não informado'}
          </Text>
        </View>
        <StatusBadge status={quote.status} />
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total do orçamento</Text>
        <Text style={styles.totalValue}>
          {formatBrl(quote.totals.totalInCents)}
        </Text>
        <Text style={styles.totalMeta}>
          Criado em {formatDate(quote.createdAt)} · revisão{' '}
          {quote.revisionNumber}
        </Text>
      </View>

      <LineSection lines={quote.services} title="Serviços" />
      {quote.materials.length > 0 && (
        <LineSection lines={quote.materials} title="Materiais" />
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Condições</Text>
        <DetailRow
          label="Pagamento"
          value={quote.conditions.paymentMethod || 'Não informado'}
        />
        <DetailRow
          label="Plano"
          value={paymentPlanLabel(
            quote.conditions.paymentPlanType,
            quote.conditions.installmentCount,
          )}
        />
        <DetailRow
          label="Execução"
          value={quote.conditions.executionDeadline || 'Não informado'}
        />
        {quote.conditions.validUntil && (
          <DetailRow
            label="Validade"
            value={formatDate(quote.conditions.validUntil)}
          />
        )}
        {quote.conditions.notes && (
          <Text style={styles.notes}>{quote.conditions.notes}</Text>
        )}
      </View>

      <View style={styles.breakdownCard}>
        <DetailRow
          label="Serviços"
          value={formatBrl(quote.totals.servicesInCents)}
        />
        <DetailRow
          label="Materiais"
          value={formatBrl(quote.totals.materialsInCents)}
        />
        <DetailRow
          label="Desconto"
          value={`− ${formatBrl(quote.totals.discountInCents)}`}
        />
        <View style={styles.divider} />
        <DetailRow
          emphasized
          label="Total"
          value={formatBrl(quote.totals.totalInCents)}
        />
      </View>
    </ScrollView>
  );
}

function LineSection({
  lines,
  title,
}: Readonly<{ lines: QuoteLineInput[]; title: string }>) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((line, index) => (
        <View key={`${title}-${index}`} style={styles.lineRow}>
          <View style={styles.lineCopy}>
            <Text style={styles.lineDescription}>{line.description}</Text>
            <Text style={styles.lineQuantity}>
              {line.quantity} {line.unit || 'un.'}
            </Text>
          </View>
          <Text style={styles.linePrice}>
            {calculateLineTotalInCents(line) === null
              ? 'A confirmar'
              : formatBrl(calculateLineTotalInCents(line) ?? 0)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function DetailRow({
  emphasized = false,
  label,
  value,
}: Readonly<{ emphasized?: boolean; label: string; value: string }>) {
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, emphasized && styles.emphasized]}>
        {label}
      </Text>
      <Text style={[styles.detailValue, emphasized && styles.emphasized]}>
        {value}
      </Text>
    </View>
  );
}

function StatusBadge({ status }: Readonly<{ status: QuoteDetails['status'] }>) {
  return (
    <View style={styles.statusBadge}>
      <Text style={styles.statusText}>{statusLabel(status)}</Text>
    </View>
  );
}

function statusLabel(status: QuoteDetails['status']): string {
  return status === 'shared'
    ? 'Compartilhado'
    : status === 'ready_to_share'
      ? 'Pronto para enviar'
      : 'Rascunho';
}

function paymentPlanLabel(
  plan: QuoteDetails['conditions']['paymentPlanType'],
  count: number | null,
): string {
  if (plan === 'installments') return `${count ?? 0} parcelas`;
  return plan === 'partial' ? 'Pagamento parcial' : 'Pagamento integral';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F4F7F3',
    flexGrow: 1,
    padding: 24,
    paddingBottom: 48,
  },
  centered: {
    alignItems: 'center',
    backgroundColor: '#F4F7F3',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { color: '#52635B', fontSize: 15, marginTop: 14 },
  errorTitle: { color: '#293D35', fontSize: 21, fontWeight: '800' },
  errorText: {
    color: '#6F7E76',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1846E1',
    borderRadius: 14,
    marginTop: 22,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  backLink: { alignSelf: 'flex-start', marginBottom: 20 },
  backLinkText: { color: '#1846E1', fontSize: 14, fontWeight: '700' },
  eyebrow: {
    color: '#648075',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', marginTop: 8 },
  titleCopy: { flex: 1, marginRight: 12 },
  pageTitle: {
    color: '#293D35',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: { color: '#6F7E76', fontSize: 15, marginTop: 4 },
  statusBadge: {
    backgroundColor: '#DCE6FF',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: { color: '#1846E1', fontSize: 11, fontWeight: '800' },
  totalCard: {
    backgroundColor: '#1846E1',
    borderRadius: 22,
    marginTop: 22,
    padding: 20,
  },
  totalLabel: { color: '#BFD0FF', fontSize: 13, fontWeight: '700' },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 5,
  },
  totalMeta: { color: '#E9EEFF', fontSize: 13, marginTop: 8 },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E8E2',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  sectionTitle: {
    color: '#293D35',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 13,
  },
  lineRow: {
    alignItems: 'center',
    borderTopColor: '#EDF1EE',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  lineCopy: { flex: 1, marginRight: 12 },
  lineDescription: { color: '#35483F', fontSize: 15, fontWeight: '700' },
  lineQuantity: { color: '#7B8981', fontSize: 13, marginTop: 4 },
  linePrice: { color: '#293D35', fontSize: 14, fontWeight: '700' },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  detailLabel: { color: '#74837B', flex: 1, fontSize: 14 },
  detailValue: { color: '#35483F', flex: 1, fontSize: 14, textAlign: 'right' },
  emphasized: { color: '#1846E1', fontWeight: '800' },
  notes: {
    borderTopColor: '#EDF1EE',
    borderTopWidth: 1,
    color: '#52635B',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    paddingTop: 12,
  },
  breakdownCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E8E2',
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  divider: { backgroundColor: '#E0E8E2', height: 1, marginVertical: 8 },
});
