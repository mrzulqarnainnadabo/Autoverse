/**
 * AUTOVERSE — Dealer Verification Service
 *
 * The "Verified Dealer" badge shown across search, listing detail, and
 * the dashboard is only meaningful if something actually gates it —
 * this service is that gate. `dealers.verification_status` is the
 * denormalized flag everything else reads; this service is the only
 * code path allowed to change it.
 */

import { randomUUID } from 'crypto';
import { pool } from '../db/pool';
import { HttpError } from '../utils/httpError';
import { verificationStorageService } from './verificationStorageService';
import {
  VerificationSubmission,
  VerificationSubmissionWithViewUrls,
  SubmitVerificationInput,
  VerificationQueueItem,
  ReviewDecisionInput,
} from '../types/verification.types';

class VerificationService {
  async submit(dealerId: string, input: SubmitVerificationInput): Promise<VerificationSubmission> {
    const [cac, id] = await Promise.all([
      verificationStorageService.saveDocument(dealerId, input.cacDocumentBuffer, input.cacDocumentMimeType),
      verificationStorageService.saveDocument(dealerId, input.idDocumentBuffer, input.idDocumentMimeType),
    ]);

    const submissionId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `INSERT INTO dealer_verification_submissions
           (id, dealer_id, cac_document_path, id_document_path, id_document_type, business_address, status)
         VALUES ($1,$2,$3,$4,$5,$6,'pending')
         RETURNING *`,
        [submissionId, dealerId, cac.path, id.path, input.idDocumentType, input.businessAddress]
      );

      // Resubmission after a rejection should return the dealer to
      // "pending" review, not leave the old "rejected" flag showing
      // while a new submission sits unreviewed.
      await client.query(
        `UPDATE dealers SET verification_status = 'pending' WHERE id = $1`,
        [dealerId]
      );

      await client.query('COMMIT');
      return this.mapRow(rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getLatestForDealer(dealerId: string): Promise<VerificationSubmissionWithViewUrls | null> {
    const { rows } = await pool.query(
      `SELECT * FROM dealer_verification_submissions
       WHERE dealer_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [dealerId]
    );
    if (rows.length === 0) return null;
    return this.mapRowWithViewUrls(rows[0]);
  }

  async listPendingQueue(): Promise<VerificationQueueItem[]> {
    const { rows } = await pool.query(
      `SELECT s.id AS submission_id, s.dealer_id, s.submitted_at, s.id_document_type,
              d.business_name
       FROM dealer_verification_submissions s
       JOIN dealers d ON d.id = s.dealer_id
       WHERE s.status = 'pending'
       ORDER BY s.submitted_at ASC`
    );
    return rows.map((r) => ({
      submissionId: r.submission_id,
      dealerId: r.dealer_id,
      businessName: r.business_name,
      submittedAt: r.submitted_at,
      idDocumentType: r.id_document_type,
    }));
  }

  async getSubmissionForReview(submissionId: string): Promise<VerificationSubmissionWithViewUrls> {
    const { rows } = await pool.query(
      `SELECT * FROM dealer_verification_submissions WHERE id = $1`,
      [submissionId]
    );
    if (rows.length === 0) throw new HttpError(404, 'Submission not found.');
    return this.mapRowWithViewUrls(rows[0]);
  }

  async review(
    submissionId: string,
    reviewerId: string,
    input: ReviewDecisionInput
  ): Promise<VerificationSubmission> {
    const { rows } = await pool.query(
      `SELECT * FROM dealer_verification_submissions WHERE id = $1`,
      [submissionId]
    );
    if (rows.length === 0) throw new HttpError(404, 'Submission not found.');
    if (rows[0].status !== 'pending') {
      throw new HttpError(400, 'This submission has already been reviewed.');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: updated } = await client.query(
        `UPDATE dealer_verification_submissions
         SET status = $1, reviewer_id = $2, reviewer_notes = $3, reviewed_at = now()
         WHERE id = $4
         RETURNING *`,
        [input.decision, reviewerId, input.notes ?? null, submissionId]
      );

      if (input.decision === 'approved') {
        await client.query(
          `UPDATE dealers SET verification_status = 'verified', verified_at = now() WHERE id = $1`,
          [rows[0].dealer_id]
        );
      } else {
        await client.query(
          `UPDATE dealers SET verification_status = 'rejected' WHERE id = $1`,
          [rows[0].dealer_id]
        );
      }

      await client.query('COMMIT');
      return this.mapRow(updated[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private mapRow(row: any): VerificationSubmission {
    return {
      id: row.id,
      dealerId: row.dealer_id,
      cacDocumentPath: row.cac_document_path,
      idDocumentPath: row.id_document_path,
      idDocumentType: row.id_document_type,
      businessAddress: row.business_address,
      status: row.status,
      reviewerId: row.reviewer_id,
      reviewerNotes: row.reviewer_notes,
      submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at,
    };
  }

  private async mapRowWithViewUrls(row: any): Promise<VerificationSubmissionWithViewUrls> {
    const [cacDocumentViewUrl, idDocumentViewUrl] = await Promise.all([
      verificationStorageService.getSignedUrl(row.cac_document_path),
      verificationStorageService.getSignedUrl(row.id_document_path),
    ]);

    const base = this.mapRow(row);
    const { cacDocumentPath, idDocumentPath, ...rest } = base;
    return { ...rest, cacDocumentViewUrl, idDocumentViewUrl };
  }
}

export const verificationService = new VerificationService();
