import { describe, expect, it } from 'vitest';
import { createEventSchema } from '../../src/schemas/event.schema';

const base = {
  title: 'Test',
  startsAt: '2026-08-10T09:00:00Z',
  endsAt: '2026-08-10T10:00:00Z',
};

function firstError(result: ReturnType<typeof createEventSchema.safeParse>): string {
  return result.success ? '' : result.error.issues[0].message;
}

describe('event şeması — discriminatedUnion', () => {
  it('katılımcılı toplantı geçerlidir', () => {
    const result = createEventSchema.safeParse({
      ...base,
      type: 'meeting',
      participants: ['ayse@sirket.com'],
    });
    expect(result.success).toBe(true);
  });

  it('katılımcısız toplantı reddedilir', () => {
    const result = createEventSchema.safeParse({ ...base, type: 'meeting' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain('en az bir katılımcı');
  });

  it('boş katılımcı dizisiyle toplantı reddedilir', () => {
    const result = createEventSchema.safeParse({ ...base, type: 'meeting', participants: [] });
    expect(result.success).toBe(false);
  });

  it('katılımcısız kişisel etkinlik geçerlidir', () => {
    const result = createEventSchema.safeParse({ ...base, type: 'personal' });
    expect(result.success).toBe(true);
  });

  it('kişisel etkinliğe katılımcı eklenemez', () => {
    const result = createEventSchema.safeParse({
      ...base,
      type: 'personal',
      participants: ['ayse@sirket.com'],
    });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain('Kişisel etkinlikte');
  });

  it('tanımsız tip reddedilir', () => {
    const result = createEventSchema.safeParse({ ...base, type: 'dugun' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain('meeting veya personal');
  });

  it('bitiş zamanı başlangıçtan önce olamaz', () => {
    const result = createEventSchema.safeParse({
      type: 'personal',
      title: 'Ters',
      startsAt: '2026-08-10T10:00:00Z',
      endsAt: '2026-08-10T09:00:00Z',
    });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain('sonra olmalıdır');
  });

  it('24 saatten uzun etkinlik reddedilir', () => {
    const result = createEventSchema.safeParse({
      type: 'personal',
      title: 'Uzun',
      startsAt: '2026-08-10T00:00:00Z',
      endsAt: '2026-08-12T00:00:00Z',
    });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain('24 saat');
  });

  it('tarih metni Date nesnesine çevrilir', () => {
    const result = createEventSchema.safeParse({ ...base, type: 'personal' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startsAt).toBeInstanceOf(Date);
    }
  });

  it('geçersiz tarih Türkçe mesajla reddedilir', () => {
    const result = createEventSchema.safeParse({ ...base, type: 'personal', startsAt: 'dun' });
    expect(result.success).toBe(false);
    expect(firstError(result)).toContain('geçerli bir tarih');
  });
});
