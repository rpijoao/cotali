import type {
  ProfessionalProfile,
  UpdateProfessionalProfile,
} from '@cotali/contracts';
import type { LocalProfessionalProfile } from './profile-state';
import {
  loadProfessionalProfile,
  saveProfessionalProfile,
} from './profile-storage';
import { authenticatedFetch } from '../../auth/api-client';

export async function getProfessionalProfile(): Promise<ProfessionalProfile> {
  const response = await request('/v1/profile', { method: 'GET' });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(readApiMessage(body));
  if (!isProfessionalProfile(body)) {
    throw new Error('A API retornou um perfil inválido.');
  }
  return body;
}

export async function loadProfessionalProfileWithCache(): Promise<{
  profile: LocalProfessionalProfile | null;
  source: 'cache' | 'remote';
}> {
  try {
    const remoteProfile = toLocalProfessionalProfile(
      await getProfessionalProfile(),
    );
    await saveProfessionalProfile(remoteProfile);
    return {
      profile: hasProfileContent(remoteProfile) ? remoteProfile : null,
      source: 'remote',
    };
  } catch (remoteError) {
    const cachedProfile = await loadProfessionalProfile();
    if (cachedProfile) {
      return { profile: cachedProfile, source: 'cache' };
    }
    throw remoteError;
  }
}

export async function updateProfessionalProfile(
  profile: LocalProfessionalProfile,
): Promise<ProfessionalProfile> {
  const response = await request('/v1/profile', {
    body: JSON.stringify(toUpdateInput(profile)),
    headers: { 'content-type': 'application/json' },
    method: 'PATCH',
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(readApiMessage(body));
  if (!isProfessionalProfile(body)) {
    throw new Error('A API retornou um perfil inválido.');
  }
  return body;
}

export function toLocalProfessionalProfile(
  profile: ProfessionalProfile,
): LocalProfessionalProfile {
  return {
    address: profile.address ?? '',
    businessName: profile.businessName ?? '',
    document: profile.document ?? '',
    name: profile.name,
    phone: profile.phone ?? '',
    version: 1,
  };
}

function request(path: string, init: RequestInit): Promise<Response> {
  return authenticatedFetch(path, init);
}

function toUpdateInput(
  profile: LocalProfessionalProfile,
): UpdateProfessionalProfile {
  return {
    address: optionalText(profile.address),
    businessName: optionalText(profile.businessName),
    document: optionalText(profile.document),
    name: profile.name,
    phone: optionalText(profile.phone),
  };
}

function optionalText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

function hasProfileContent(profile: LocalProfessionalProfile): boolean {
  return Object.values(profile).some(
    (value) => typeof value === 'string' && value.trim() !== '',
  );
}

function isProfessionalProfile(value: unknown): value is ProfessionalProfile {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    isNullableString(value.address) &&
    isNullableString(value.businessName) &&
    isNullableString(value.document) &&
    isNullableString(value.phone) &&
    isNullableString(value.updatedAt)
  );
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readApiMessage(body: unknown): string {
  if (
    isRecord(body) &&
    isRecord(body.error) &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message;
  }
  return 'Não foi possível sincronizar o perfil.';
}
