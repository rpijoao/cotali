import type { QuoteSummary } from '@cotali/contracts';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { listQuoteSummaries } from '../quotes/quote-api';
import {
  hasLocalQuoteDraftContent,
  type LocalQuoteDraft,
} from '../quotes/quote-draft-state';
import { loadLocalQuoteDraft } from '../quotes/quote-draft-storage';
import { formatBrl } from '../quotes/money';

export function HomeScreen({
  onContinueDraft,
  onCreateQuote,
}: Readonly<{
  onContinueDraft: () => void;
  onCreateQuote: () => void;
}>) {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [localDraft, setLocalDraft] = useState<LocalQuoteDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(async () => {
    setError(null);
    const [draftResult, quotesResult] = await Promise.allSettled([
      loadLocalQuoteDraft(),
      listQuoteSummaries(),
    ]);

    if (draftResult.status === 'fulfilled') {
      setLocalDraft(
        draftResult.value && hasLocalQuoteDraftContent(draftResult.value)
          ? draftResult.value
          : null,
      );
    }
    if (quotesResult.status === 'fulfilled') {
      setQuotes(quotesResult.value);
    } else {
      setError('Não foi possível atualizar os orçamentos agora.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  async function refresh() {
    setRefreshing(true);
    await loadHome();
    setRefreshing(false);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl onRefresh={refresh} refreshing={refreshing} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>cotali</Text>
            <Text style={styles.greeting}>Bom trabalho hoje.</Text>
          </View>
          <View style={styles.profileDot}>
            <Text style={styles.profileInitial}>C</Text>
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>NOVO ORÇAMENTO</Text>
            <Text style={styles.heroTitle}>
              Transforme sua ideia em proposta.
            </Text>
            <Text style={styles.heroSubtitle}>
              Grave os detalhes ou preencha tudo manualmente.
            </Text>
          </View>
          <Pressable onPress={onCreateQuote} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Novo orçamento</Text>
          </Pressable>
        </View>

        {localDraft && (
          <Pressable onPress={onContinueDraft} style={styles.draftCard}>
            <View style={styles.cardHeading}>
              <Text style={styles.cardEyebrow}>RASCUNHO NO APARELHO</Text>
              <Text style={styles.cardArrow}>›</Text>
            </View>
            <Text style={styles.draftTitle}>
              {localDraft.clientName || 'Orçamento sem cliente'}
            </Text>
            <Text style={styles.draftSubtitle}>
              Continue de onde parou. O rascunho fica salvo neste aparelho.
            </Text>
          </Pressable>
        )}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Orçamentos recentes</Text>
          {quotes.length > 0 && (
            <Text style={styles.sectionCount}>{quotes.length}</Text>
          )}
        </View>

        {error && (
          <View style={styles.noticeCard}>
            <Text style={styles.noticeText}>{error}</Text>
            <Pressable onPress={refresh}>
              <Text style={styles.noticeAction}>Tentar novamente</Text>
            </Pressable>
          </View>
        )}

        {!loading && quotes.length === 0 && !error && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Nenhum orçamento salvo ainda</Text>
            <Text style={styles.emptyText}>
              Seus próximos orçamentos aparecerão aqui depois da confirmação.
            </Text>
          </View>
        )}

        {quotes.map((quote) => (
          <QuoteSummaryCard key={quote.id} quote={quote} />
        ))}
      </ScrollView>
    </View>
  );
}

function QuoteSummaryCard({ quote }: Readonly<{ quote: QuoteSummary }>) {
  return (
    <View style={styles.quoteCard}>
      <View style={styles.cardHeading}>
        <Text style={styles.quoteClient} numberOfLines={1}>
          {quote.client.name}
        </Text>
        <Text style={styles.quoteStatus}>{statusLabel(quote.status)}</Text>
      </View>
      <View style={styles.quoteFooter}>
        <Text style={styles.quoteDate}>{formatDate(quote.createdAt)}</Text>
        <Text style={styles.quoteTotal}>{formatBrl(quote.totalInCents)}</Text>
      </View>
    </View>
  );
}

function statusLabel(status: QuoteSummary['status']): string {
  return status === 'shared'
    ? 'Compartilhado'
    : status === 'ready_to_share'
      ? 'Pronto para enviar'
      : 'Rascunho';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Data não informada';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#F4F7F3', flex: 1 },
  content: { padding: 24, paddingBottom: 48 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingTop: 12,
  },
  brand: {
    color: '#1846E1',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -1,
  },
  greeting: { color: '#52635B', fontSize: 15, marginTop: 4 },
  profileDot: {
    alignItems: 'center',
    backgroundColor: '#DCE6FF',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  profileInitial: { color: '#1846E1', fontSize: 17, fontWeight: '800' },
  heroCard: {
    backgroundColor: '#1846E1',
    borderRadius: 24,
    marginBottom: 18,
    padding: 22,
  },
  heroCopy: { marginBottom: 18 },
  heroEyebrow: {
    color: '#BFD0FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
    marginTop: 8,
  },
  heroSubtitle: {
    color: '#E9EEFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  heroButtonText: { color: '#1846E1', fontSize: 15, fontWeight: '800' },
  draftCard: {
    backgroundColor: '#FFF8DF',
    borderColor: '#EAD58A',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 28,
    padding: 18,
  },
  cardHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardEyebrow: {
    color: '#8A7021',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  cardArrow: {
    color: '#8A7021',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 24,
  },
  draftTitle: {
    color: '#293D35',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 9,
  },
  draftSubtitle: {
    color: '#6A642F',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 5,
  },
  sectionHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: { color: '#293D35', fontSize: 20, fontWeight: '800' },
  sectionCount: {
    alignItems: 'center',
    backgroundColor: '#DCE6FF',
    borderRadius: 12,
    color: '#1846E1',
    fontSize: 12,
    fontWeight: '800',
    minWidth: 24,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 4,
    textAlign: 'center',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E8E2',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  emptyTitle: { color: '#293D35', fontSize: 16, fontWeight: '800' },
  emptyText: { color: '#6F7E76', fontSize: 14, lineHeight: 20, marginTop: 6 },
  noticeCard: {
    backgroundColor: '#FFF1F0',
    borderColor: '#F1C5C1',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  noticeText: { color: '#8E3832', fontSize: 14, lineHeight: 20 },
  noticeAction: {
    color: '#1846E1',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E0E8E2',
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
    padding: 18,
  },
  quoteClient: {
    color: '#293D35',
    flex: 1,
    fontSize: 17,
    fontWeight: '800',
    marginRight: 12,
  },
  quoteStatus: { color: '#5C7367', fontSize: 12, fontWeight: '700' },
  quoteFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  quoteDate: { color: '#7B8981', fontSize: 13 },
  quoteTotal: { color: '#1846E1', fontSize: 17, fontWeight: '800' },
});
