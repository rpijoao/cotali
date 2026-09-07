import type { PrismaClient } from '@cotali/database';

export type SecurityAuditEventName =
  | 'auth_request'
  | 'otp_request'
  | 'otp_verify'
  | 'social_sign_in'
  | 'oauth_callback'
  | 'session_read'
  | 'session_sign_out'
  | 'identity_link'
  | 'rate_limited';

export type SecurityAuditOutcome = 'success' | 'failure';

export type SecurityAuditMetadata = Readonly<{
  provider?: 'google' | 'apple';
}>;

export interface SecurityAuditService {
  record(input: {
    name: SecurityAuditEventName;
    outcome: SecurityAuditOutcome;
    requestId?: string;
    authSubject?: string;
    method: string;
    path: string;
    statusCode: number;
    metadata?: SecurityAuditMetadata;
  }): Promise<void>;
}

export class PrismaSecurityAuditService implements SecurityAuditService {
  constructor(private readonly prisma: PrismaClient) {}

  async record(input: {
    name: SecurityAuditEventName;
    outcome: SecurityAuditOutcome;
    requestId?: string;
    authSubject?: string;
    method: string;
    path: string;
    statusCode: number;
    metadata?: SecurityAuditMetadata;
  }): Promise<void> {
    await this.prisma.securityAuditEvent.create({
      data: {
        name: securityAuditEventNames[input.name],
        outcome: securityAuditOutcomes[input.outcome],
        ...(input.requestId
          ? { requestId: input.requestId.slice(0, 120) }
          : {}),
        ...(input.authSubject
          ? { authSubject: input.authSubject.slice(0, 120) }
          : {}),
        method: input.method.slice(0, 10),
        path: input.path.slice(0, 160),
        statusCode: input.statusCode,
        ...(input.metadata ? { metadata: input.metadata } : {}),
      },
    });
  }
}

const securityAuditEventNames = {
  auth_request: 'AUTH_REQUEST',
  otp_request: 'OTP_REQUEST',
  otp_verify: 'OTP_VERIFY',
  social_sign_in: 'SOCIAL_SIGN_IN',
  oauth_callback: 'OAUTH_CALLBACK',
  session_read: 'SESSION_READ',
  session_sign_out: 'SESSION_SIGN_OUT',
  identity_link: 'IDENTITY_LINK',
  rate_limited: 'RATE_LIMITED',
} as const;

const securityAuditOutcomes = {
  success: 'SUCCESS',
  failure: 'FAILURE',
} as const;
