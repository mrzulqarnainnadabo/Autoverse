/**
 * AUTOVERSE — Verification Document Storage
 *
 * Deliberately separate from photoStorageService (vehicle photos are
 * public by design; KYC documents never are). Every read goes through
 * a short-lived signed URL generated on demand — nothing here ever
 * returns a permanent public link.
 */

import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../lib/supabaseAdmin';

const BUCKET = 'dealer-verification-docs';
const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — long enough for an admin to review, short enough to limit exposure

export interface StoredDocument {
  path: string;
}

class VerificationStorageService {
  async saveDocument(dealerId: string, buffer: Buffer, mimeType: string): Promise<StoredDocument> {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'application/pdf' ? 'pdf' : 'jpg';
    const path = `dealers/${dealerId}/${randomUUID()}.${ext}`;

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      throw new Error(`Document upload failed: ${error.message}`);
    }
    return { path };
  }

  async getSignedUrl(path: string): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

    if (error || !data) {
      throw new Error(`Could not generate a viewing link for this document: ${error?.message}`);
    }
    return data.signedUrl;
  }
}

export const verificationStorageService = new VerificationStorageService();
