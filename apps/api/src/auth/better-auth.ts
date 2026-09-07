import { prismaAdapter } from '@better-auth/prisma-adapter';
import type { PrismaClient } from '@prisma/client';
import { betterAuth, type Auth, type BetterAuthOptions } from 'better-auth';
import { expo } from '@better-auth/expo';
import { emailOTP } from 'better-auth/plugins';
import type { AuthEmailService } from '../email/email-service.js';

const DEVELOPMENT_SECRET = 'cotali-development-secret-change-me';
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export function createCotaliAuth(
  prisma: PrismaClient,
  emailService: AuthEmailService,
): Auth<BetterAuthOptions> {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = resolveBetterAuthSecret();
  const socialProviders = createSocialProviders(isProduction);
  const baseURL = resolveBetterAuthBaseURL();

  const options: BetterAuthOptions = {
    appName: process.env.APP_NAME ?? 'Cotali',
    baseURL,
    basePath: '/v1/auth',
    secret,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    user: {
      modelName: 'AuthUser',
      fields: {
        emailVerified: 'email_verified',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
    },
    session: {
      modelName: 'AuthSession',
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        userId: 'user_id',
      },
      expiresIn: SESSION_SECONDS,
      updateAge: 60 * 60 * 24,
    },
    account: {
      modelName: 'AuthAccount',
      fields: {
        accountId: 'account_id',
        providerId: 'provider_id',
        userId: 'user_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        idToken: 'id_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
        allowDifferentEmails: false,
        allowUnlinkingAll: false,
        updateUserInfoOnLink: false,
      },
      encryptOAuthTokens: true,
      storeStateStrategy: 'database',
    },
    verification: {
      modelName: 'AuthVerification',
      fields: {
        expiresAt: 'expires_at',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
      },
      storeIdentifier: 'hashed',
    },
    socialProviders,
    trustedOrigins: readTrustedOrigins(baseURL),
    plugins: [
      expo(),
      emailOTP({
        // A solicitação de login também inicia o cadastro. Para qualquer email
        // válido, o endpoint mantém a mesma resposta sem revelar a existência
        // de uma conta.
        disableSignUp: false,
        otpLength: 6,
        expiresIn: 60 * 10,
        allowedAttempts: 5,
        storeOTP: 'hashed',
        resendStrategy: 'rotate',
        rateLimit: { window: 60, max: 3 },
        async sendVerificationOTP({ email, otp, type }) {
          if (type !== 'sign-in' && type !== 'email-verification') return;
          await emailService.sendOtp({ email, otp, type });
        },
      }),
    ],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      storage: 'database',
      modelName: 'AuthRateLimit',
      fields: { lastRequest: 'last_request' },
    },
    advanced: {
      ...resolveAuthCookiePolicy(baseURL),
      database: { joins: true },
      ipAddress: { ipAddressHeaders: ['x-cotali-client-ip'] },
    },
    databaseHooks: {
      user: {
        create: {
          async after(user) {
            await prisma.account.upsert({
              where: { authSubject: user.id },
              create: { authSubject: user.id },
              update: {},
            });
          },
        },
      },
    },
  };

  return betterAuth(options);
}

export function resolveBetterAuthSecret(): string {
  if (process.env.BETTER_AUTH_SECRET) return process.env.BETTER_AUTH_SECRET;
  if (process.env.NODE_ENV === 'production') {
    return requiredEnvironment('BETTER_AUTH_SECRET');
  }
  return DEVELOPMENT_SECRET;
}

export function resolveBetterAuthBaseURL(): string {
  if (process.env.NODE_ENV === 'production') {
    return requiredEnvironment('BETTER_AUTH_URL');
  }
  return (
    process.env.BETTER_AUTH_URL ??
    process.env.AUTH_BASE_URL ??
    'http://localhost:3333'
  );
}

export function createSocialProviders(isProduction: boolean) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const appleClientId = process.env.APPLE_CLIENT_ID;
  const appleClientSecret = process.env.APPLE_CLIENT_SECRET;

  assertProviderPair(
    'GOOGLE_CLIENT_ID',
    googleClientId,
    'GOOGLE_CLIENT_SECRET',
    googleClientSecret,
  );
  assertProviderPair(
    'APPLE_CLIENT_ID',
    appleClientId,
    'APPLE_CLIENT_SECRET',
    appleClientSecret,
  );

  if (isProduction) {
    if (!googleClientId || !googleClientSecret) {
      throw new Error(
        'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required in production.',
      );
    }
  }

  return {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
    ...(appleClientId && appleClientSecret
      ? {
          apple: {
            clientId: appleClientId,
            clientSecret: appleClientSecret,
          },
        }
      : {}),
  };
}

function assertProviderPair(
  clientIdName: string,
  clientId: string | undefined,
  clientSecretName: string,
  clientSecret: string | undefined,
): void {
  if (Boolean(clientId) === Boolean(clientSecret)) return;
  throw new Error(
    `${clientIdName} and ${clientSecretName} must be provided together.`,
  );
}

export function readTrustedOrigins(baseURL: string): string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  const configured = readConfiguredTrustedOrigins(isProduction);
  const developmentDefaults = [
    'http://localhost:3000',
    'http://localhost:8081',
    'cotali://',
    'exp://',
    'exp://**',
    'exp://192.168.*.*:*/**',
    ...(process.env.WEB_APP_URL ? [process.env.WEB_APP_URL] : []),
    ...(process.env.MOBILE_APP_URL ? [process.env.MOBILE_APP_URL] : []),
  ];

  return unique([
    normalizeTrustedOrigin(baseURL, 'BETTER_AUTH_URL'),
    ...(configured.length ? configured : developmentDefaults).map((origin) =>
      normalizeTrustedOrigin(origin, 'AUTH_TRUSTED_ORIGINS'),
    ),
  ]);
}

function readConfiguredTrustedOrigins(isProduction: boolean): string[] {
  const raw = process.env.AUTH_TRUSTED_ORIGINS?.trim();
  if (!raw && isProduction) {
    return [requiredEnvironment('AUTH_TRUSTED_ORIGINS')];
  }
  if (!raw) return [];
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function normalizeTrustedOrigin(value: string, variableName: string): string {
  const origin = value.trim();
  if (!origin) throw new Error(`${variableName} contém uma origem vazia.`);

  const hasWildcard = origin.includes('*') || origin.includes('?');
  if (hasWildcard) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `${variableName} não pode conter curingas em produção: ${origin}`,
      );
    }
    if (!/^[a-z][a-z\d+.-]*:\/\/[^\s]+$/i.test(origin)) {
      throw new Error(`${variableName} contém uma origem inválida: ${origin}`);
    }
    return origin;
  }

  if (/^https?:\/\//i.test(origin)) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`${variableName} contém uma origem inválida: ${origin}`);
    }
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== '/' ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        `${variableName} deve conter apenas a origem, sem caminho: ${origin}`,
      );
    }
    return parsed.origin;
  }

  if (!/^[a-z][a-z\d+.-]*:\/\/[^\s]*$/i.test(origin)) {
    throw new Error(`${variableName} contém uma origem inválida: ${origin}`);
  }
  return origin;
}

function unique(origins: string[]): string[] {
  return [...new Set(origins)];
}

export type AuthCookieSameSite = 'lax' | 'strict' | 'none';

export function resolveAuthCookiePolicy(baseURL: string) {
  let parsedBaseURL: URL;
  try {
    parsedBaseURL = new URL(baseURL);
  } catch {
    throw new Error(`BETTER_AUTH_URL is invalid: ${baseURL}`);
  }

  if (!['http:', 'https:'].includes(parsedBaseURL.protocol)) {
    throw new Error('BETTER_AUTH_URL deve usar HTTP ou HTTPS.');
  }

  const secure = parsedBaseURL.protocol === 'https:';
  if (process.env.NODE_ENV === 'production' && !secure) {
    throw new Error('BETTER_AUTH_URL must use HTTPS in production.');
  }

  const sameSite = readAuthCookieSameSite(secure);
  return {
    useSecureCookies: secure,
    defaultCookieAttributes: {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
    },
  };
}

function readAuthCookieSameSite(secure: boolean): AuthCookieSameSite {
  const configured = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();
  const sameSite = configured || 'lax';
  if (sameSite !== 'lax' && sameSite !== 'strict' && sameSite !== 'none') {
    throw new Error('AUTH_COOKIE_SAME_SITE deve ser lax, strict ou none.');
  }
  if (sameSite === 'none' && !secure) {
    throw new Error('AUTH_COOKIE_SAME_SITE=none requires HTTPS.');
  }
  return sameSite;
}

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required in production.`);
  return value;
}
