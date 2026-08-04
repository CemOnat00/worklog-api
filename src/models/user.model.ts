import { Schema, model } from 'mongoose';
import { baseSchemaOptions } from './common';

export interface IUser {
  email: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'E-posta zorunludur'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Geçerli bir e-posta adresi giriniz'],
    },

    // select: false -> normal sorgularda dönmez.
    // Login'de bilerek istenir: .select('+passwordHash')
    passwordHash: {
      type: String,
      required: [true, 'Parola zorunludur'],
      select: false,
    },

    name: {
      type: String,
      required: [true, 'İsim zorunludur'],
      trim: true,
      minlength: [2, 'İsim en az 2 karakter olmalıdır'],
      maxlength: [60, 'İsim en fazla 60 karakter olabilir'],
    },
  },
  baseSchemaOptions,
);

export const User = model<IUser>('User', userSchema);
