import { describe, expect, it } from 'vitest';
import { buildOtpRateLimitKey } from './otp-rate-limit-service.js';

describe('OTP rate-limit storage key', () => {
  it('normalizes identifiers and never stores the raw email or IP', () => {
    const key = buildOtpRateLimitKey(
      ' Professional@Example.com ',
      '2001:DB8::1',
      'test-secret',
    );

    expect(key).toBe(
      buildOtpRateLimitKey(
        'professional@example.com',
        '2001:db8::1',
        'test-secret',
      ),
    );
    expect(key).toContain('cotali:otp-email-ip:v1:');
    expect(key).not.toContain('professional@example.com');
    expect(key).not.toContain('2001:db8::1');
  });
});
