import express from 'express';
import { connectDatabase } from './config/database.js';
import { requireAdmin } from './middleware/require-admin.js';
import { Admin } from './models/admin.model.js';
import { Doctor } from './models/doctor.model.js';
import { Patient } from './models/patient.model.js';
import { Session } from './models/session.model.js';
import { authRouter } from './routes/auth.routes.js';
import { createDoctorRouter } from './routes/doctor.routes.js';
import { createPatientsRouter } from './routes/patients.routes.js';
import { createDashboardRouter } from './routes/dashboard.routes.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.disable('x-powered-by');

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
app.use('/api', (request, response, next) => {
  response.set('Cache-Control', 'no-store');
  const site = request.get('Sec-Fetch-Site');
  if (!safeMethods.has(request.method) && (site === 'cross-site' || site === 'same-site')) {
    return response.status(403).json({ message: 'Use the application origin for this request.' });
  }
  return next();
});

app.use('/api/auth', authRouter);
app.use('/api', requireAdmin);
app.use('/api/dashboard', createDashboardRouter());
app.use('/api/doctors', createDoctorRouter());
app.use('/api/patients', createPatientsRouter());

app.use((error, _request, response, next) => {
  if (response.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') return response.status(400).json({ message: 'Request body must be valid JSON.' });
  if (error.type === 'entity.too.large') return response.status(413).json({ message: 'Request body is too large.' });
  if (error.status === 415) return response.status(415).json({ message: 'Unsupported request body encoding.' });
  return response.status(500).json({ message: 'Unable to process the request.' });
});

async function start() {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const connection = await connectDatabase();
  try {
    await Promise.all([Admin.init(), Doctor.init(), Patient.init(), Session.init()]);
  } catch {
    await connection.close();
    throw new Error('Unable to initialize application storage and indexes. Check MongoDB permissions.');
  }

  app.listen(port, async (error) => {
    if (error) {
      console.error(`Could not start the API on port ${port} (${error.code}).`);
      process.exitCode = 1;
      await connection.close();
      return;
    }
    console.log(`Doctor Tracker API listening on port ${port}.`);
  });
}

start().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
