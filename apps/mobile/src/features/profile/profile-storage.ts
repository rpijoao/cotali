import Storage from 'expo-sqlite/kv-store';
import {
  parseLocalProfessionalProfile,
  type LocalProfessionalProfile,
} from './profile-state';

const PROFILE_KEY = 'cotali.professional-profile.v1';

export async function loadProfessionalProfile(): Promise<LocalProfessionalProfile | null> {
  const value = await Storage.getItem(PROFILE_KEY);
  return value ? parseLocalProfessionalProfile(value) : null;
}

export async function saveProfessionalProfile(
  profile: LocalProfessionalProfile,
): Promise<void> {
  await Storage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
