import { createHash } from 'node:crypto';
import mongoose from 'mongoose';
import { Admin } from './admin.model.js';

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export const Session = mongoose.model('Session', new mongoose.Schema({
  _id: { type: String, required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: Admin.modelName, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, { collection: 'admin_sessions', versionKey: false }));
