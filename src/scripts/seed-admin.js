import { hashPassword } from '../auth/password.js';
import { connectDatabase } from '../config/database.js';
import { Admin } from '../models/admin.model.js';

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid email address.');
  }
  if (!password || password.trim().length < 6 || password.length > 100) {
    throw new Error('Set ADMIN_PASSWORD to a password with 6–100 characters.');
  }

  const connection = await connectDatabase();
  try {
    await Admin.init();
    const result = await Admin.updateOne(
      { email },
      { $setOnInsert: { email, passwordHash: await hashPassword(password), role: 'admin' } },
      { upsert: true },
    );
    console.log(result.upsertedCount ? 'Admin account created.' : 'An account already exists for that email.');
  } finally {
    await connection.close();
  }
}

seedAdmin().catch(error => {
  console.error(error instanceof Error && error.message.startsWith('Set ADMIN_')
    ? error.message
    : 'Admin seed failed. Check the database connection and permissions.');
  process.exitCode = 1;
});
