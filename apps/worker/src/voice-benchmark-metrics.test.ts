import { describe, expect, it } from 'vitest';
import {
  scoreExpectedFields,
  transcriptScore,
} from './voice-benchmark-metrics';

describe('voice benchmark metrics', () => {
  it('normalizes accents and punctuation for transcript scoring', () => {
    expect(
      transcriptScore('Troca de duas tomadas.', 'troca de duas tomadas'),
    ).toBe(1);
    expect(transcriptScore('duas tomadas', 'duas tomada')).toBeGreaterThan(0);
  });

  it('scores only the expected structured fields', () => {
    const score = scoreExpectedFields(
      {
        client: { name: 'Mária' },
        services: [{ description: 'Troca de tomada', quantity: '2' }],
      },
      {
        client: { name: 'Maria' },
        services: [{ description: 'Troca de tomada', quantity: '2' }],
      },
    );
    expect(score).toEqual({ matched: 3, total: 3, score: 1 });
  });
});
