import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, createUser } from '../helpers';

describe('POST /auth/register', () => {
  it('kullanıcı oluşturur ve token döner', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'yeni@test.com', password: 'parola1234', name: 'Yeni' });

    expect(response.status).toBe(201);
    expect(response.body.data.token).toBeTruthy();
    expect(response.body.data.user.email).toBe('yeni@test.com');
  });

  it('parola hash’i yanıtta dönmez', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'gizli@test.com', password: 'parola1234', name: 'Gizli' });

    expect(response.body.data.user).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(response.body)).not.toContain('parola1234');
  });

  it('aynı e-posta ile ikinci kayıt 409 döner', async () => {
    const payload = { email: 'tekrar@test.com', password: 'parola1234', name: 'Tekrar' };
    await request(app).post('/api/v1/auth/register').send(payload);

    const response = await request(app).post('/api/v1/auth/register').send(payload);
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('CONFLICT');
  });

  it('hatalı girdide tüm alan hatalarını birden döner', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'gecersiz', password: '123', name: 'A' });

    expect(response.status).toBe(400);
    const fields = response.body.error.details.map((d: { field: string }) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['email', 'password', 'name']));
  });

  it('e-posta küçük harfe çevrilir', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'BuYuK@Test.COM', password: 'parola1234', name: 'Buyuk' });

    expect(response.body.data.user.email).toBe('buyuk@test.com');
  });
});

describe('POST /auth/login', () => {
  it('doğru bilgilerle token döner', async () => {
    await createUser({ email: 'giris@test.com' });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'giris@test.com', password: 'parola1234' });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBeTruthy();
  });

  // Kullanıcı yok ile parola yanlış AYNI mesajı döner.
  // Farklı olsaydı saldırgan hangi e-postaların kayıtlı olduğunu öğrenirdi.
  it('yanlış parola ve olmayan kullanıcı aynı mesajı döner', async () => {
    await createUser({ email: 'sabit@test.com' });

    const yanlisParola = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'sabit@test.com', password: 'yanlisparola' });

    const olmayanKullanici = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'hicyok@test.com', password: 'parola1234' });

    expect(yanlisParola.status).toBe(401);
    expect(olmayanKullanici.status).toBe(401);
    expect(yanlisParola.body.error.message).toBe(olmayanKullanici.body.error.message);
  });
});

describe('GET /auth/me', () => {
  it('token’sız istek 401 döner', async () => {
    const response = await request(app).get('/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('bozuk token 401 döner', async () => {
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer sacmasapan');
    expect(response.status).toBe(401);
  });

  it('Bearer öneki olmadan 401 döner', async () => {
    const user = await createUser();
    const response = await request(app).get('/api/v1/auth/me').set('Authorization', user.token);
    expect(response.status).toBe(401);
  });

  it('geçerli token ile kullanıcı bilgisi döner', async () => {
    const user = await createUser();
    const response = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', user.authHeader);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(user.id);
    expect(response.body.data).not.toHaveProperty('passwordHash');
  });
});
