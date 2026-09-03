import Storage from 'expo-sqlite/kv-store';
import {
  parseLocalQuoteDraft,
  type LocalQuoteDraft,
} from './quote-draft-state';

const ACTIVE_DRAFT_KEY = 'cotali.quote-draft.active.v1';

export async function loadLocalQuoteDraft(): Promise<LocalQuoteDraft | null> {
  const value = await Storage.getItem(ACTIVE_DRAFT_KEY);
  return value ? parseLocalQuoteDraft(value) : null;
}

export async function saveLocalQuoteDraft(
  draft: LocalQuoteDraft,
): Promise<void> {
  await Storage.setItem(ACTIVE_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearLocalQuoteDraft(): Promise<void> {
  await Storage.removeItem(ACTIVE_DRAFT_KEY);
}
