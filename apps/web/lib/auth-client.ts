'use client';

import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

export const authClient = createAuthClient({
  baseURL: `${apiUrl.replace(/\/$/, '')}/v1/auth`,
  fetchOptions: { credentials: 'include' },
  plugins: [emailOTPClient()],
});

export async function recordMarketingConsent(granted: boolean): Promise<void> {
  const response = await fetch(
    `${apiUrl}/v1/privacy/consents/marketing-email`,
    {
      body: JSON.stringify({ channel: 'web', granted }),
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    },
  );
  if (!response.ok) {
    throw new Error('Não foi possível salvar sua preferência de comunicação.');
  }
}
