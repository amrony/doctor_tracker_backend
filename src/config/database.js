import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!mongoUri) {
    throw new Error('Set MONGODB_URI in .env or in the environment before starting the API.');
  }

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    await mongoose.connection.db.command({ ping: 1 });
  } catch (error) {
    await mongoose.connection.close();
    if (error.name === 'MongoParseError' || error.name === 'MongoInvalidArgumentError') {
      throw new Error('MONGODB_URI is invalid. Use a valid mongodb:// or mongodb+srv:// connection string.');
    }
    throw new Error(`MongoDB connection failed (${error.name}). Check MONGODB_URI and make sure the database is reachable.`);
  }

  return mongoose.connection;
}
