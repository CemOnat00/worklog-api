import './env';

import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import '../src/models';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGO_URI as string);
});

/**
 * Her testten sonra tüm koleksiyonlar boşaltılır.
 * Testler birbirinin verisine bağımlı olmamalı — sıraları değişse de
 * aynı sonucu vermeliler.
 */
afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
