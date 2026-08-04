import { z } from 'zod';

// bcrypt girdinin ilk 72 baytını kullanır; daha uzunu sessizce kırpılır.
// Kullanıcıyı yanıltmamak için üst sınırı burada uyguluyoruz.
const MAX_PASSWORD_LENGTH = 72;

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'E-posta zorunludur' })
    .trim()
    .toLowerCase()
    .email('Geçerli bir e-posta adresi giriniz'),

  password: z
    .string({ required_error: 'Parola zorunludur' })
    .min(8, 'Parola en az 8 karakter olmalıdır')
    .max(MAX_PASSWORD_LENGTH, `Parola en fazla ${MAX_PASSWORD_LENGTH} karakter olabilir`),

  name: z
    .string({ required_error: 'İsim zorunludur' })
    .trim()
    .min(2, 'İsim en az 2 karakter olmalıdır')
    .max(60, 'İsim en fazla 60 karakter olabilir'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'E-posta zorunludur' })
    .trim()
    .toLowerCase()
    .email('Geçerli bir e-posta adresi giriniz'),

  // Girişte uzunluk kuralı uygulanmaz: mevcut parolalar farklı kurallarla
  // oluşturulmuş olabilir ve hata mesajı parola politikasını sızdırmamalı.
  password: z.string({ required_error: 'Parola zorunludur' }).min(1, 'Parola zorunludur'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
