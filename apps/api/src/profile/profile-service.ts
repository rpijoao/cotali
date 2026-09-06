import type {
  ProfessionalProfile,
  UpdateProfessionalProfile,
} from '@cotali/contracts';

export interface ProfileRepository {
  get(authSubject: string): Promise<ProfessionalProfile>;
  update(
    authSubject: string,
    input: UpdateProfessionalProfile,
  ): Promise<ProfessionalProfile>;
}

export class MemoryProfileRepository implements ProfileRepository {
  readonly #profiles = new Map<string, ProfessionalProfile>();

  async get(authSubject: string): Promise<ProfessionalProfile> {
    return this.#profiles.get(authSubject) ?? emptyProfile();
  }

  async update(
    authSubject: string,
    input: UpdateProfessionalProfile,
  ): Promise<ProfessionalProfile> {
    const profile: ProfessionalProfile = {
      address: input.address,
      businessName: input.businessName,
      document: input.document,
      name: input.name,
      phone: input.phone,
      updatedAt: new Date().toISOString(),
    };
    this.#profiles.set(authSubject, profile);
    return profile;
  }
}

export class ProfileService {
  constructor(
    private readonly repository: ProfileRepository = new MemoryProfileRepository(),
  ) {}

  async get(authSubject: string): Promise<ProfessionalProfile> {
    return await this.repository.get(authSubject);
  }

  async update(
    authSubject: string,
    input: UpdateProfessionalProfile,
  ): Promise<ProfessionalProfile> {
    return await this.repository.update(authSubject, normalizeProfile(input));
  }
}

function normalizeProfile(
  input: UpdateProfessionalProfile,
): UpdateProfessionalProfile {
  return {
    address: normalizeOptional(input.address),
    businessName: normalizeOptional(input.businessName),
    document: normalizeOptional(input.document),
    name: input.name.trim(),
    phone: normalizeOptional(input.phone),
  };
}

function normalizeOptional(value: string | null): string | null {
  const normalized = value?.trim() ?? '';
  return normalized || null;
}

function emptyProfile(): ProfessionalProfile {
  return {
    address: null,
    businessName: null,
    document: null,
    name: '',
    phone: null,
    updatedAt: null,
  };
}
