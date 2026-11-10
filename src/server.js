import express from 'express';
import { connectDatabase } from './config/database.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.disable('x-powered-by');

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

async function start() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const connection = await connectDatabase();

  app.listen(port, async (error) => {
    if (error) {
      console.error(`Could not start the API on port ${port} (${error.code}).`);
      process.exitCode = 1;
      await connection.close();
      return;
    }
    console.log(`Server is running on https://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
