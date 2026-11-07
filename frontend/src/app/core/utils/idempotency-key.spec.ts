import { describe, expect, it } from 'vitest';
import { createIdempotencyKey } from './idempotency-key';

describe('createIdempotencyKey', () => {
  it('creates a cryptographically random UUID v4', () => {
    expect(createIdempotencyKey()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });
});
