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
    const vehicleId = job.vehicle_id || profile.vehicleId;

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
        `UPDATE av_drive_profiles
         SET rating_count = (SELECT COUNT(*) FROM av_drive_ratings WHERE to_user_id = $1),
             rating_avg = COALESCE((SELECT AVG(stars) FROM av_drive_ratings WHERE to_user_id = $1), 0),
             updated_at = now()
         WHERE user_id = $1`,
        [job.owner_id]
      );
    }

    return this.mapRating(rows[0]);
  }

  // ---------------------------------------------------------------------------
  // Location
  // ---------------------------------------------------------------------------

  async addLocationPing(userId: string, input: LocationPingInput): Promise<AvDriveJobEvent> {
    const job = await this.assertJobParticipant(input.jobId, userId);
    if (job.owner_id !== userId) {
      throw new HttpError(403, 'Only the assigned partner can send location pings.');
    }
    if (job.status !== 'accepted' && job.status !== 'in_progress') {
      throw new HttpError(400, 'Location pings require an accepted or active job.');
    }

    const { rows } = await pool.query(
      `INSERT INTO av_drive_location_pings (id, job_id, user_id, lat, lng, accuracy_m, recorded_at)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, now()))
       RETURNING *`,
      [randomUUID(), input.jobId, userId, input.lat, input.lng, input.accuracyM ?? null, input.recordedAt ?? null]
    );

    return this.mapLocationPing(rows[0]);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async requireProfile(userId: string): Promise<AvDriveProfile> {
    const profile = await this.getMyProfile(userId);
    if (!profile) throw new HttpError(404, 'AV Drive profile not found.');
    return profile;
  }

  private async assertJobParticipant(jobId: string, userId: string): Promise<any> {
    const { rows } = await pool.query(
      `SELECT * FROM av_drive_jobs WHERE id = $1 AND (client_id = $2 OR owner_id = $2)`,
      [jobId, userId]
    );
    if (rows.length === 0) throw new HttpError(404, 'Job not found.');
    return rows[0];
  }

  private async recordEvent(
    jobId: string,
    actorUserId: string,
    eventType: string,
    signal: string,
    lat: number | null,
    lng: number | null,
    metadata: Record<string, unknown> | null
  ): Promise<void> {
    await pool.query(
      `INSERT INTO av_drive_job_events
       (id, job_id, actor_user_id, event_type, signal, lat, lng, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [randomUUID(), jobId, actorUserId, eventType, signal, lat, lng, metadata]
    );
  }

  private async ensureJobConversation(
    vehicleId: string,
    clientId: string,
    ownerId: string
  ): Promise<string | null> {
    try {
      const { rows: existing } = await pool.query(
        `SELECT id FROM conversations
         WHERE vehicle_id = $1
           AND ((buyer_id = $2 AND seller_id = $3) OR (buyer_id = $3 AND seller_id = $2))
         ORDER BY created_at DESC
         LIMIT 1`,
        [vehicleId, clientId, ownerId]
      );
      if (existing.length > 0) return existing[0].id;

      const { rows } = await pool.query(
        `INSERT INTO conversations (vehicle_id, buyer_id, seller_id)
         VALUES ($1,$2,$3)
         RETURNING id`,
        [vehicleId, clientId, ownerId]
      );
      return rows[0]?.id ?? null;
    } catch {
      // Messaging schema can vary across deployments; AV Drive remains usable without chat.
      return null;
    }
  }

  private async tryPostChat(conversationId: string, senderId: string, body: string): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO messages (conversation_id, sender_id, content)
         VALUES ($1,$2,$3)`,
        [conversationId, senderId, body]
      );
    } catch {
      // Chat is an enhancement; never fail the core job operation if messaging is unavailable.
    }
  }

  private signalToChatLine(signal: AvDriveStatusSignal): string | null {
    const lines: Partial<Record<AvDriveStatusSignal, string>> = {
      owner_on_the_way: 'I am on the way.',
      owner_arrived: 'I have arrived at the pickup point.',
      trip_started: 'The trip has started.',
      trip_completed: 'The trip has been completed.',
      client_ready: 'I am ready for pickup.',
    };
    return lines[signal] ?? null;
  }

  private mapProfile(r: any): AvDriveProfile {
    return {
      id: r.id,
      userId: r.user_id,
      vehicleId: r.vehicle_id,
      homeCity: r.home_city,
      jobTypes: r.job_types,
      bio: r.bio,
      workReady: Boolean(r.work_ready),
      isAvailable: Boolean(r.is_available),
      availableFrom: r.available_from,
      availableTo: r.available_to,
      ratingAvg: Number(r.rating_avg),
      ratingCount: Number(r.rating_count),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapJob(r: any): AvDriveJob {
    return {
      id: r.id,
      clientId: r.client_id,
      ownerId: r.owner_id,
      profileId: r.profile_id,
      vehicleId: r.vehicle_id,
      jobType: r.job_type,
      corridor: r.corridor,
      city: r.city,
      pickupLabel: r.pickup_label,
      dropoffLabel: r.dropoff_label,
      pickupLat: r.pickup_lat,
      pickupLng: r.pickup_lng,
      dropoffLat: r.dropoff_lat,
      dropoffLng: r.dropoff_lng,
      scheduledAt: r.scheduled_at,
      notes: r.notes,
      priceNgn: r.price_ngn,
      status: r.status,
      conversationId: r.conversation_id,
      acceptedAt: r.accepted_at,
      startedAt: r.started_at,
      completedAt: r.completed_at,
      cancelledAt: r.cancelled_at,
      cancelReason: r.cancel_reason,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapRating(r: any): AvDriveRating {
    return {
      id: r.id,
      jobId: r.job_id,
      fromUserId: r.from_user_id,
      toUserId: r.to_user_id,
      stars: Number(r.stars),
      comment: r.comment,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  private mapLocationPing(r: any): AvDriveJobEvent {
    return {
      id: r.id,
      jobId: r.job_id,
      actorUserId: r.user_id,
      eventType: 'location_ping',
      signal: 'location_ping',
      lat: r.lat,
      lng: r.lng,
      metadata: { accuracyM: r.accuracy_m },
      createdAt: r.recorded_at,
    };
  }

  private assertCity(city: AvDriveCity): void {
    if (!PILOT_CITIES.includes(city)) {
      throw new HttpError(400, `Unsupported AV Drive city: ${city}.`);
    }
  }

  private assertJobType(jobType: AvDriveJobType): void {
    if (!JOB_TYPES.includes(jobType)) {
      throw new HttpError(400, `Unsupported AV Drive job type: ${jobType}.`);
    }
  }

  private assertJobTypes(jobTypes: AvDriveJobType[]): void {
    jobTypes.forEach((jobType) => this.assertJobType(jobType));
  }
}

export const avDriveService = new AvDriveService();
