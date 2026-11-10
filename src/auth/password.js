import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const deriveKey = promisify(scrypt);
const parameters = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const dummySalt = Buffer.alloc(16);
const dummyKey = Buffer.alloc(64);

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt, 64, parameters);
  return `${salt.toString('hex')}:${key.toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, expected] = storedHash
    ? storedHash.split(':').map(value => Buffer.from(value, 'hex'))
    : [dummySalt, dummyKey];
  const key = await deriveKey(password, salt, 64, parameters);
  return expected.length === key.length && timingSafeEqual(expected, key);
}
