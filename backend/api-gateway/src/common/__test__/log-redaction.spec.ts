import { redactSensitive, REDACTED } from '../log-redaction';

describe('redactSensitive', () => {
  it('redacts password-like keys', () => {
    const result = redactSensitive({
      email: 'user@example.com',
      password: 'hunter2',
      newPassword: 'hunter3',
    });

    expect(result).toEqual({
      email: 'user@example.com',
      password: REDACTED,
      newPassword: REDACTED,
    });
  });

  it('redacts token, secret and authorization keys', () => {
    const result = redactSensitive({
      access_token: 'eyJhbGci',
      refreshToken: 'opaque',
      resetToken: 'abc123',
      client_secret: 's3cr3t',
      authorization: 'Bearer eyJhbGci',
      apiKey: 'k-123',
    });

    expect(Object.values(result as Record<string, unknown>)).toEqual([
      REDACTED,
      REDACTED,
      REDACTED,
      REDACTED,
      REDACTED,
      REDACTED,
    ]);
  });

  it('keeps non-string values so presence flags stay readable', () => {
    expect(redactSensitive({ recaptchaToken: true, tokenCount: 3 })).toEqual({
      recaptchaToken: true,
      tokenCount: 3,
    });
  });

  it('redacts nested payloads such as a login result', () => {
    const result = redactSensitive({
      access_token: 'eyJhbGci',
      user: { id: 1, email: 'a@b.c', password: '$2a$10$hash' },
    });

    expect(result).toEqual({
      access_token: REDACTED,
      user: { id: 1, email: 'a@b.c', password: REDACTED },
    });
  });

  it('redacts inside arrays', () => {
    expect(redactSensitive([{ password: 'x' }, { password: 'y' }])).toEqual([
      { password: REDACTED },
      { password: REDACTED },
    ]);
  });

  it('does not blow up on circular references', () => {
    const node: Record<string, unknown> = { password: 'x' };
    node.self = node;

    expect(redactSensitive(node)).toEqual({
      password: REDACTED,
      self: '[Circular]',
    });
  });

  it('passes primitives through unchanged', () => {
    expect(redactSensitive('plain')).toBe('plain');
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(null)).toBeNull();
  });

  it('serialises errors without losing the stack', () => {
    const error = new Error('boom');
    const result = redactSensitive(error) as Record<string, unknown>;

    expect(result.name).toBe('Error');
    expect(result.message).toBe('boom');
    expect(result.stack).toContain('boom');
  });
});
