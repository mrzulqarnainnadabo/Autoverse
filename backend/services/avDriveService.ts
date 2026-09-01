/**
 * AUTOVERSE — AV Drive Service
 *
 * Structured private hire (Abuja + Kaduna). Communication model:
 * 1) Job status signals (on the way / arrived / started) as structured events
 * 2) Job-anchored chat via existing messaging when vehicle is known
 * 3) tel: / WhatsApp deep links exposed to the client for call fallback
 */

import { randomUUID } from 'crypto';
import { pool } from '../db/pool';
import { HttpError } from '../utils/httpError';
import {
  AvDriveCity,
  AvDriveJob,
  AvDriveJobEvent,
  AvDriveJobType,
  AvDrivePartnerPublic,
  AvDriveProfile,
  AvDriveRating,
  AvDriveStatusSignal,
  CreateAvDriveJobInput,
  LocationPingInput,
  RateAvDriveJobInput,
  SetAvailabilityInput,
  UpsertAvDriveProfileInput,
} from '../types/avDrive.types';

const PILOT_CITIES: AvDriveCity[] = ['Abuja', 'Kaduna'];
const JOB_TYPES: AvDriveJobType[] = ['airport_transfer', 'intercity'];

class AvDriveService {
  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  async upsertProfile(userId: string, input: UpsertAvDriveProfileInput): Promise<AvDriveProfile> {
    this.assertCity(input.homeCity);
    this.assertJobTypes(input.jobTypes);

    if (input.vehicleId) {
      const { rows } = await pool.query(
        `SELECT id, seller_id, dealer_id FROM vehicles WHERE id = $1`,
        [input.vehicleId]
      );
      if (rows.length === 0) throw new HttpError(404, 'Vehicle not found.');
      const v = rows[0];
      if (v.seller_id !== userId && v.dealer_id !== userId) {
        throw new HttpError(403, 'You can only attach your own vehicle to AV Drive.');
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO av_drive_profiles (user_id, vehicle_id, home_city, job_types, bio)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) DO UPDATE SET
         vehicle_id = COALESCE(EXCLUDED.vehicle_id, av_drive_profiles.vehicle_id),
         home_city = EXCLUDED.home_city,
         job_types = EXCLUDED.job_types,
         bio = COALESCE(EXCLUDED.bio, av_drive_profiles.bio),
         updated_at = now()
       RETURNING *`,
      [userId, input.vehicleId ?? null, input.homeCity, input.jobTypes, input.bio ?? null]
    );
    return this.mapProfile(rows[0]);
  }

  async getMyProfile(userId: string): Promise<AvDriveProfile | null> {
    const { rows } = await pool.query(`SELECT * FROM av_drive_profiles WHERE user_id = $1`, [userId]);
    return rows[0] ? this.mapProfile(rows[0]) : null;
  }

  async setAvailability(userId: string, input: SetAvailabilityInput): Promise<AvDriveProfile> {
    const profile = await this.requireProfile(userId);
    if (input.isAvailable && !profile.workReady) {
      throw new HttpError(
        400,
        'Complete Work-ready checks (KYC + vehicle) before going available.'
      );
    }
    const { rows } = await pool.query(
      `UPDATE av_drive_profiles
       SET is_available = $2,
           available_from = $3,
           available_to = $4,
           updated_at = now()
       WHERE user_id = $1
       RETURNING *`,
      [userId, input.isAvailable, input.availableFrom ?? null, input.availableTo ?? null]
    );
    return this.mapProfile(rows[0]);
  }

  /** Public list of partners clients can request. */
  async listPartners(opts: {
    city?: AvDriveCity;
    jobType?: AvDriveJobType;
  }): Promise<AvDrivePartnerPublic[]> {
    const params: unknown[] = [];
    const clauses: string[] = [`p.work_ready = true`, `p.is_available = true`];

    if (opts.city) {
      this.assertCity(opts.city);
      params.push(opts.city);
      clauses.push(`p.home_city = $${params.length}`);
    }
    if (opts.jobType) {
      this.assertJobType(opts.jobType);
      params.push(opts.jobType);
      clauses.push(`$${params.length} = ANY (p.job_types)`);
    }

    const { rows } = await pool.query(
      `SELECT p.*,
              u.full_name,
              v.year AS v_year, v.make AS v_make, v.model AS v_model
       FROM av_drive_profiles p
       JOIN users u ON u.id = p.user_id
       LEFT JOIN vehicles v ON v.id = p.vehicle_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.rating_avg DESC, p.rating_count DESC
       LIMIT 50`,
      params
    );

    return rows.map((r) => ({
      profileId: r.id,
      userId: r.user_id,
      displayName: r.full_name,
      homeCity: r.home_city,
      jobTypes: r.job_types,
      workReady: r.work_ready,
      ratingAvg: Number(r.rating_avg),
      ratingCount: Number(r.rating_count),
      vehicleId: r.vehicle_id,
      vehicleLabel:
        r.v_year && r.v_make && r.v_model ? `${r.v_year} ${r.v_make} ${r.v_model}` : null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Jobs
  // ---------------------------------------------------------------------------

  async createJob(clientId: string, input: CreateAvDriveJobInput): Promise<AvDriveJob> {
    this.assertJobType(input.jobType);
    if (input.city) this.assertCity(input.city);
    if (!input.pickupLabel?.trim() || !input.dropoffLabel?.trim()) {
      throw new HttpError(400, 'Pickup and dropoff labels are required.');
    }
    if (!input.scheduledAt) throw new HttpError(400, 'scheduledAt is required.');

    let ownerId: string | null = null;
    let profileId: string | null = null;
    let vehicleId: string | null = null;

    if (input.preferredProfileId) {
      const { rows } = await pool.query(
        `SELECT * FROM av_drive_profiles WHERE id = $1 AND work_ready = true AND is_available = true`,
        [input.preferredProfileId]
      );
      if (rows.length === 0) {
        throw new HttpError(404, 'Preferred partner is not available.');
      }
      profileId = rows[0].id;
      ownerId = rows[0].user_id;
      vehicleId = rows[0].vehicle_id;
      if (ownerId === clientId) {
        throw new HttpError(400, 'You cannot book your own AV Drive profile.');
      }
    }

    const id = randomUUID();
    const corridor =
      input.corridor ??
      (input.jobType === 'intercity' ? 'Abuja-Kaduna' : input.city ? `${input.city}-local` : null);

    const { rows } = await pool.query(
      `INSERT INTO av_drive_jobs (
         id, client_id, owner_id, profile_id, vehicle_id,
         job_type, corridor, city,
         pickup_label, dropoff_label, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
         scheduled_at, notes, price_ngn, status
       ) VALUES (
         $1,$2,$3,$4,$5,
         $6,$7,$8,
         $9,$10,$11,$12,$13,$14,
         $15,$16,$17,'requested'
       ) RETURNING *`,
      [
        id,
        clientId,
        ownerId,
        profileId,
        vehicleId,
        input.jobType,
        corridor,
        input.city ?? null,
        input.pickupLabel.trim(),
        input.dropoffLabel.trim(),
        input.pickupLat ?? null,
        input.pickupLng ?? null,
        input.dropoffLat ?? null,
        input.dropoffLng ?? null,
        input.scheduledAt,
        input.notes ?? null,
        input.priceNgn ?? null,
      ]
    );

    await this.recordEvent(id, clientId, 'created', 'job_requested', null, null, null);
    return this.mapJob(rows[0]);
  }

  async listMyJobs(userId: string): Promise<AvDriveJob[]> {
    const { rows } = await pool.query(
      `SELECT * FROM av_drive_jobs
       WHERE client_id = $1 OR owner_id = $1
       ORDER BY scheduled_at DESC
       LIMIT 100`,
      [userId]
    );
    return rows.map((r) => this.mapJob(r));
  }

  async getJob(jobId: string, userId: string): Promise<AvDriveJob> {
    const job = await this.assertJobParticipant(jobId, userId);
    return this.mapJob(job);
  }

  async acceptJob(jobId: string, ownerUserId: string): Promise<AvDriveJob> {
    const profile = await this.requireProfile(ownerUserId);
    if (!profile.workReady) {
      throw new HttpError(400, 'Profile must be Work-ready to accept jobs.');
    }

    const { rows: existing } = await pool.query(`SELECT * FROM av_drive_jobs WHERE id = $1`, [jobId]);
    if (existing.length === 0) throw new HttpError(404, 'Job not found.');
    const job = existing[0];

    if (job.status !== 'requested') {
      throw new HttpError(400, `Cannot accept a job in status ${job.status}.`);
    }
    if (job.client_id === ownerUserId) {
      throw new HttpError(400, 'You cannot accept your own job.');
    }
    // If client preferred another owner, only that owner may accept
    if (job.owner_id && job.owner_id !== ownerUserId) {
      throw new HttpError(403, 'This job is assigned to another partner.');
    }

    let conversationId: string | null = job.conversation_id ?? null;
    const vehicleId = job.vehicle_id || profile.vehicle_id;

    // Open job-anchored chat when we have a vehicle (reuses marketplace messaging).
    if (vehicleId && !conversationId) {
      conversationId = await this.ensureJobConversation(vehicleId, job.client_id, ownerUserId);
    }

    const { rows } = await pool.query(
      `UPDATE av_drive_jobs SET
         status = 'accepted',
         owner_id = $2,
         profile_id = $3,
         vehicle_id = COALESCE(vehicle_id, $4),
         conversation_id = COALESCE(conversation_id, $5),
         accepted_at = now(),
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [jobId, ownerUserId, profile.id, vehicleId, conversationId]
    );

    await this.recordEvent(jobId, ownerUserId, 'accepted', 'job_accepted', null, null, {
      conversationId,
    });

    // Seed chat with a clear system-style first line if conversation exists
    if (conversationId) {
      await this.tryPostChat(
        conversationId,
        ownerUserId,
        'Job accepted. I will update you when I am on the way.'
      );
    }

    return this.mapJob(rows[0]);
  }

  async signal(
    jobId: string,
    userId: string,
    signal: AvDriveStatusSignal,
    geo?: { lat?: number; lng?: number }
  ): Promise<AvDriveJob> {
    const job = await this.assertJobParticipant(jobId, userId);
    const allowed: Record<string, AvDriveStatusSignal[]> = {
      owner: ['owner_on_the_way', 'owner_arrived', 'trip_started', 'trip_completed'],
      client: ['client_ready'],
    };

    const role = job.owner_id === userId ? 'owner' : job.client_id === userId ? 'client' : null;
    if (!role) throw new HttpError(403, 'Not a participant on this job.');
    if (!allowed[role].includes(signal)) {
      throw new HttpError(400, `Signal ${signal} is not allowed for your role.`);
    }

    // Status transitions for key signals
    if (signal === 'trip_started') {
      if (job.status !== 'accepted' && job.status !== 'in_progress') {
        throw new HttpError(400, 'Job must be accepted before starting.');
      }
      await pool.query(
        `UPDATE av_drive_jobs SET status = 'in_progress', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1`,
        [jobId]
      );
      await this.recordEvent(jobId, userId, 'started', signal, geo?.lat ?? null, geo?.lng ?? null, null);
    } else if (signal === 'trip_completed') {
      if (job.status !== 'in_progress' && job.status !== 'accepted') {
        throw new HttpError(400, 'Job must be in progress to complete.');
      }
      await pool.query(
        `UPDATE av_drive_jobs SET status = 'completed', completed_at = now(), updated_at = now() WHERE id = $1`,
        [jobId]
      );
      await this.recordEvent(jobId, userId, 'completed', signal, geo?.lat ?? null, geo?.lng ?? null, null);
    } else {
      await this.recordEvent(jobId, userId, 'note', signal, geo?.lat ?? null, geo?.lng ?? null, null);
    }

    // Mirror important signals into chat when available
    const chatLine = this.signalToChatLine(signal);
    if (chatLine && job.conversation_id) {
      await this.tryPostChat(job.conversation_id, userId, chatLine);
    }

    const { rows } = await pool.query(`SELECT * FROM av_drive_jobs WHERE id = $1`, [jobId]);
    return this.mapJob(rows[0]);
  }

  async completeJob(jobId: string, userId: string): Promise<AvDriveJob> {
    return this.signal(jobId, userId, 'trip_completed');
  }

  async cancelJob(jobId: string, userId: string, reason?: string): Promise<AvDriveJob> {
    const job = await this.assertJobParticipant(jobId, userId);
    if (['completed', 'cancelled'].includes(job.status)) {
      throw new HttpError(400, `Cannot cancel a job in status ${job.status}.`);
    }
    const { rows } = await pool.query(
      `UPDATE av_drive_jobs SET
         status = 'cancelled',
         cancelled_at = now(),
         cancel_reason = $2,
         updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [jobId, reason ?? null]
    );
    await this.recordEvent(jobId, userId, 'cancelled', 'job_cancelled', null, null, {
      reason: reason ?? null,
    });
    if (job.conversation_id) {
      await this.tryPostChat(
        job.conversation_id,
        userId,
        reason ? `Job cancelled: ${reason}` : 'Job cancelled.'
      );
    }
    return this.mapJob(rows[0]);
  }

  async rateJob(jobId: string, fromUserId: string, input: RateAvDriveJobInput): Promise<AvDriveRating> {
    if (input.stars < 1 || input.stars > 5) throw new HttpError(400, 'Stars must be 1–5.');
    const job = await this.assertJobParticipant(jobId, fromUserId);
    if (job.status !== 'completed') {
      throw new HttpError(400, 'You can only rate completed jobs.');
    }
    const toUserId = job.client_id === fromUserId ? job.owner_id : job.client_id;
    if (!toUserId) throw new HttpError(400, 'No counterparty to rate yet.');

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO av_drive_ratings (id, job_id, from_user_id, to_user_id, stars, comment)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (job_id) DO UPDATE SET stars = EXCLUDED.stars, comment = EXCLUDED.comment
       RETURNING *`,
      [id, jobId, fromUserId, toUserId, input.stars, input.comment ?? null]
    );

    // Roll up owner rating when client rates owner
    if (fromUserId === job.client_id && job.owner_id) {
      await pool.query(
        `UPDATE av_drive_profiles p SET
           rating_avg = sub.avg_stars,
           rating_count = sub.cnt,
           updated_at = now()
         FROM (
           SELECT AVG(stars)::numeric(3,2) AS avg_stars, COUNT(*)::int AS cnt
           FROM av_drive_ratings r
           JOIN av_drive_jobs j ON j.id = r.job_id
           WHERE j.owner_id = $1
         ) sub
         WHERE p.user_id = $1`,
        [job.owner_id]
      );
    }

    return {
      id: rows[0].id,
      jobId: rows[0].job_id,
      fromUserId: rows[0].from_user_id,
      toUserId: rows[0].to_user_id,
      stars: rows[0].stars,
      comment: rows[0].comment,
      createdAt: rows[0].created_at,
    };
  }

  async postLocation(jobId: string, ownerUserId: string, input: LocationPingInput): Promise<void> {
    const job = await this.assertJobParticipant(jobId, ownerUserId);
    if (job.owner_id !== ownerUserId) {
      throw new HttpError(403, 'Only the assigned owner can share live location.');
    }
    if (job.status !== 'accepted' && job.status !== 'in_progress') {
      throw new HttpError(400, 'Location sharing only while job is accepted or in progress.');
    }
    await pool.query(
      `INSERT INTO av_drive_location_pings (job_id, owner_id, lat, lng, accuracy_m)
       VALUES ($1,$2,$3,$4,$5)`,
      [jobId, ownerUserId, input.lat, input.lng, input.accuracyM ?? null]
    );
    await this.recordEvent(jobId, ownerUserId, 'location_ping', null, input.lat, input.lng, {
      accuracyM: input.accuracyM ?? null,
    });
  }

  async listEvents(jobId: string, userId: string): Promise<AvDriveJobEvent[]> {
    await this.assertJobParticipant(jobId, userId);
    const { rows } = await pool.query(
      `SELECT * FROM av_drive_job_events WHERE job_id = $1 ORDER BY created_at ASC`,
      [jobId]
    );
    return rows.map((r) => ({
      id: r.id,
      jobId: r.job_id,
      actorId: r.actor_id,
      eventType: r.event_type,
      signal: (r.meta && r.meta.signal) || null,
      lat: r.lat,
      lng: r.lng,
      meta: r.meta,
      createdAt: r.created_at,
    }));
  }

  /** Contact hints for UI (call / WhatsApp) — phones from users table. */
  async getJobContact(
    jobId: string,
    userId: string
  ): Promise<{ otherUserId: string; phone: string | null; whatsappUrl: string | null; telUrl: string | null }> {
    const job = await this.assertJobParticipant(jobId, userId);
    if (job.status === 'requested' && job.owner_id === null) {
      throw new HttpError(400, 'No partner assigned yet.');
    }
    const otherId = job.client_id === userId ? job.owner_id : job.client_id;
    if (!otherId) throw new HttpError(400, 'Counterparty not assigned.');

    const { rows } = await pool.query(`SELECT phone FROM users WHERE id = $1`, [otherId]);
    const phone = rows[0]?.phone ?? null;
    const digits = phone ? String(phone).replace(/\D/g, '') : null;
    return {
      otherUserId: otherId,
      phone,
      telUrl: digits ? `tel:+${digits.startsWith('234') ? digits : digits}` : null,
      whatsappUrl: digits
        ? `https://wa.me/${digits.startsWith('234') ? digits : digits}`
        : null,
    };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async requireProfile(userId: string): Promise<AvDriveProfile> {
    const p = await this.getMyProfile(userId);
    if (!p) throw new HttpError(404, 'Create an AV Drive profile first.');
    return p;
  }

  private async assertJobParticipant(jobId: string, userId: string): Promise<any> {
    const { rows } = await pool.query(`SELECT * FROM av_drive_jobs WHERE id = $1`, [jobId]);
    if (rows.length === 0) throw new HttpError(404, 'Job not found.');
    const job = rows[0];
    const ok =
      job.client_id === userId ||
      job.owner_id === userId ||
      // open requested jobs: any work-ready owner may view to accept
      (job.status === 'requested' && job.owner_id === null);
    if (!ok && job.owner_id !== userId && job.client_id !== userId) {
      // owners browsing open board
      const profile = await this.getMyProfile(userId);
      if (!(job.status === 'requested' && profile?.workReady)) {
        throw new HttpError(403, 'You do not have access to this job.');
      }
    }
    return job;
  }

  private async recordEvent(
    jobId: string,
    actorId: string | null,
    eventType: string,
    signal: AvDriveStatusSignal | null,
    lat: number | null,
    lng: number | null,
    meta: Record<string, unknown> | null
  ) {
    await pool.query(
      `INSERT INTO av_drive_job_events (job_id, actor_id, event_type, lat, lng, meta)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [jobId, actorId, eventType, lat, lng, meta ? { ...meta, signal } : signal ? { signal } : null]
    );
  }

  /**
   * Best-effort: create listing-style conversation so ChatScreen can be reused.
   * If messaging schema constraints block (e.g. owner is not dealer/seller on vehicle),
   * we skip chat and rely on status signals + phone/WhatsApp.
   */
  private async ensureJobConversation(
    vehicleId: string,
    clientId: string,
    ownerId: string
  ): Promise<string | null> {
    try {
      const { rows: existing } = await pool.query(
        `SELECT id FROM conversations WHERE vehicle_id = $1 AND buyer_id = $2`,
        [vehicleId, clientId]
      );
      if (existing.length > 0) return existing[0].id;

      const { rows: v } = await pool.query(
        `SELECT dealer_id, seller_id FROM vehicles WHERE id = $1`,
        [vehicleId]
      );
      if (v.length === 0) return null;

      // Prefer real dealer/seller columns; if owner is the seller/dealer, conversation works.
      const dealerId = v[0].dealer_id;
      const sellerId = v[0].seller_id || ownerId;
      const id = randomUUID();
      const { rows } = await pool.query(
        `INSERT INTO conversations (id, vehicle_id, buyer_id, dealer_id, seller_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (vehicle_id, buyer_id) DO UPDATE SET last_message_at = now()
         RETURNING id`,
        [id, vehicleId, clientId, dealerId, sellerId]
      );
      return rows[0]?.id ?? null;
    } catch (err) {
      console.warn('[avDrive] ensureJobConversation skipped:', err);
      return null;
    }
  }

  private async tryPostChat(conversationId: string, senderId: string, body: string) {
    try {
      // Infer role roughly for messaging CHECK constraint
      const { rows } = await pool.query(`SELECT buyer_id, dealer_id, seller_id FROM conversations WHERE id = $1`, [
        conversationId,
      ]);
      if (rows.length === 0) return;
      const c = rows[0];
      let role = 'seller';
      if (c.buyer_id === senderId) role = 'buyer';
      else if (c.dealer_id === senderId) role = 'dealer';
      else role = 'seller';

      await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, sender_role, body)
         VALUES ($1,$2,$3,$4)`,
        [conversationId, senderId, role, body.slice(0, 2000)]
      );
      await pool.query(`UPDATE conversations SET last_message_at = now() WHERE id = $1`, [
        conversationId,
      ]);
    } catch (err) {
      console.warn('[avDrive] tryPostChat skipped:', err);
    }
  }

  private signalToChatLine(signal: AvDriveStatusSignal): string | null {
    switch (signal) {
      case 'owner_on_the_way':
        return 'I am on the way to pickup.';
      case 'owner_arrived':
        return 'I have arrived at pickup.';
      case 'client_ready':
        return 'I am ready at pickup.';
      case 'trip_started':
        return 'Trip started.';
      case 'trip_completed':
        return 'Trip completed. Thank you.';
      default:
        return null;
    }
  }

  private assertCity(city: string) {
    if (!PILOT_CITIES.includes(city as AvDriveCity)) {
      throw new HttpError(400, `Pilot cities only: ${PILOT_CITIES.join(', ')}`);
    }
  }

  private assertJobType(t: string) {
    if (!JOB_TYPES.includes(t as AvDriveJobType)) {
      throw new HttpError(400, `Job type must be one of: ${JOB_TYPES.join(', ')}`);
    }
  }

  private assertJobTypes(types: string[]) {
    if (!types.length) throw new HttpError(400, 'Select at least one job type.');
    types.forEach((t) => this.assertJobType(t));
  }

  private mapProfile(row: any): AvDriveProfile {
    return {
      id: row.id,
      userId: row.user_id,
      vehicleId: row.vehicle_id,
      homeCity: row.home_city,
      jobTypes: row.job_types ?? [],
      isAvailable: row.is_available,
      availableFrom: row.available_from,
      availableTo: row.available_to,
      workReady: row.work_ready,
      kycStatus: row.kyc_status,
      bio: row.bio,
      ratingAvg: Number(row.rating_avg),
      ratingCount: Number(row.rating_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapJob(row: any): AvDriveJob {
    return {
      id: row.id,
      clientId: row.client_id,
      ownerId: row.owner_id,
      profileId: row.profile_id,
      vehicleId: row.vehicle_id,
      conversationId: row.conversation_id ?? null,
      jobType: row.job_type,
      corridor: row.corridor,
      city: row.city,
      geo: {
        pickupLabel: row.pickup_label,
        dropoffLabel: row.dropoff_label,
        pickupLat: row.pickup_lat,
        pickupLng: row.pickup_lng,
        dropoffLat: row.dropoff_lat,
        dropoffLng: row.dropoff_lng,
      },
      scheduledAt: row.scheduled_at,
      notes: row.notes,
      status: row.status,
      priceNgn: row.price_ngn != null ? Number(row.price_ngn) : null,
      paymentStatus: row.payment_status,
      acceptedAt: row.accepted_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      cancelledAt: row.cancelled_at,
      cancelReason: row.cancel_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const avDriveService = new AvDriveService();
