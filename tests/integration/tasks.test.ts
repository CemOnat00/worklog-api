import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createUser, type TestUser } from '../helpers';

let user: TestUser;

beforeEach(async () => {
  user = await createUser();
});

function createTask(body: Record<string, unknown>) {
  return request(app).post('/api/v1/tasks').set('Authorization', user.authHeader).send(body);
}

function setStatus(id: string, status: string) {
  return request(app)
    .patch(`/api/v1/tasks/${id}/status`)
    .set('Authorization', user.authHeader)
    .send({ status });
}

describe('tasks CRUD', () => {
  it('varsayılan durum ve öncelik uygulanır', async () => {
    const response = await createTask({ title: 'Yeni gorev' });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('todo');
    expect(response.body.data.priority).toBe('medium');
    expect(response.body.data.completedAt).toBeUndefined();
  });

  it('tanımsız durum reddedilir', async () => {
    const response = await createTask({ title: 'Gecersiz', status: 'bitti' });
    expect(response.status).toBe(400);
  });

  it('geçersiz tarih Türkçe mesajla reddedilir', async () => {
    const response = await createTask({ title: 'Tarih', dueDate: 'dun' });
    expect(response.status).toBe(400);
    expect(response.body.error.details[0].message).toContain('geçerli bir tarih');
  });

  it('durum, öncelik ve son tarihe göre filtreler', async () => {
    await createTask({ title: 'Acil', priority: 'high', dueDate: '2026-08-06T17:00:00Z' });
    await createTask({ title: 'Bitmis', status: 'done' });
    await createTask({ title: 'Sonraki', priority: 'low', dueDate: '2026-08-20T12:00:00Z' });

    const durum = await request(app)
      .get('/api/v1/tasks?status=done')
      .set('Authorization', user.authHeader);
    const oncelik = await request(app)
      .get('/api/v1/tasks?priority=high')
      .set('Authorization', user.authHeader);
    const tarih = await request(app)
      .get('/api/v1/tasks?dueBefore=2026-08-10')
      .set('Authorization', user.authHeader);

    expect(durum.body.data.map((t: { title: string }) => t.title)).toEqual(['Bitmis']);
    expect(oncelik.body.data.map((t: { title: string }) => t.title)).toEqual(['Acil']);
    expect(tarih.body.data.map((t: { title: string }) => t.title)).toEqual(['Acil']);
  });

  it('başkasının görevine erişim 404 döner', async () => {
    const { body } = await createTask({ title: 'Benim' });
    const baskasi = await createUser();

    const response = await request(app)
      .get(`/api/v1/tasks/${body.data.id}`)
      .set('Authorization', baskasi.authHeader);

    expect(response.status).toBe(404);
  });

  it('olmayan nota bağlanamaz', async () => {
    const response = await createTask({
      title: 'Hayali not',
      noteId: '000000000000000000000000',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('noteId');
  });
});

// TASARIM.md §8, kural 6
describe('completedAt yönetimi', () => {
  it('done olarak oluşturulan görevde completedAt dolar', async () => {
    const response = await createTask({ title: 'Hemen bitti', status: 'done' });
    expect(response.body.data.completedAt).toBeTruthy();
  });

  it('todo → done geçişinde completedAt dolar', async () => {
    const { body } = await createTask({ title: 'Gecis' });
    const response = await setStatus(body.data.id, 'done');

    expect(response.body.data.status).toBe('done');
    expect(response.body.data.completedAt).toBeTruthy();
  });

  // Mongoose `undefined` değerleri güncellemede yok sayar;
  // alanı gerçekten silmek için $unset gerekiyor.
  it('done → todo geçişinde completedAt silinir', async () => {
    const { body } = await createTask({ title: 'Geri alinacak', status: 'done' });

    await setStatus(body.data.id, 'todo');
    const response = await request(app)
      .get(`/api/v1/tasks/${body.data.id}`)
      .set('Authorization', user.authHeader);

    expect(response.body.data.status).toBe('todo');
    expect(response.body.data.completedAt).toBeUndefined();
  });

  it('zaten done olan görevde ilk tamamlanma zamanı korunur', async () => {
    const { body } = await createTask({ title: 'Iki kez done', status: 'done' });
    const ilkZaman = body.data.completedAt;

    await new Promise((resolve) => setTimeout(resolve, 20));
    const response = await setStatus(body.data.id, 'done');

    expect(response.body.data.completedAt).toBe(ilkZaman);
  });
});
