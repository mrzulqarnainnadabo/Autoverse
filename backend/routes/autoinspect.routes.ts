/**
 * AUTOVERSE — AutoInspect API Routes
 *
 * POST /api/v1/autoinspect            → submit photos, run analysis, persist report
 * GET  /api/v1/autoinspect/:reportId  → fetch a previously generated report
 * GET  /api/v1/vehicles/:vehicleId/inspections → list inspection history for a vehicle
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { claudeVisionService } from '../services/claudeVisionService';
import { saveAutoInspectReport } from '../services/autoinspectPersistence';
import { pool } from '../db/pool';
import { requireAuth } from '../middleware/requireAuth';
import { AutoInspectRequest, InspectionAngle } from '../types/autoinspect.types';

const router = Router();

// Photos arrive as multipart form-data (mobile clients upload compressed
// JPEGs). 8MB cap per image keeps mobile data costs sane for sellers on
// limited data plans while preserving enough resolution for defect detection.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
});

const submitSchema = z.object({
  vehicleId: z.string().uuid(),
  sellerId: z.string().uuid(),
  declaredMileageKm: z.coerce.number().int().positive().optional(),
  declaredYear: z.coerce.number().int().min(1980).max(2030).optional(),
  declaredMake: z.string().max(50).optional(),
  declaredModel: z.string().max(50).optional(),
  angles: z.array(z.string()).min(1), // parallel array matching uploaded files order
});

router.post(
  '/api/v1/autoinspect',
  requireAuth,
  upload.array('photos', 12),
  async (req: Request, res: Response) => {
    try {
      const parsed = submitSchema.safeParse({
        ...req.body,
        angles: Array.isArray(req.body.angles) ? req.body.angles : [req.body.angles],
      });

      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
      }

      const files = req.files as Express.Multer.File[] | undefined;
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'At least one photo is required.' });
      }
      if (files.length !== parsed.data.angles.length) {
        return res.status(400).json({ error: 'Photo count must match angle labels count.' });
      }

      const photos = files.map((file, i) => ({
        angle: parsed.data.angles[i] as InspectionAngle,
        base64: file.buffer.toString('base64'),
        mediaType: (file.mimetype as any) || 'image/jpeg',
      }));

      const autoInspectRequest: AutoInspectRequest = {
        vehicleId: parsed.data.vehicleId,
        sellerId: parsed.data.sellerId,
        declaredMileageKm: parsed.data.declaredMileageKm,
        declaredYear: parsed.data.declaredYear,
        declaredMake: parsed.data.declaredMake,
        declaredModel: parsed.data.declaredModel,
        photos,
      };

      const report = await claudeVisionService.analyzeVehicle(
        parsed.data.vehicleId,
        autoInspectRequest
      );

      await saveAutoInspectReport(report, parsed.data.sellerId);

      return res.status(201).json({ report });
    } catch (err: any) {
      console.error('[AutoInspect] submission failed:', err);
      return res.status(500).json({ error: 'AutoInspect analysis failed. Please retry.' });
    }
  }
);

router.get('/api/v1/autoinspect/:reportId', requireAuth, async (req: Request, res: Response) => {
  const { reportId } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM autoinspect_reports WHERE report_id = $1`,
    [reportId]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Report not found.' });
  return res.json({ report: rows[0] });
});

router.get(
  '/api/v1/vehicles/:vehicleId/inspections',
  requireAuth,
  async (req: Request, res: Response) => {
    const { vehicleId } = req.params;
    const { rows } = await pool.query(
      `SELECT report_id, overall_score, grade, confidence, created_at
       FROM autoinspect_reports
       WHERE vehicle_id = $1
       ORDER BY created_at DESC`,
      [vehicleId]
    );
    return res.json({ inspections: rows });
  }
);

export default router;
