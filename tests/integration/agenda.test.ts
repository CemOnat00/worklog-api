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

function createTask(body: Record<string, unknown>) {
  return request(app).post('/api/v1/tasks').set('Authorization', user.authHeader).send(body);
}

function agenda(query: string) {
  return request(app).get(`/api/v1/agenda?${query}`).set('Authorization', user.authHeader);
}

interface Day {
  date: string;
  events: { title: string }[];
  tasks: { title: string }[];
}

const titlesOn = (days: Day[], date: string, key: 'events' | 'tasks') =>
  days.find((d) => d.date === date)?.[key].map((item) => item.title) ?? [];

describe('GET /agenda — doğrulama', () => {
  it('token’sız istek 401 döner', async () => {
    expect((await request(app).get('/api/v1/agenda?from=2026-08-10&to=2026-08-11')).status).toBe(
      401,
    );
  });

  it('from ve to zorunludur', async () => {
    const response = await agenda('');
    expect(response.status).toBe(400);
    const fields = response.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['from', 'to']));
  });

  it('to tarihi from’dan önce olamaz', async () => {
    const response = await agenda('from=2026-08-10&to=2026-08-01');
    expect(response.status).toBe(400);
  });

  it('90 günden uzun aralık reddedilir', async () => {
    const response = await agenda('from=2026-01-01&to=2026-12-31');
    expect(response.status).toBe(400);
    expect(response.body.error.details[0].message).toContain('90 gün');
  });
});

describe('GET /agenda — gruplama', () => {
  it('boş günler de döner', async () => {
    const response = await agenda('from=2026-08-10&to=2026-08-12');

    expect(response.body.data.days).toHaveLength(3);
    expect(response.body.data.days[1]).toEqual({ date: '2026-08-11', events: [], tasks: [] });
  });

  it('etkinlikler ve tarihli görevler doğru güne düşer', async () => {
    await createEvent({
      type: 'personal',
      title: 'Spor',
      startsAt: '2026-08-10T18:00:00Z',
      endsAt: '2026-08-10T19:00:00Z',
    });
    await createTask({ title: 'Rapor', dueDate: '2026-08-11T12:00:00Z' });
    await createTask({ title: 'Tarihsiz gorev' });

    const { body } = await agenda('from=2026-08-10&to=2026-08-11');
    const days: Day[] = body.data.days;

    expect(titlesOn(days, '2026-08-10', 'events')).toEqual(['Spor']);
    expect(titlesOn(days, '2026-08-11', 'tasks')).toEqual(['Rapor']);
    // Son tarihi olmayan görev ajandaya hiç girmez
    expect(body.meta.totalTasks).toBe(1);
  });

  it('gün içinde etkinlikler başlangıç saatine göre sıralanır', async () => {
    await createEvent({
      type: 'personal',
      title: 'Aksam',
      startsAt: '2026-08-10T18:00:00Z',
      endsAt: '2026-08-10T19:00:00Z',
    });
    await createEvent({
      type: 'personal',
      title: 'Sabah',
      startsAt: '2026-08-10T08:00:00Z',
      endsAt: '2026-08-10T09:00:00Z',
    });

    const { body } = await agenda('from=2026-08-10&to=2026-08-10');
    expect(titlesOn(body.data.days, '2026-08-10', 'events')).toEqual(['Sabah', 'Aksam']);
  });

  // `to` günün SONU olarak yorumlanmalı, başlangıcı değil.
  it('tek günlük sorguda o günün tamamı dahil edilir', async () => {
    await createEvent({
      type: 'personal',
      title: 'Gec saat',
      startsAt: '2026-08-10T22:00:00Z',
      endsAt: '2026-08-10T23:00:00Z',
    });

    const { body } = await agenda('from=2026-08-10&to=2026-08-10');
    expect(body.data.days).toHaveLength(1);
    expect(body.meta.totalEvents).toBe(1);
  });

  it('gece yarısını aşan etkinlik iki günde görünür ama bir kez sayılır', async () => {
    await createEvent({
      type: 'personal',
      title: 'Gece nobeti',
      startsAt: '2026-08-14T23:00:00Z',
      endsAt: '2026-08-15T01:00:00Z',
    });

    const { body } = await agenda('from=2026-08-14&to=2026-08-15');
    const days: Day[] = body.data.days;

    expect(titlesOn(days, '2026-08-14', 'events')).toEqual(['Gece nobeti']);
    expect(titlesOn(days, '2026-08-15', 'events')).toEqual(['Gece nobeti']);
    expect(body.meta.totalEvents).toBe(1);
  });

  it('tip filtresi verildiğinde görevler dahil edilmez', async () => {
    await createEvent({
      type: 'personal',
      title: 'Spor',
      startsAt: '2026-08-10T18:00:00Z',
      endsAt: '2026-08-10T19:00:00Z',
    });
    await createEvent({
      type: 'meeting',
      title: 'Toplanti',
      startsAt: '2026-08-10T09:00:00Z',
      endsAt: '2026-08-10T10:00:00Z',
      participants: ['ayse@sirket.com'],
    });
    await createTask({ title: 'Gorev', dueDate: '2026-08-10T12:00:00Z' });

    const { body } = await agenda('from=2026-08-10&to=2026-08-10&type=meeting');

    expect(titlesOn(body.data.days, '2026-08-10', 'events')).toEqual(['Toplanti']);
    expect(body.meta.totalTasks).toBe(0);
  });

  it('başka kullanıcının kayıtları ajandaya girmez', async () => {
    await createEvent({
      type: 'personal',
      title: 'Benim',
      startsAt: '2026-08-10T18:00:00Z',
      endsAt: '2026-08-10T19:00:00Z',
    });

    const baskasi = await createUser();
    const response = await request(app)
      .get('/api/v1/agenda?from=2026-08-10&to=2026-08-10')
      .set('Authorization', baskasi.authHeader);

    expect(response.body.meta.totalEvents).toBe(0);
  });
});
