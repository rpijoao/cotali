import { describe, expect, it } from 'vitest';
import {
  hasProfessionalProfileContent,
  parseLocalProfessionalProfile,
  type LocalProfessionalProfile,
} from './profile-state';

const validProfile = {
  address: 'Rua das Flores, 10',
  businessName: 'Elétrica João',
  document: '123.456.789-00',
  name: 'João Furtado',
  phone: '5511999999999',
  version: 1,
} satisfies LocalProfessionalProfile;

describe('parseLocalProfessionalProfile', () => {
  it('restores a valid versioned profile', () => {
    expect(parseLocalProfessionalProfile(JSON.stringify(validProfile))).toEqual(
      validProfile,
    );
  });

  it.each([
    'not-json',
    JSON.stringify({ ...validProfile, version: 2 }),
    JSON.stringify({ ...validProfile, phone: 11999999999 }),
  ])('rejects malformed or unsupported persisted data', (value) => {
    expect(parseLocalProfessionalProfile(value)).toBeNull();
  });
});

describe('hasProfessionalProfileContent', () => {
  it('detects a profile worth displaying', () => {
    expect(hasProfessionalProfileContent(validProfile)).toBe(true);
  });

  it('does not surface an untouched profile', () => {
    expect(
      hasProfessionalProfileContent({
        address: '',
        businessName: '',
        document: '',
        name: '',
        phone: '',
        version: 1,
      }),
    ).toBe(false);
  });
});
