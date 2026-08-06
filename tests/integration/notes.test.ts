import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, createUser, type TestUser } from '../helpers';

let user: TestUser;

beforeEach(async () => {
  user = await createUser();
});

function createNote(body: Record<string, unknown>) {
  return request(app).post('/api/v1/notes').set('Authorization', user.authHeader).send(body);
}

describe('notes CRUD', () => {
  it('token’sız erişim 401 döner', async () => {
    expect((await request(app).get('/api/v1/notes')).status).toBe(401);
  });

  it('not oluşturur, varsayılanları uygular', async () => {
    const response = await createNote({ title: 'Ilk not' });

    expect(response.status).toBe(201);
    expect(response.body.data.title).toBe('Ilk not');
    expect(response.body.data.tags).toEqual([]);
    expect(response.body.data.isPinned).toBe(false);
  });

  it('userId yanıtta dönmez', async () => {
    const response = await createNote({ title: 'Gizli alan' });
    expect(response.body.data).not.toHaveProperty('userId');
    expect(response.body.data).not.toHaveProperty('_id');
    expect(response.body.data.id).toBeTruthy();
  });

  it('boş başlık reddedilir', async () => {
    const response = await createNote({ title: '' });
    expect(response.status).toBe(400);
  });

  it('etikete göre filtreler', async () => {
    await createNote({ title: 'Is notu', tags: ['is'] });
    await createNote({ title: 'Kisisel not', tags: ['kisisel'] });

    const response = await request(app)
      .get('/api/v1/notes?tag=is')
      .set('Authorization', user.authHeader);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].title).toBe('Is notu');
  });

  it('sayfalama meta bilgisi doğrudur', async () => {
    await Promise.all([1, 2, 3].map((n) => createNote({ title: `Not ${n}` })));

    const response = await request(app)
      .get('/api/v1/notes?page=1&limit=2')
      .set('Authorization', user.authHeader);

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
  });

  it('limit üst sınırı aşılamaz', async () => {
    const response = await request(app)
      .get('/api/v1/notes?limit=1000')
      .set('Authorization', user.authHeader);
    expect(response.status).toBe(400);
  });

  it('geçersiz id 400, olmayan kayıt 404 döner', async () => {
    const gecersiz = await request(app)
      .get('/api/v1/notes/abc')
      .set('Authorization', user.authHeader);
    const olmayan = await request(app)
      .get('/api/v1/notes/000000000000000000000000')
      .set('Authorization', user.authHeader);

    expect(gecersiz.status).toBe(400);
    expect(olmayan.status).toBe(404);
  });

  it('boş gövdeyle güncelleme reddedilir', async () => {
    const { body } = await createNote({ title: 'Guncellenecek' });

    const response = await request(app)
      .patch(`/api/v1/notes/${body.data.id}`)
      .set('Authorization', user.authHeader)
      .send({});

    expect(response.status).toBe(400);
  });

  it('günceller ve siler', async () => {
    const { body } = await createNote({ title: 'Silinecek' });
    const id = body.data.id;

    const guncelle = await request(app)
      .patch(`/api/v1/notes/${id}`)
      .set('Authorization', user.authHeader)
      .send({ isPinned: true });
    expect(guncelle.body.data.isPinned).toBe(true);

    expect(
      (await request(app).delete(`/api/v1/notes/${id}`).set('Authorization', user.authHeader))
        .status,
    ).toBe(204);

    expect(
      (await request(app).get(`/api/v1/notes/${id}`).set('Authorization', user.authHeader)).status,
    ).toBe(404);
  });

  it('olmayan etkinliğe bağlanamaz', async () => {
    const response = await createNote({
      title: 'Hayali etkinlik',
      eventId: '000000000000000000000000',
    });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].field).toBe('eventId');
  });
});

describe('notes sahiplik kontrolü', () => {
  // 403 değil 404: kaydın var olduğu bilgisi bile sızdırılmaz.
  it('başkasının notuna erişim 404 döner ve listede görünmez', async () => {
    const { body } = await createNote({ title: 'Benim notum' });
    const baskasi = await createUser();

    const tekKayit = await request(app)
      .get(`/api/v1/notes/${body.data.id}`)
      .set('Authorization', baskasi.authHeader);
    const liste = await request(app).get('/api/v1/notes').set('Authorization', baskasi.authHeader);

    expect(tekKayit.status).toBe(404);
    expect(liste.body.meta.total).toBe(0);
  });

  it('başkasının notu silinemez', async () => {
    const { body } = await createNote({ title: 'Korunan' });
    const baskasi = await createUser();

    const response = await request(app)
      .delete(`/api/v1/notes/${body.data.id}`)
      .set('Authorization', baskasi.authHeader);

    expect(response.status).toBe(404);
  });
});
