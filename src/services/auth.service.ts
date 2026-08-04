import bcrypt from 'bcryptjs';
import { userRepository } from '../repositories/user.repository';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/httpErrors';
import { signAccessToken } from '../utils/jwt';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

/**
 * Maliyet katsayısı. 10 → 2^10 tur. Tek hash ~100 ms sürer.
 * Kullanıcı için fark edilmez, kaba kuvvet saldırısı için yıkıcıdır.
 */
const BCRYPT_ROUNDS = 10;

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  user: PublicUser;
  token: string;
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthResult> {
    if (await userRepository.existsByEmail(input.email)) {
      throw new ConflictError('Bu e-posta adresi zaten kayıtlı');
    }

    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    return {
      user: user.toJSON() as unknown as PublicUser,
      token: signAccessToken({ sub: user._id.toString(), email: user.email }),
    };
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await userRepository.findByEmailWithPassword(input.email);

    // Kullanıcı yok ile parola yanlış AYNI mesajı döner.
    // Farklı mesaj verseydik saldırgan hangi e-postaların kayıtlı olduğunu
    // tek tek öğrenebilirdi (user enumeration).
    if (!user) {
      throw new UnauthorizedError('E-posta veya parola hatalı');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError('E-posta veya parola hatalı');
    }

    return {
      user: user.toJSON() as unknown as PublicUser,
      token: signAccessToken({ sub: user._id.toString(), email: user.email }),
    };
  },

  async getById(userId: string): Promise<PublicUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('Kullanıcı');
    }
    return user.toJSON() as unknown as PublicUser;
  },
};
