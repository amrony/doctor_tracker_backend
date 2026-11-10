import { MongoClient } from 'mongodb';

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error('Set MONGODB_URI in .env or in the environment before starting the API.');
  }

  let client;
  try {
    client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  } catch {
    throw new Error('MONGODB_URI is invalid. Use a valid mongodb:// or mongodb+srv:// connection string.');
  }

  try {
    await client.db().command({ ping: 1 });
  } catch (error) {
    await client.close();
    throw new Error(`MongoDB connection failed (${error.name}). Check MONGODB_URI and make sure the database is reachable.`);
  }

  return client;
}
