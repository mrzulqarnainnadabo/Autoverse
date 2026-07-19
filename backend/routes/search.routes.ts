/**
 * AUTOVERSE — Buyer-facing Search & Detail Routes
 *
 * GET  /api/v1/listings/search              → filtered/sorted/paginated results (public, no auth)
 * GET  /api/v1/listings/:vehicleId/public    → full detail page payload (public, no auth)
 * POST /api/v1/listings/:vehicleId/inquiries → buyer messages the dealer (requires auth)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { searchService } from '../services/searchService';
import { publicListingService } from '../services/publicListingService';
import { handleRouteError } from '../utils/httpError';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().max(100).optional(),
  make: z.string().max(50).optional(),
  yearMin: z.coerce.number().int().min(1980).max(2030).optional(),
  yearMax: z.coerce.number().int().min(1980).max(2030).optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  state: z.string().max(50).optional(),
  condition: z.enum(['excellent', 'good', 'fair', 'any']).optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'ai_score']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

// Public — no auth required, this is the browse/discovery surface.
router.get('/api/v1/listings/search', async (req: Request, res: Response) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid search parameters', details: parsed.error.flatten() });
    }
    const result = await searchService.search(parsed.data);
    return res.json(result);
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/listings/:vehicleId/public', async (req: Request, res: Response) => {
  try {
    const detail = await publicListingService.getDetail(req.params.vehicleId);
    return res.json({ listing: detail });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const inquirySchema = z.object({
  message: z.string().min(1).max(1000),
  buyerName: z.string().min(1).max(100),
  buyerPhone: z.string().min(7).max(20),
});

router.post(
  '/api/v1/listings/:vehicleId/inquiries',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const parsed = inquirySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid inquiry', details: parsed.error.flatten() });
      }
      const result = await publicListingService.createInquiry(
        req.params.vehicleId,
        req.user!.id,
        parsed.data
      );
      return res.status(201).json(result);
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

export default router;
