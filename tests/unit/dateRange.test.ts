import { describe, expect, it } from 'vitest';
import {
  daysBetween,
  eachDateKey,
  endOfUtcDay,
  spannedDateKeys,
  startOfUtcDay,
  toDateKey,
} from '../../src/utils/dateRange';

const d = (value: string) => new Date(value);

describe('dateRange', () => {
  it('gün başlangıcı ve sonu UTC olarak hesaplanır', () => {
    expect(startOfUtcDay(d('2026-08-10T14:33:00Z')).toISOString()).toBe('2026-08-10T00:00:00.000Z');
    expect(endOfUtcDay(d('2026-08-10T14:33:00Z')).toISOString()).toBe('2026-08-10T23:59:59.999Z');
  });

  it('gün anahtarı YYYY-MM-DD biçiminde döner', () => {
    expect(toDateKey(d('2026-08-10T23:59:59Z'))).toBe('2026-08-10');
  });

  it('aradaki tam gün sayısını verir', () => {
    expect(daysBetween(d('2026-08-10'), d('2026-08-10'))).toBe(0);
    expect(daysBetween(d('2026-08-10'), d('2026-08-12'))).toBe(2);
  });

  it('aralıktaki her günü listeler, iki uç da dahil', () => {
    expect(eachDateKey(d('2026-08-10'), d('2026-08-13'))).toEqual([
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
    ]);
  });

  describe('spannedDateKeys', () => {
    it('aynı gün içindeki etkinlik tek güne düşer', () => {
      expect(spannedDateKeys(d('2026-08-10T09:00:00Z'), d('2026-08-10T10:00:00Z'))).toEqual([
        '2026-08-10',
      ]);
    });

    it('gece yarısını aşan etkinlik iki güne düşer', () => {
      expect(spannedDateKeys(d('2026-08-10T23:00:00Z'), d('2026-08-11T01:00:00Z'))).toEqual([
        '2026-08-10',
        '2026-08-11',
      ]);
    });

    // Sınır durumu: bitiş anı dışlanır.
    // Tam gece yarısında biten etkinlik ertesi güne taşmış sayılmaz.
    it('tam gece yarısında biten etkinlik ertesi güne taşmaz', () => {
      expect(spannedDateKeys(d('2026-08-10T23:00:00Z'), d('2026-08-11T00:00:00Z'))).toEqual([
        '2026-08-10',
      ]);
    });
  });
});
