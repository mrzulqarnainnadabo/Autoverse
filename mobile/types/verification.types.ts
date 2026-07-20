export type IdDocumentType = 'nin' | 'drivers_license' | 'international_passport' | 'voters_card';
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

export interface VerificationSubmissionWithViewUrls {
  id: string;
  dealerId: string;
  cacDocumentViewUrl: string;
  idDocumentViewUrl: string;
  idDocumentType: IdDocumentType;
  businessAddress: string;
  status: SubmissionStatus;
  reviewerId: string | null;
  reviewerNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface VerificationQueueItem {
  submissionId: string;
  dealerId: string;
  businessName: string;
  submittedAt: string;
  idDocumentType: IdDocumentType;
}

export interface LocalDocument {
  uri: string;
  mimeType: string;
  name: string;
}
