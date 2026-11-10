import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/dashboard.controller.js';

export function createDashboardRouter() {
  const router = Router();
  router.get('/analytics', getDashboardAnalytics);
  return router;
}
