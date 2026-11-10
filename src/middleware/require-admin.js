import { parseCookie } from 'cookie';
import { Admin } from '../models/admin.model.js';
import { Session, hashSessionToken } from '../models/session.model.js';

export const sessionCookieName = process.env.NODE_ENV === 'production'
  ? '__Host-doctor_tracker_session'
  : 'doctor_tracker_session';

export async function requireAdmin(request, response, next) {
  const token = parseCookie(request.get('cookie') ?? '')[sessionCookieName];
  const session = /^[0-9a-f]{64}$/.test(token ?? '')
    ? await Session.findOne({ _id: hashSessionToken(token), expiresAt: { $gt: new Date() } }).lean()
    : null;
  const admin = session ? await Admin.findById(session.adminId).select('email role').lean() : null;

  if (!admin) return response.status(401).json({ message: 'Sign in again to continue.' });
  if (admin.role !== 'admin') return response.status(403).json({ message: 'Admin access is required.' });

  request.auth = { admin, sessionId: session._id };
  return next();
}
