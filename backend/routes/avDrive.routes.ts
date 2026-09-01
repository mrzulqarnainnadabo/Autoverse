/**
 * AUTOVERSE — AV Drive Routes
 *
 * Profile / availability / partners / jobs / signals / location / contact
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { avDriveService } from '../services/avDriveService';
import { requireAuth } from '../middleware/requireAuth';
import { handleRouteError } from '../utils/httpError';

const router = Router();

const cityEnum = z.enum(['Abuja', 'Kaduna']);
const jobTypeEnum = z.enum(['airport_transfer', 'intercity']);
const signalEnum = z.enum([
  'owner_on_the_way',
  'owner_arrived',
  'client_ready',
  'trip_started',
  'trip_completed',
]);

const upsertProfileSchema = z.object({
  vehicleId: z.string().uuid().nullable().optional(),
  homeCity: cityEnum,
  jobTypes: z.array(jobTypeEnum).min(1),
  bio: z.string().max(500).nullable().optional(),
});

router.post('/api/v1/av-drive/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = upsertProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid profile', details: parsed.error.flatten() });
    }
    const profile = await avDriveService.upsertProfile(req.user!.id, parsed.data);
    return res.json({ profile });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/av-drive/profile/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await avDriveService.getMyProfile(req.user!.id);
    return res.json({ profile });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const availabilitySchema = z.object({
  isAvailable: z.boolean(),
  availableFrom: z.string().nullable().optional(),
  availableTo: z.string().nullable().optional(),
});

router.post('/api/v1/av-drive/availability', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = availabilitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid availability', details: parsed.error.flatten() });
    }
    const profile = await avDriveService.setAvailability(req.user!.id, parsed.data);
    return res.json({ profile });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/av-drive/partners', requireAuth, async (req: Request, res: Response) => {
  try {
    const city = typeof req.query.city === 'string' ? cityEnum.parse(req.query.city) : undefined;
    const jobType =
      typeof req.query.jobType === 'string' ? jobTypeEnum.parse(req.query.jobType) : undefined;
    const partners = await avDriveService.listPartners({ city, jobType });
    return res.json({ partners });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const createJobSchema = z.object({
  jobType: jobTypeEnum,
  city: cityEnum.nullable().optional(),
  corridor: z.string().max(64).nullable().optional(),
  pickupLabel: z.string().min(1).max(200),
  dropoffLabel: z.string().min(1).max(200),
  pickupLat: z.number().nullable().optional(),
  pickupLng: z.number().nullable().optional(),
  dropoffLat: z.number().nullable().optional(),
  dropoffLng: z.number().nullable().optional(),
  scheduledAt: z.string().datetime(),
  notes: z.string().max(1000).nullable().optional(),
  priceNgn: z.number().int().positive().nullable().optional(),
  preferredProfileId: z.string().uuid().nullable().optional(),
});

router.post('/api/v1/av-drive/jobs', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid job', details: parsed.error.flatten() });
    }
    const job = await avDriveService.createJob(req.user!.id, parsed.data);
    return res.status(201).json({ job });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/av-drive/jobs/mine', requireAuth, async (req: Request, res: Response) => {
  try {
    const jobs = await avDriveService.listMyJobs(req.user!.id);
    return res.json({ jobs });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/av-drive/jobs/:jobId', requireAuth, async (req: Request, res: Response) => {
  try {
    const job = await avDriveService.getJob(req.params.jobId, req.user!.id);
    return res.json({ job });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.post('/api/v1/av-drive/jobs/:jobId/accept', requireAuth, async (req: Request, res: Response) => {
  try {
    const job = await avDriveService.acceptJob(req.params.jobId, req.user!.id);
    return res.json({ job });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const signalSchema = z.object({
  signal: signalEnum,
  lat: z.number().optional(),
  lng: z.number().optional(),
});

router.post('/api/v1/av-drive/jobs/:jobId/signal', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = signalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid signal', details: parsed.error.flatten() });
    }
    const job = await avDriveService.signal(req.params.jobId, req.user!.id, parsed.data.signal, {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    });
    return res.json({ job });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.post('/api/v1/av-drive/jobs/:jobId/complete', requireAuth, async (req: Request, res: Response) => {
  try {
    const job = await avDriveService.completeJob(req.params.jobId, req.user!.id);
    return res.json({ job });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

router.post('/api/v1/av-drive/jobs/:jobId/cancel', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = cancelSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid cancel body', details: parsed.error.flatten() });
    }
    const job = await avDriveService.cancelJob(req.params.jobId, req.user!.id, parsed.data.reason);
    return res.json({ job });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const rateSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(500).nullable().optional(),
});

router.post('/api/v1/av-drive/jobs/:jobId/rate', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = rateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid rating', details: parsed.error.flatten() });
    }
    const rating = await avDriveService.rateJob(req.params.jobId, req.user!.id, parsed.data);
    return res.status(201).json({ rating });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyM: z.number().nullable().optional(),
});

router.post('/api/v1/av-drive/jobs/:jobId/location', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = locationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid location', details: parsed.error.flatten() });
    }
    await avDriveService.postLocation(req.params.jobId, req.user!.id, parsed.data);
    return res.status(204).send();
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/av-drive/jobs/:jobId/events', requireAuth, async (req: Request, res: Response) => {
  try {
    const events = await avDriveService.listEvents(req.params.jobId, req.user!.id);
    return res.json({ events });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.get('/api/v1/av-drive/jobs/:jobId/contact', requireAuth, async (req: Request, res: Response) => {
  try {
    const contact = await avDriveService.getJobContact(req.params.jobId, req.user!.id);
    return res.json({ contact });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

export default router;
