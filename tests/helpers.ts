import request from 'supertest';
import { createApp } from '../src/app';

/** Port dinlemeyen Express uygulaması — app.ts / server.ts ayrımının karşılığı */
export const app = createApp();

export const JSON_HEADER = ['Content-Type', 'application/json'] as const;

export interface TestUser {
  token: string;
  authHeader: string;
  id: string;
  email: string;
}

let counter = 0;

/** Her çağrıda benzersiz e-posta ile yeni kullanıcı oluşturur */
export async function createUser(overrides: { email?: string } = {}): Promise<TestUser> {
  counter += 1;
  const email = overrides.email ?? `kullanici${counter}@test.com`;

  const response = await request(app)
    .post('/api/v1/auth/register')
    .send({ email, password: 'parola1234', name: 'Test Kullanici' });

  const token = response.body.data.token as string;

  return {
    token,
    authHeader: `Bearer ${token}`,
    id: response.body.data.user.id as string,
    email,
  };
}

export function isoDate(day: string, time = '00:00:00'): string {
  return `${day}T${time}.000Z`;
}
