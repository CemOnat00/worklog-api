import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],

    /**
     * Test DOSYALARI sırayla çalışır, paralel değil.
     *
     * Sebep: hepsi aynı veritabanını kullanıyor ve her testten sonra
     * koleksiyonlar temizleniyor. Paralel çalıştıklarında birbirlerinin
     * verisini siliyorlar — testler kararsız hale geliyor.
     *
     * Not: Vitest 4'te `poolOptions` kaldırıldı, ayarlar üst seviyeye taşındı.
     */
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,

    testTimeout: 20_000,
    hookTimeout: 20_000,
    restoreMocks: true,
  },
});
