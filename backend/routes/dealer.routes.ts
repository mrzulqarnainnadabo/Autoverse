/**
 * AUTOVERSE — Dealer Dashboard Routes
 *
 * GET /api/v1/dealers/:dealerId/dashboard    → summary + listings + recent inquiries (single call)
 * GET /api/v1/dealers/:dealerId/listings     → paginated listings, filterable by status
 * GET /api/v1/dealers/:dealerId/inquiries    → recent inquiries
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { dealerDashboardService } from '../services/dealerDashboardService';
import { requireAuth } from '../middleware/requireAuth';
import { requireOwnDealerIdOrAdmin } from '../middleware/requireRole';

const router = Router();

router.get(
  '/api/v1/dealers/:dealerId/dashboard',
  requireAuth,
  requireOwnDealerIdOrAdmin,
  async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    const dashboard = await dealerDashboardService.getDashboard(dealerId);
    if (!dashboard) {
      return res.status(404).json({ error: 'Dealer not found.' });
    }
    return res.json(dashboard);
  }
);

const listingsQuerySchema = z.object({
  status: z.enum(['draft', 'active', 'sold', 'archived']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

router.get(
  '/api/v1/dealers/:dealerId/listings',
  requireAuth,
  requireOwnDealerIdOrAdmin,
  async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    const parsed = listingsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
    }
    const listings = await dealerDashboardService.getListings(dealerId, parsed.data);
    return res.json({ listings });
  }
);

router.get(
  '/api/v1/dealers/:dealerId/inquiries',
  requireAuth,
  requireOwnDealerIdOrAdmin,
  async (req: Request, res: Response) => {
    const { dealerId } = req.params;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const inquiries = await dealerDashboardService.getRecentInquiries(dealerId, limit);
    return res.json({ inquiries });
  }
);

export default router;
