import { randomBytes } from 'node:crypto';
import { verifyPassword } from '../auth/password.js';
import { sessionCookieName } from '../middleware/require-admin.js';
import { Admin } from '../models/admin.model.js';
import { Session, hashSessionToken } from '../models/session.model.js';

const sessionDurationMs = 8 * 60 * 60 * 1000;
const cookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export async function login(request, response) {
  const { email, password } = request.body ?? {};
  if (typeof email !== 'string' || !email.trim() || email.length > 254
    || typeof password !== 'string' || !password || password.length > 128) {
    return response.status(400).json({ message: 'Enter a valid email and password.' });
  }

  const admin = await Admin.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash').lean();
  const validPassword = await verifyPassword(password, admin?.passwordHash);
  if (!admin || !validPassword) return response.status(401).json({ message: 'Invalid email or password.' });
  if (admin.role !== 'admin') return response.status(403).json({ message: 'Admin access is required.' });

  const token = randomBytes(32).toString('hex');
  await Session.create({
    _id: hashSessionToken(token),
    adminId: admin._id,
    expiresAt: new Date(Date.now() + sessionDurationMs),
  });

  response.cookie(sessionCookieName, token, { ...cookieOptions, maxAge: sessionDurationMs });
  return response.json({ data: { _id: admin._id, email: admin.email, role: admin.role } });
}

export function currentAdmin(request, response) {
  return response.json({ data: request.auth.admin });
}

export async function logout(request, response) {
  await Session.deleteOne({ _id: request.auth.sessionId });
  return response.clearCookie(sessionCookieName, cookieOptions).status(204).end();
}
