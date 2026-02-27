import { describe, it, expect } from 'vitest';
import { toApiReadingStatus, toReadableReadingStatus } from './readingStatus';

describe('readingStatus utils', () => {
  it('maps legacy reading to canonical currently-reading', () => {
    expect(toApiReadingStatus('reading')).toBe('currently-reading');
    expect(toApiReadingStatus('currently-reading')).toBe('currently-reading');
  });

  it('falls back to want-to-read for unknown status', () => {
    expect(toApiReadingStatus('unknown')).toBe('want-to-read');
    expect(toApiReadingStatus('')).toBe('want-to-read');
  });

  it('formats status labels for display', () => {
    expect(toReadableReadingStatus('currently-reading')).toBe('currently reading');
    expect(toReadableReadingStatus('want-to-read')).toBe('want to read');
  });
});
