import { describe, expect, it } from 'vitest';
import { buildPageMeta, parseSort, skipFor } from '../../src/utils/pagination';

describe('pagination', () => {
  it('toplam sayfa sayısını yukarı yuvarlar', () => {
    expect(buildPageMeta(57, 1, 20)).toEqual({ page: 1, limit: 20, total: 57, totalPages: 3 });
    expect(buildPageMeta(40, 1, 20).totalPages).toBe(2);
  });

  it('kayıt yoksa sayfa sayısı sıfırdır', () => {
    expect(buildPageMeta(0, 1, 20).totalPages).toBe(0);
  });

  it('atlanacak kayıt sayısını hesaplar', () => {
    expect(skipFor(1, 20)).toBe(0);
    expect(skipFor(3, 20)).toBe(40);
  });

  it('sıralama ifadesini Mongoose nesnesine çevirir', () => {
    expect(parseSort('-createdAt')).toEqual({ createdAt: -1 });
    expect(parseSort('title')).toEqual({ title: 1 });
  });
});
