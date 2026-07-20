export type IdDocumentType = 'nin' | 'drivers_license' | 'international_passport' | 'voters_card';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationSubmission {
  id: string;
  dealerId: string;
  cacDocumentPath: string;
  idDocumentPath: string;
  idDocumentType: IdDocumentType;
  businessAddress: string;
  status: SubmissionStatus;
  reviewerId: string | null;
  reviewerNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/** Same as VerificationSubmission but with signed, time-limited URLs for viewing — never persisted, generated per-request. */
export interface VerificationSubmissionWithViewUrls extends Omit<VerificationSubmission, 'cacDocumentPath' | 'idDocumentPath'> {
  cacDocumentViewUrl: string;
  idDocumentViewUrl: string;
}

export interface SubmitVerificationInput {
  cacDocumentBuffer: Buffer;
  cacDocumentMimeType: string;
  idDocumentBuffer: Buffer;
  idDocumentMimeType: string;
  idDocumentType: IdDocumentType;
  businessAddress: string;
}

export interface VerificationQueueItem {
  submissionId: string;
  dealerId: string;
  businessName: string;
  submittedAt: string;
  idDocumentType: IdDocumentType;
}

export interface ReviewDecisionInput {
  decision: 'approved' | 'rejected';
  notes?: string;
}
