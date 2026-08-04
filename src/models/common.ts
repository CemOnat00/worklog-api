/**
 * Dört modelin de kullandığı ortak şema ayarları.
 * - timestamps: createdAt / updatedAt otomatik yönetilir
 * - toJSON: _id -> id, __v ve passwordHash yanıttan çıkarılır
 *
 */
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.passwordHash;
      // Her kayıt zaten isteği yapan kullanıcıya ait; userId yanıtta gereksiz.
      delete ret.userId;
      return ret;
    },
  },
};

/** Etiket dizileri için ortak kural */
export const tagsField = {
  type: [String],
  default: [] as string[],
  validate: {
    validator: (v: string[]) => v.length <= 10,
    message: 'En fazla 10 etiket eklenebilir',
  },
};
