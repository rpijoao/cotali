const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333';
const developmentToken = process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN;

export async function authenticatedFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (developmentToken && process.env.NODE_ENV !== 'production') {
    return fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        authorization: `Bearer ${developmentToken}`,
      },
    });
  }

  const { authClient } = await import('./auth-client');
  const cookies = await authClient.getCookie();
  if (!cookies)
    throw new Error('A sessão autenticada ainda não foi configurada.');

  return fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'omit',
    headers: {
      ...init.headers,
      Cookie: cookies,
    },
  });
}

export function getApiUrl(): string {
  return apiUrl;
}
