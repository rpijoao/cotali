import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333';
const authBaseUrl = `${apiUrl.replace(/\/$/, '')}/v1/auth`;

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
  plugins: [
    emailOTPClient(),
    expoClient({
      scheme: 'cotali',
      storagePrefix: 'cotali',
      storage: SecureStore,
    }),
  ],
});
