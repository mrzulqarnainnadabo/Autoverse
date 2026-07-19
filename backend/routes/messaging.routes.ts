/**
 * AUTOVERSE — Messaging Routes
 *
 * GET  /api/v1/conversations                       → inbox (all threads for the current user)
 * POST /api/v1/vehicles/:vehicleId/conversations    → get-or-create a thread with a listing's seller
 * GET  /api/v1/conversations/:conversationId        → thread detail (vehicle context + participant)
 * GET  /api/v1/conversations/:conversationId/messages → paginated message history
 * POST /api/v1/conversations/:conversationId/messages → send a message
 * POST /api/v1/conversations/:conversationId/read     → mark all inbound messages as read
 *
 * Everything here requires auth — messaging has no anonymous/public path.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { messagingService } from '../services/messagingService';
import { requireAuth } from '../middleware/requireAuth';
import { handleRouteError } from '../utils/httpError';

const router = Router();

router.get('/api/v1/conversations', requireAuth, async (req: Request, res: Response) => {
  try {
    const conversations = await messagingService.listConversationsForUser(req.user!.id);
    return res.json({ conversations });
  } catch (err) {
    return handleRouteError(err, res);
  }
});

router.post(
  '/api/v1/vehicles/:vehicleId/conversations',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const conversation = await messagingService.getOrCreateConversation(
        req.params.vehicleId,
        req.user!.id
      );
      return res.status(201).json({ conversationId: conversation.id });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

router.get(
  '/api/v1/conversations/:conversationId',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const conversation = await messagingService.getConversation(req.params.conversationId, req.user!.id);
      return res.json({ conversation });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

const messagesQuerySchema = z.object({
  before: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

router.get(
  '/api/v1/conversations/:conversationId/messages',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const parsed = messagesQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid query params', details: parsed.error.flatten() });
      }
      const messages = await messagingService.getMessages(
        req.params.conversationId,
        req.user!.id,
        parsed.data
      );
      return res.json({ messages });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

const sendMessageSchema = z.object({
  body: z.string().min(1).max(2000),
});

router.post(
  '/api/v1/conversations/:conversationId/messages',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const parsed = sendMessageSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'Invalid message', details: parsed.error.flatten() });
      }
      const message = await messagingService.sendMessage(
        req.params.conversationId,
        req.user!.id,
        parsed.data.body
      );
      return res.status(201).json({ message });
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

router.post(
  '/api/v1/conversations/:conversationId/read',
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      await messagingService.markAsRead(req.params.conversationId, req.user!.id);
      return res.status(204).send();
    } catch (err) {
      return handleRouteError(err, res);
    }
  }
);

export default router;
