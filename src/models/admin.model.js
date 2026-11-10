import mongoose from 'mongoose';

export const Admin = mongoose.model('Admin', new mongoose.Schema({
  email: { type: String, required: true, trim: true, lowercase: true, unique: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, default: 'admin' },
}, { collection: 'admins', versionKey: false }));
