/**
 * Redaction of sensitive values before anything reaches a log sink.
 *
 * Logging is a two-sink pipeline here (console -> docker logs, fluentd ->
 * Elasticsearch), so redaction is applied once at the logger boundary rather
 * than at each call site: a forgotten `{ ...body }` in a controller must not be
 * able to leak a credential.
 */

/** Keys whose string values are never safe to log. */
const SENSITIVE_KEY_PATTERN =
  /(password|passwd|pwd|secret|token|authorization|api[-_]?key|credential|bearer)/i;

export const REDACTED = '[REDACTED]';

const MAX_DEPTH = 6;

/**
 * Returns a copy of `value` with every sensitive field replaced by
 * {@link REDACTED}.
 *
 * Only string values are redacted: controllers deliberately log booleans such
 * as `{ recaptchaToken: !!body.recaptchaToken }` to record presence without
 * content, and that signal is worth keeping.
 */
export function redactSensitive(value: unknown): unknown {
  return redact(value, 0, new WeakSet<object>());
}

function redact(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (depth >= MAX_DEPTH) {
    return '[Object]';
  }

  if (seen.has(value)) {
    return '[Circular]';
  }

  if (value instanceof Date) {
    return value;
  }

  if (Buffer.isBuffer(value)) {
    return `[Buffer ${value.length} bytes]`;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, depth + 1, seen));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (typeof item === 'string' && SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = REDACTED;
    } else {
      result[key] = redact(item, depth + 1, seen);
    }
  }
  return result;
}
