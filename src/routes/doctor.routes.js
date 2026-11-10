import { Router, json } from 'express';
import { createDoctor, listDoctors, getDoctorMeta } from '../controllers/doctor.controller.js';

export function createDoctorRouter() {
  const router = Router();

  router.get('/meta', getDoctorMeta);
  router.get('/', listDoctors);
  router.post('/', json(), createDoctor);

  router.use((error, _request, response, next) => {
    if (response.headersSent) return next(error);

    if (error.type === 'entity.parse.failed') {
      return response.status(400).json({ message: 'Request body must be valid JSON.' });
    }
    if (error.type === 'entity.too.large') {
      return response.status(413).json({ message: 'Request body is too large.' });
    }
    if (error.status === 415) {
      return response.status(415).json({ message: 'Unsupported request body encoding.' });
    }
    return response.status(500).json({ message: 'Unable to process the doctor request.' });
  });

  return router;
}
