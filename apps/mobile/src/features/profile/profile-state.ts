export type LocalProfessionalProfile = Readonly<{
  address: string;
  businessName: string;
  document: string;
  name: string;
  phone: string;
  version: 1;
}>;

export const EMPTY_PROFESSIONAL_PROFILE: LocalProfessionalProfile = {
  address: '',
  businessName: '',
  document: '',
  name: '',
  phone: '',
  version: 1,
};

export function hasProfessionalProfileContent(
  profile: LocalProfessionalProfile,
): boolean {
  return Object.values(profile).some(
    (value) => typeof value === 'string' && value.trim() !== '',
  );
}

export function parseLocalProfessionalProfile(
  value: string,
): LocalProfessionalProfile | null {
  try {
    const candidate: unknown = JSON.parse(value);
    if (!isRecord(candidate) || candidate.version !== 1) return null;

    const stringFields = [
      'address',
      'businessName',
      'document',
      'name',
      'phone',
    ] as const;
    if (stringFields.some((field) => typeof candidate[field] !== 'string')) {
      return null;
    }

    return candidate as LocalProfessionalProfile;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
