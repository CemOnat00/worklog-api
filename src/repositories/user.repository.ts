import { User } from '../models';

/**
 * Repository katmanı — Mongoose sorguları YALNIZCA burada.
 * Service katmanı bu fonksiyonları çağırır, Mongoose'u hiç görmez.
 */
export const userRepository = {
  findById(id: string) {
    return User.findById(id).exec();
  },

  findByEmail(email: string) {
    return User.findOne({ email }).exec();
  },

  /**
   * passwordHash şemada `select: false` olduğu için normal sorgularda dönmez.
   * Yalnızca login akışında, bilerek istenir.
   */
  findByEmailWithPassword(email: string) {
    return User.findOne({ email }).select('+passwordHash').exec();
  },

  async existsByEmail(email: string): Promise<boolean> {
    return (await User.exists({ email }).exec()) !== null;
  },

  create(data: { email: string; passwordHash: string; name: string }) {
    return User.create(data);
  },
};
