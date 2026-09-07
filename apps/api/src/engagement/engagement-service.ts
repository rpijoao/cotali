import type { PrismaClient } from '@cotali/database';

export type ValueEventName = 'quote_created' | 'quote_updated' | 'quote_shared';
export type ConsentChannel = 'web' | 'mobile';

export interface EngagementService {
  recordValueEvent(input: {
    authSubject: string;
    eventKey: string;
    name: ValueEventName;
    metadata?: { quoteId?: string; source?: string };
  }): Promise<void>;
  recordMarketingConsent(input: {
    authSubject: string;
    channel: ConsentChannel;
    granted: boolean;
    policyVersion: string;
  }): Promise<void>;
}

export class PrismaEngagementService implements EngagementService {
  constructor(private readonly prisma: PrismaClient) {}

  async recordValueEvent(input: {
    authSubject: string;
    eventKey: string;
    name: ValueEventName;
    metadata?: { quoteId?: string; source?: string };
  }): Promise<void> {
    const account = await this.prisma.account.upsert({
      where: { authSubject: input.authSubject },
      create: { authSubject: input.authSubject },
      update: {},
      select: { id: true },
    });
    await this.prisma.valueEvent.upsert({
      where: {
        accountId_eventKey: {
          accountId: account.id,
          eventKey: input.eventKey,
        },
      },
      create: {
        accountId: account.id,
        eventKey: input.eventKey,
        name: valueEventNames[input.name],
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
      update: {},
    });
  }

  async recordMarketingConsent(input: {
    authSubject: string;
    channel: ConsentChannel;
    granted: boolean;
    policyVersion: string;
  }): Promise<void> {
    const account = await this.prisma.account.upsert({
      where: { authSubject: input.authSubject },
      create: { authSubject: input.authSubject },
      update: {},
      select: { id: true },
    });
    await this.prisma.consentRecord.create({
      data: {
        accountId: account.id,
        channel: consentChannels[input.channel],
        granted: input.granted,
        policyVersion: input.policyVersion,
        purpose: 'MARKETING_EMAIL',
      },
    });
  }
}

const valueEventNames = {
  quote_created: 'QUOTE_CREATED',
  quote_shared: 'QUOTE_SHARED',
  quote_updated: 'QUOTE_UPDATED',
} as const;

const consentChannels = {
  mobile: 'MOBILE',
  web: 'WEB',
} as const;
