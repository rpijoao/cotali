import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite/kv-store', () => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

let getProfessionalProfile: () => Promise<unknown>;
let updateProfessionalProfile: (profile: {
  address: string;
  businessName: string;
  document: string;
  name: string;
  phone: string;
  version: 1;
}) => Promise<unknown>;

beforeAll(async () => {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3333';
  process.env.EXPO_PUBLIC_DEV_AUTH_TOKEN = 'dev:local-user';
  ({ getProfessionalProfile, updateProfessionalProfile } =
    await import('./profile-api'));
});

afterEach(() => fetchMock.mockReset());

describe('getProfessionalProfile', () => {
  it('loads the authenticated profile', async () => {
    const profile = {
      address: null,
      businessName: 'Elétrica João',
      document: null,
      name: 'João Furtado',
      phone: '+5511999999999',
      updatedAt: '2026-09-05T12:00:00.000Z',
    };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => profile });

    await expect(getProfessionalProfile()).resolves.toEqual(profile);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3333/v1/profile', {
      headers: { authorization: 'Bearer dev:local-user' },
      method: 'GET',
    });
  });

  it('rejects malformed profile data', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'João' }),
    });

    await expect(getProfessionalProfile()).rejects.toThrow(
      'A API retornou um perfil inválido.',
    );
  });
});

describe('updateProfessionalProfile', () => {
  it('sends the editable fields and converts empty values to null', async () => {
    const profile = {
      address: '',
      businessName: 'Elétrica João',
      document: '',
      name: 'João Furtado',
      phone: '',
      updatedAt: '2026-09-05T12:00:00.000Z',
    };
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => profile });

    await expect(
      updateProfessionalProfile({
        address: ' ',
        businessName: 'Elétrica João',
        document: '',
        name: 'João Furtado',
        phone: '',
        version: 1,
      }),
    ).resolves.toEqual(profile);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3333/v1/profile', {
      body: JSON.stringify({
        address: null,
        businessName: 'Elétrica João',
        document: null,
        name: 'João Furtado',
        phone: null,
      }),
      headers: {
        authorization: 'Bearer dev:local-user',
        'content-type': 'application/json',
      },
      method: 'PATCH',
    });
  });
});
