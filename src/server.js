import express from 'express';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.disable('x-powered-by');

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on https://localhost:${port}`);
});
