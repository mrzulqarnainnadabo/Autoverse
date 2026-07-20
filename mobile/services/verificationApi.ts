import { getAccessToken } from './authStorage';
import {
  VerificationSubmissionWithViewUrls,
  VerificationQueueItem,
  LocalDocument,
  IdDocumentType,
} from '../types/verification.types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.autoverse.ng';

async function authHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function submitVerification(
  dealerId: string,
  input: {
    cacDocument: LocalDocument;
    idDocument: LocalDocument;
    idDocumentType: IdDocumentType;
    businessAddress: string;
  }
): Promise<void> {
  const form = new FormData();
  form.append('idDocumentType', input.idDocumentType);
  form.append('businessAddress', input.businessAddress);
  // @ts-expect-error React Native FormData file shape
  form.append('cacDocument', { uri: input.cacDocument.uri, name: input.cacDocument.name, type: input.cacDocument.mimeType });
  // @ts-expect-error React Native FormData file shape
  form.append('idDocument', { uri: input.idDocument.uri, name: input.idDocument.name, type: input.idDocument.mimeType });

  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/dealers/${dealerId}/verification`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'multipart/form-data' },
    body: form,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Submission failed (${response.status})`);
  }
}

export async function fetchMyVerification(dealerId: string): Promise<VerificationSubmissionWithViewUrls | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/dealers/${dealerId}/verification`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to load verification status (${response.status})`);
  const data = await response.json();
  return data.submission;
}

export async function fetchVerificationQueue(): Promise<VerificationQueueItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/verification-queue`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to load queue (${response.status})`);
  const data = await response.json();
  return data.queue;
}

export async function fetchSubmissionForReview(submissionId: string): Promise<VerificationSubmissionWithViewUrls> {
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/verification/${submissionId}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to load submission (${response.status})`);
  const data = await response.json();
  return data.submission;
}

export async function reviewSubmission(
  submissionId: string,
  decision: 'approved' | 'rejected',
  notes?: string
): Promise<void> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/verification/${submissionId}/review`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, notes }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Review failed (${response.status})`);
  }
}
