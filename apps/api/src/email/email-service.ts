import { Resend } from 'resend';

export type AuthEmailType = 'sign-in' | 'email-verification';

export interface AuthEmailService {
  sendOtp(input: {
    email: string;
    otp: string;
    type: AuthEmailType;
  }): Promise<void>;
}

export class EmailDeliveryError extends Error {
  constructor(message = 'The email delivery service is unavailable.') {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

export class ResendAuthEmailService implements AuthEmailService {
  readonly #resend: Resend;

  constructor(
    private readonly config: Readonly<{
      apiKey: string;
      from: string;
      appName?: string;
    }>,
  ) {
    this.#resend = new Resend(config.apiKey);
  }

  async sendOtp(input: {
    email: string;
    otp: string;
    type: AuthEmailType;
  }): Promise<void> {
    const subject =
      input.type === 'sign-in'
        ? `Seu código de acesso ao ${this.config.appName ?? 'Cotali'}`
        : `Confirme seu email no ${this.config.appName ?? 'Cotali'}`;
    const result = await this.#resend.emails.send({
      from: this.config.from,
      to: input.email,
      subject,
      html: renderOtpEmail({
        appName: this.config.appName ?? 'Cotali',
        otp: input.otp,
        type: input.type,
      }),
      text: renderOtpText({
        appName: this.config.appName ?? 'Cotali',
        otp: input.otp,
        type: input.type,
      }),
      tags: [{ name: 'category', value: 'auth' }],
    });

    if (result.error) {
      throw new EmailDeliveryError('Resend rejected the authentication email.');
    }
  }
}

export class UnconfiguredAuthEmailService implements AuthEmailService {
  async sendOtp(): Promise<void> {
    throw new EmailDeliveryError(
      'RESEND_API_KEY and RESEND_FROM_EMAIL must be configured to send authentication emails.',
    );
  }
}

export function createAuthEmailServiceFromEnvironment(): AuthEmailService {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'RESEND_API_KEY and RESEND_FROM_EMAIL are required in production.',
      );
    }
    return new UnconfiguredAuthEmailService();
  }
  return new ResendAuthEmailService({
    apiKey,
    from,
    appName: process.env.APP_NAME ?? 'Cotali',
  });
}

function renderOtpEmail(input: {
  appName: string;
  otp: string;
  type: AuthEmailType;
}): string {
  const purpose =
    input.type === 'sign-in' ? 'entrar na sua conta' : 'confirmar seu email';
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;background:#f6f7f9;color:#172033;font-family:Arial,sans-serif">
    <main style="max-width:560px;margin:0 auto;padding:40px 24px">
      <section style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
        <p style="margin:0 0 24px;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#536178">${escapeHtml(input.appName)}</p>
        <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">Seu código de acesso</h1>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.5">Use este código para ${purpose}. Ele expira em 10 minutos.</p>
        <p style="margin:0 0 24px;padding:18px;border-radius:12px;background:#f1f5f9;font-size:32px;letter-spacing:.28em;text-align:center;font-weight:700">${escapeHtml(input.otp)}</p>
        <p style="margin:0;color:#64748b;font-size:13px;line-height:1.5">Se você não solicitou este código, ignore este email. Nunca compartilhe seu código.</p>
      </section>
    </main>
  </body>
</html>`;
}

function renderOtpText(input: {
  appName: string;
  otp: string;
  type: AuthEmailType;
}): string {
  const purpose =
    input.type === 'sign-in' ? 'entrar na sua conta' : 'confirmar seu email';
  return `${input.appName}\n\nSeu código para ${purpose} é: ${input.otp}\n\nEle expira em 10 minutos. Se você não solicitou este código, ignore este email.`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] ?? character,
  );
}
