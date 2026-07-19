/**
 * AUTOVERSE — Sell / Listing Creation Routes
 *
 * POST  /api/v1/listings                          → create draft
 * POST  /api/v1/listings/:vehicleId/photos-and-inspect  → upload gallery photos, optionally run AutoInspect
 * PATCH /api/v1/listings/:vehicleId                → update details (make/model/price/etc)
 * GET   /api/v1/listings/:vehicleId/publish-check   → check what's missing before publish
 * POST  /api/v1/listings/:vehicleId/publish         → validate + go live
 * GET   /api/v1/listings/:vehicleId                → fetch current draft/listing state
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { listingService } from '../services/listingService';
import { requireAuth } from '../middleware/requireAuth';
import { handleRouteError } from '../utils/httpError';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
});

router.post('/api/v1/listings', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await listingService.createDraft({ userId: req.user!.id, role: req.user!.role });
    return res.status(201).json(result);
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/listings/:vehicleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const draft = await listingService.getDraft(req.params.vehicleId, {
      userId: req.user!.id,
      role: req.user!.role,
    });
    return res.json({ listing: draft });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const photosBodySchema = z.object({
  angles: z.array(z.string()).optional().default([]),
  triggerInspection: z.coerce.boolean().optional().default(true),
  declaredYear: z.coerce.number().int().min(1980).max(2030).optional(),
  declaredMake: z.string().max(50).optional(),
  declaredModel: z.string().max(50).optional(),
  declaredMileageKm: z.coerce.number().int().positive().optional(),
});

router.post(
  '/api/v1/listings/:vehicleId/photos-and-inspect',
  requireAuth,
  upload.array('photos', 12),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'At least one photo is required.' });
      }

      const parsed = photosBodySchema.safeParse({
        ...req.body,
        angles: Array.isArray(req.body.angles)
          ? req.body.angles
          : req.body.angles
          ? [req.body.angles]
          : [],
      });
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      const photos = files.map((file, i) => ({
        angle: (parsed.data.angles[i] as any) || null,
        buffer: file.buffer,
        mimeType: file.mimetype,
      }));

      const result = await listingService.attachPhotosAndInspect(
        req.params.vehicleId,
        { userId: req.user!.id, role: req.user!.role },
        photos,
        {
          year: parsed.data.declaredYear,
          make: parsed.data.declaredMake,
          model: parsed.data.declaredModel,
          mileageKm: parsed.data.declaredMileageKm,
        },
        parsed.data.triggerInspection
      );

      return res.status(201).json(result);
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

const updateDetailsSchema = z.object({
  make: z.string().min(1).max(50).optional(),
  model: z.string().min(1).max(50).optional(),
  year: z.coerce.number().int().min(1980).max(2030).optional(),
  mileageKm: z.coerce.number().int().min(0).optional(),
  priceNGN: z.coerce.number().int().positive().optional(),
  description: z.string().max(2000).optional(),
  transmission: z.enum(['automatic', 'manual']).optional(),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric']).optional(),
  state: z.string().max(50).optional(),
  lga: z.string().max(50).optional(),
});

router.patch('/api/v1/listings/:vehicleId', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateDetailsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    }
    const draft = await listingService.updateDetails(
      req.params.vehicleId,
      { userId: req.user!.id, role: req.user!.role },
      parsed.data
    );
    return res.json({ listing: draft });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get(
  '/api/v1/listings/:vehicleId/publish-check',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const result = await listingService.validateForPublish(req.params.vehicleId);
      return res.json(result);
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

router.post('/api/v1/listings/:vehicleId/publish', requireAuth, async (req: Request, res: Response) => {
  try {
    const draft = await listingService.publish(req.params.vehicleId, {
      userId: req.user!.id,
      role: req.user!.role,
    });
    return res.json({ listing: draft });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

export default router;
