import { describe, expect, it } from 'vitest';
import { missingQuantityMessage } from './quote-validation';

describe('quote review validation', () => {
  it('identifies a service with a missing quantity', () => {
    expect(
      missingQuantityMessage('services', [
        { description: 'Troca de tomada', quantity: '  ' },
      ]),
    ).toBe('Informe a quantidade do serviço “Troca de tomada”.');
  });

  it('identifies a material by position when its description is empty', () => {
    expect(
      missingQuantityMessage('materials', [{ description: '', quantity: '' }]),
    ).toBe('Informe a quantidade do material 1.');
  });

  it('returns no message when every quantity is filled', () => {
    expect(
      missingQuantityMessage('services', [
        { description: 'Instalação', quantity: '1' },
      ]),
    ).toBeNull();
  });
});
