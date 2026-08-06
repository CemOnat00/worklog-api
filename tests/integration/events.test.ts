import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createUser, type TestUser } from '../helpers';

let user: TestUser;

beforeEach(async () => {
  user = await createUser();
});

function createEvent(body: Record<string, unknown>) {
  return request(app).post('/api/v1/events').set('Authorization', user.authHeader).send(body);
}

const meeting = {
  type: 'meeting',
  title: 'Sprint planlama',
  startsAt: '2026-08-10T09:00:00Z',
  endsAt: '2026-08-10T10:00:00Z',
  participants: ['ayse@sirket.com'],
};

describe('events — tipe bağlı doğrulama', () => {
  it('katılımcılı toplantı oluşturulur', async () => {
    const response = await createEvent(meeting);
    expect(response.status).toBe(201);
    expect(response.body.data.participants).toHaveLength(1);
  });

  it('katılımcısız toplantı reddedilir', async () => {
    const { participants: _participants, ...katilimcisiz } = meeting;
    const response = await createEvent(katilimcisiz);

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].message).toContain('en az bir katılımcı');
  });

  it('kişisel etkinlikte katılımcı listesi kabul edilmez', async () => {
    const response = await createEvent({ ...meeting, type: 'personal' });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].message).toContain('Kişisel etkinlikte');
  });

  it('kişisel etkinlik boş katılımcı listesiyle kaydedilir', async () => {
    const response = await createEvent({
      type: 'personal',
      title: 'Spor',
      startsAt: '2026-08-10T18:00:00Z',
      endsAt: '2026-08-10T19:00:00Z',
    });

    expect(response.status).toBe(201);
    expect(response.body.data.participants).toEqual([]);
  });
});

// TASARIM.md §8, kural 3:
// mevcut.startsAt < yeni.endsAt VE mevcut.endsAt > yeni.startsAt
describe('events — çakışma kontrolü', () => {
  beforeEach(async () => {
    await createEvent(meeting); // 09:00–10:00
  });

  const personal = (startsAt: string, endsAt: string, title = 'Deneme') => ({
    type: 'personal',
    title,
    startsAt,
    endsAt,
  });

  it('birebir aynı aralık çakışır', async () => {
    const response = await createEvent(personal('2026-08-10T09:00:00Z', '2026-08-10T10:00:00Z'));
    expect(response.status).toBe(409);
    expect(response.body.error.details.conflictingEvent.title).toBe('Sprint planlama');
  });

  it('kısmi kesişme çakışır', async () => {
    const response = await createEvent(personal('2026-08-10T09:30:00Z', '2026-08-10T10:30:00Z'));
    expect(response.status).toBe(409);
  });

  it('sarmalayan aralık çakışır', async () => {
    const response = await createEvent(personal('2026-08-10T08:00:00Z', '2026-08-10T11:00:00Z'));
    expect(response.status).toBe(409);
  });

  // Sınırlar dışlanır: 09:00–10:00 ile 10:00–11:00 ardışıktır.
  it('ardışık etkinlik çakışmaz', async () => {
    const response = await createEvent(
      personal('2026-08-10T10:00:00Z', '2026-08-10T11:00:00Z', 'Ardisik'),
    );
    expect(response.status).toBe(201);
  });

  it('öncesinde biten etkinlik çakışmaz', async () => {
    const response = await createEvent(
      personal('2026-08-10T08:00:00Z', '2026-08-10T09:00:00Z', 'Onceki'),
    );
    expect(response.status).toBe(201);
  });

  it('güncellemede kayıt kendisiyle çakışmaz', async () => {
    const liste = await request(app).get('/api/v1/events').set('Authorization', user.authHeader);
    const id = liste.body.data[0].id;

    const response = await request(app)
      .patch(`/api/v1/events/${id}`)
      .set('Authorization', user.authHeader)
      .send({ endsAt: '2026-08-10T09:45:00Z' });

    expect(response.status).toBe(200);
    expect(response.body.data.endsAt).toBe('2026-08-10T09:45:00.000Z');
  });
});

// discriminatedUnion güncellemede kullanılamıyor; kural service katmanında.
describe('events — güncellemede tipe bağlı kural', () => {
  let eventId: string;

  beforeEach(async () => {
    const response = await createEvent(meeting);
    eventId = response.body.data.id;
  });

  function patch(body: Record<string, unknown>) {
    return request(app)
      .patch(`/api/v1/events/${eventId}`)
      .set('Authorization', user.authHeader)
      .send(body);
  }

  it('toplantının katılımcıları boşaltılamaz', async () => {
    const response = await patch({ participants: [] });
    expect(response.status).toBe(400);
  });

  it('kişisele çevrilince katılımcılar temizlenir', async () => {
    const response = await patch({ type: 'personal' });
    expect(response.status).toBe(200);
    expect(response.body.data.participants).toEqual([]);
  });

  it('katılımcısız kişisel etkinlik toplantıya çevrilemez', async () => {
    await patch({ type: 'personal' });
    const response = await patch({ type: 'meeting' });
    expect(response.status).toBe(400);
  });
});
