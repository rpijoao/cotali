import type {
  ProfessionalProfile,
  UpdateProfessionalProfile,
} from '@cotali/contracts';
import type { PrismaClient } from '@cotali/database';
import type { ProfileRepository } from './profile-service.js';

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async get(authSubject: string): Promise<ProfessionalProfile> {
    const account = await this.prisma.account.findUnique({
      select: profileSelect,
      where: { authSubject },
    });
    return account ? toProfile(account) : emptyProfile();
  }

  async update(
    authSubject: string,
    input: UpdateProfessionalProfile,
  ): Promise<ProfessionalProfile> {
    const account = await this.prisma.account.upsert({
      create: {
        address: input.address,
        authSubject,
        businessName: input.businessName,
        document: input.document,
        phone: input.phone,
        professionalName: input.name,
      },
      update: {
        address: input.address,
        businessName: input.businessName,
        document: input.document,
        phone: input.phone,
        professionalName: input.name,
      },
      select: profileSelect,
      where: { authSubject },
    });
    return toProfile(account);
  }
}

const profileSelect = {
  address: true,
  businessName: true,
  document: true,
  phone: true,
  professionalName: true,
  updatedAt: true,
} as const;

function toProfile(account: {
  address: string | null;
  businessName: string | null;
  document: string | null;
  phone: string | null;
  professionalName: string | null;
  updatedAt: Date;
}): ProfessionalProfile {
  return {
    address: account.address,
    businessName: account.businessName,
    document: account.document,
    name: account.professionalName ?? '',
    phone: account.phone,
    updatedAt: account.updatedAt.toISOString(),
  };
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
