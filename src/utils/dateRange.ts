/**
 * Tüm tarihler UTC olarak saklanır ve döner (TASARIM.md §2, kapsam dışı: timezone).
 * Buradaki yardımcılar bu kararı tek yerde uygular.
 */

const MS_PER_DAY = 86_400_000;

/** Verilen anın UTC gününün başlangıcı (00:00:00.000) */
export function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
}

/** Verilen anın UTC gününün sonu (23:59:59.999) */
export function endOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999),
  );
}

/** "2026-08-10" biçiminde gün anahtarı */
export function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** İki tarih arasındaki tam gün sayısı (aynı gün ise 0) */
export function daysBetween(from: Date, to: Date): number {
  return Math.floor((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / MS_PER_DAY);
}

/** from..to arasındaki her günün anahtarı, ikisi de dahil */
export function eachDateKey(from: Date, to: Date): string[] {
  const keys: string[] = [];
  let cursor = startOfUtcDay(from);
  const last = startOfUtcDay(to);

  while (cursor <= last) {
    keys.push(toDateKey(cursor));
    cursor = new Date(cursor.getTime() + MS_PER_DAY);
  }

  return keys;
}

/**
 * Bir zaman aralığının dokunduğu günlerin anahtarları.
 *
 * `endsAt`'tan 1 ms çıkarılır: 23:00–00:00 aralığındaki bir etkinlik ertesi güne
 * taşmış sayılmamalı. Bitiş anı dışlanan bir sınırdır.
 */
export function spannedDateKeys(startsAt: Date, endsAt: Date): string[] {
  const lastMoment = new Date(Math.max(endsAt.getTime() - 1, startsAt.getTime()));
  return eachDateKey(startsAt, lastMoment);
}
