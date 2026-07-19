/**
 * AUTOVERSE — Messaging Service
 *
 * Every read and write here runs through `assertParticipant`, which is
 * the single enforcement point standing in for the Row Level Security
 * policies documented (but not yet active) in db/messaging_schema.sql —
 * once auth moves to Supabase, those RLS policies become the real
 * boundary and this check becomes a defense-in-depth backstop rather
 * than the only guard.
 */

import { randomUUID } from 'crypto';
import { pool } from '../db/pool';
import { HttpError } from '../utils/httpError';
import {
  Message,
  ConversationSummary,
  ConversationDetail,
  SenderRole,
} from '../types/messaging.types';

interface ConversationRow {
  id: string;
  vehicle_id: string;
  buyer_id: string;
  dealer_id: string | null;
  seller_id: string | null;
  origin_inquiry_id: string | null;
  last_message_at: string;
  created_at: string;
}

class MessagingService {
  /**
   * Called from the "Message Dealer" flow on the car detail page.
   * Idempotent per (vehicleId, buyerId) thanks to the UNIQUE constraint —
   * repeated contact reuses the same thread.
   */
  async getOrCreateConversation(
    vehicleId: string,
    buyerId: string,
    originInquiryId?: string
  ): Promise<ConversationRow> {
    const { rows: existing } = await pool.query(
      `SELECT * FROM conversations WHERE vehicle_id = $1 AND buyer_id = $2`,
      [vehicleId, buyerId]
    );
    if (existing.length > 0) return existing[0];

    const { rows: vehicleRows } = await pool.query(
      `SELECT dealer_id, seller_id, status FROM vehicles WHERE id = $1`,
      [vehicleId]
    );
    if (vehicleRows.length === 0) throw new HttpError(404, 'Vehicle not found.');
    if (vehicleRows[0].status !== 'active') {
      throw new HttpError(400, 'This listing is no longer accepting messages.');
    }
    if (buyerId === vehicleRows[0].dealer_id || buyerId === vehicleRows[0].seller_id) {
      throw new HttpError(400, 'You cannot message your own listing.');
    }

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO conversations (id, vehicle_id, buyer_id, dealer_id, seller_id, origin_inquiry_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING *`,
      [id, vehicleId, buyerId, vehicleRows[0].dealer_id, vehicleRows[0].seller_id, originInquiryId ?? null]
    );
    return rows[0];
  }

  async sendMessage(conversationId: string, senderId: string, body: string): Promise<Message> {
    const conversation = await this.assertParticipant(conversationId, senderId);
    const senderRole = this.roleOf(conversation, senderId);

    const id = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `INSERT INTO messages (id, conversation_id, sender_id, sender_role, body)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [id, conversationId, senderId, senderRole, body]
      );
      await client.query(
        `UPDATE conversations SET last_message_at = now() WHERE id = $1`,
        [conversationId]
      );
      await client.query('COMMIT');
      return this.mapMessageRow(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getMessages(
    conversationId: string,
    userId: string,
    opts: { before?: string; limit?: number } = {}
  ): Promise<Message[]> {
    await this.assertParticipant(conversationId, userId);
    const limit = Math.min(opts.limit ?? 50, 100);

    const params: any[] = [conversationId];
    let beforeClause = '';
    if (opts.before) {
      params.push(opts.before);
      beforeClause = `AND created_at < $${params.length}`;
    }
    params.push(limit);

    const { rows } = await pool.query(
      `SELECT * FROM messages
       WHERE conversation_id = $1 ${beforeClause}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );

    return rows.map(this.mapMessageRow).reverse(); // chronological order for the UI
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    await this.assertParticipant(conversationId, userId);
    await pool.query(
      `UPDATE messages
       SET read_at = now()
       WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
      [conversationId, userId]
    );
  }

  async listConversationsForUser(userId: string): Promise<ConversationSummary[]> {
    const { rows } = await pool.query(
      `SELECT c.*, v.make, v.model, v.year, v.price_ngn, v.primary_image_url, v.status AS vehicle_status,
              buyer_user.full_name AS buyer_name,
              COALESCE(d.business_name, dealer_user.full_name) AS dealer_display_name,
              seller_user.full_name AS seller_name
       FROM conversations c
       JOIN vehicles v ON v.id = c.vehicle_id
       JOIN users buyer_user ON buyer_user.id = c.buyer_id
       LEFT JOIN dealers d ON d.id = c.dealer_id
       LEFT JOIN users dealer_user ON dealer_user.id = c.dealer_id
       LEFT JOIN users seller_user ON seller_user.id = c.seller_id
       WHERE c.buyer_id = $1 OR c.dealer_id = $1 OR c.seller_id = $1
       ORDER BY c.last_message_at DESC`,
      [userId]
    );

    const summaries: ConversationSummary[] = [];
    for (const row of rows) {
      const [lastMessageRows, unreadRows] = await Promise.all([
        pool.query(
          `SELECT body, created_at, sender_role FROM messages
           WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1`,
          [row.id]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS count FROM messages
           WHERE conversation_id = $1 AND sender_id != $2 AND read_at IS NULL`,
          [row.id, userId]
        ),
      ]);

      const isBuyer = row.buyer_id === userId;
      summaries.push({
        conversationId: row.id,
        vehicle: {
          vehicleId: row.vehicle_id,
          title: `${row.year} ${row.make} ${row.model}`,
          priceNGN: Number(row.price_ngn),
          primaryImageUrl: row.primary_image_url,
          status: row.vehicle_status,
        },
        otherParticipant: isBuyer
          ? { id: row.dealer_id || row.seller_id, name: row.dealer_display_name || row.seller_name || 'Seller', role: row.dealer_id ? 'dealer' : 'seller' }
          : { id: row.buyer_id, name: row.buyer_name, role: 'buyer' },
        lastMessage: lastMessageRows.rows[0]
          ? {
              body: lastMessageRows.rows[0].body,
              createdAt: lastMessageRows.rows[0].created_at,
              senderRole: lastMessageRows.rows[0].sender_role,
            }
          : null,
        unreadCount: unreadRows.rows[0].count,
        lastMessageAt: row.last_message_at,
      });
    }

    return summaries;
  }

  async getConversation(conversationId: string, userId: string): Promise<ConversationDetail> {
    const conversation = await this.assertParticipant(conversationId, userId);
    const summaries = await this.listConversationsForUser(userId);
    const summary = summaries.find((s) => s.conversationId === conversationId);
    if (!summary) throw new HttpError(404, 'Conversation not found.');

    return { ...summary, myRole: this.roleOf(conversation, userId) };
  }

  /** Confirms the user is buyer, dealer, or seller on this conversation. */
  private async assertParticipant(conversationId: string, userId: string): Promise<ConversationRow> {
    const { rows } = await pool.query(`SELECT * FROM conversations WHERE id = $1`, [conversationId]);
    if (rows.length === 0) throw new HttpError(404, 'Conversation not found.');

    const c: ConversationRow = rows[0];
    const isParticipant = c.buyer_id === userId || c.dealer_id === userId || c.seller_id === userId;
    if (!isParticipant) {
      throw new HttpError(403, 'You do not have access to this conversation.');
    }
    return c;
  }

  private roleOf(conversation: ConversationRow, userId: string): SenderRole {
    if (conversation.buyer_id === userId) return 'buyer';
    if (conversation.dealer_id === userId) return 'dealer';
    return 'seller';
  }

  private mapMessageRow(row: any): Message {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      senderRole: row.sender_role,
      body: row.body,
      readAt: row.read_at,
      createdAt: row.created_at,
    };
  }
}

export const messagingService = new MessagingService();
