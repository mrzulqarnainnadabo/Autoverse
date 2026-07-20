/**
 * AUTOVERSE — Dealer Verification Routes
 *
 * POST /api/v1/dealers/:dealerId/verification         → dealer submits (or resubmits) KYC documents
 * GET  /api/v1/dealers/:dealerId/verification          → dealer/admin views latest submission status
 * GET  /api/v1/admin/verification-queue                 → admin: pending submissions
 * GET  /api/v1/admin/verification/:submissionId          → admin: full submission + signed doc URLs
 * POST /api/v1/admin/verification/:submissionId/review    → admin: approve or reject
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { verificationService } from '../services/verificationService';
import { requireAuth } from '../middleware/requireAuth';
import { requireOwnDealerIdOrAdmin, requireRole } from '../middleware/requireRole';
import { handleRouteError } from '../utils/httpError';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 2 }, // documents may be scanned PDFs — a bit larger than a photo
});

const submitSchema = z.object({
  idDocumentType: z.enum(['nin', 'drivers_license', 'international_passport', 'voters_card']),
  businessAddress: z.string().min(5).max(300),
});

router.post(
  '/api/v1/dealers/:dealerId/verification',
  requireAuth,
  requireOwnDealerIdOrAdmin,
  upload.fields([{ name: 'cacDocument', maxCount: 1 }, { name: 'idDocument', maxCount: 1 }]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as { [field: string]: Express.Multer.File[] } | undefined;
      const cacFile = files?.cacDocument?.[0];
      const idFile = files?.idDocument?.[0];
      if (!cacFile || !idFile) {
        return res.status(400).json({ error: 'Both a CAC document and a government ID are required.' });
      }

      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid submission', details: parsed.error.flatten() });
      }

      const submission = await verificationService.submit(req.params.dealerId, {
        cacDocumentBuffer: cacFile.buffer,
        cacDocumentMimeType: cacFile.mimetype,
        idDocumentBuffer: idFile.buffer,
        idDocumentMimeType: idFile.mimetype,
        idDocumentType: parsed.data.idDocumentType,
        businessAddress: parsed.data.businessAddress,
      });

      return res.status(201).json({ submission });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

router.get(
  '/api/v1/dealers/:dealerId/verification',
  requireAuth,
  requireOwnDealerIdOrAdmin,
  async (req: Request, res: Response) => {
    try {
      const submission = await verificationService.getLatestForDealer(req.params.dealerId);
      return res.json({ submission });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

router.get(
  '/api/v1/admin/verification-queue',
  requireAuth,
  requireRole('admin'),
  async (_req: Request, res: Response) => {
    try {
      const queue = await verificationService.listPendingQueue();
      return res.json({ queue });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

router.get(
  '/api/v1/admin/verification/:submissionId',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const submission = await verificationService.getSubmissionForReview(req.params.submissionId);
      return res.json({ submission });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

const reviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  notes: z.string().max(1000).optional(),
});

router.post(
  '/api/v1/admin/verification/:submissionId/review',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid review decision', details: parsed.error.flatten() });
      }
      if (parsed.data.decision === 'rejected' && !parsed.data.notes) {
        return res.status(400).json({ error: 'A reason is required when rejecting a submission.' });
      }

      const submission = await verificationService.review(
        req.params.submissionId,
        req.user!.id,
        parsed.data
      );
      return res.json({ submission });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

export default router;
