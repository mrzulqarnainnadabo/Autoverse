import { getAccessToken } from './authStorage';
import {
  AvDriveCity,
  AvDriveContact,
  AvDriveJob,
  AvDriveJobEvent,
  AvDriveJobType,
  AvDrivePartnerPublic,
  AvDriveProfile,
  AvDriveStatusSignal,
  CreateAvDriveJobInput,
} from '../types/avDrive.types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.autoverse.ng';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseError(response: Response): Promise<string> {
  const body = await response.json().catch(() => ({}));
  return (body as any).error || `Request failed (${response.status})`;
}

export async function fetchMyAvDriveProfile(): Promise<AvDriveProfile | null> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/profile/me`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.profile as AvDriveProfile | null;
}

export async function upsertAvDriveProfile(input: {
  vehicleId?: string | null;
  homeCity: AvDriveCity;
  jobTypes: AvDriveJobType[];
  bio?: string | null;
}): Promise<AvDriveProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/profile`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.profile as AvDriveProfile;
}

export async function setAvDriveAvailability(input: {
  isAvailable: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
}): Promise<AvDriveProfile> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/availability`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.profile as AvDriveProfile;
}

export async function fetchAvDrivePartners(opts?: {
  city?: AvDriveCity;
  jobType?: AvDriveJobType;
}): Promise<AvDrivePartnerPublic[]> {
  const params = new URLSearchParams();
  if (opts?.city) params.set('city', opts.city);
  if (opts?.jobType) params.set('jobType', opts.jobType);
  const qs = params.toString();
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/partners${qs ? `?${qs}` : ''}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.partners as AvDrivePartnerPublic[];
}

export async function createAvDriveJob(input: CreateAvDriveJobInput): Promise<AvDriveJob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.job as AvDriveJob;
}

export async function fetchMyAvDriveJobs(): Promise<AvDriveJob[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/mine`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.jobs as AvDriveJob[];
}

export async function fetchAvDriveJob(jobId: string): Promise<AvDriveJob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.job as AvDriveJob;
}

export async function acceptAvDriveJob(jobId: string): Promise<AvDriveJob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}/accept`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.job as AvDriveJob;
}

export async function signalAvDriveJob(
  jobId: string,
  signal: AvDriveStatusSignal,
  geo?: { lat?: number; lng?: number }
): Promise<AvDriveJob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}/signal`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ signal, ...geo }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.job as AvDriveJob;
}

export async function completeAvDriveJob(jobId: string): Promise<AvDriveJob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}/complete`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.job as AvDriveJob;
}

export async function cancelAvDriveJob(jobId: string, reason?: string): Promise<AvDriveJob> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}/cancel`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.job as AvDriveJob;
}

export async function rateAvDriveJob(
  jobId: string,
  stars: number,
  comment?: string | null
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}/rate`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ stars, comment }),
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function fetchAvDriveJobEvents(jobId: string): Promise<AvDriveJobEvent[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}/events`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.events as AvDriveJobEvent[];
}

export async function fetchAvDriveJobContact(jobId: string): Promise<AvDriveContact> {
  const response = await fetch(`${API_BASE_URL}/api/v1/av-drive/jobs/${jobId}/contact`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const data = await response.json();
  return data.contact as AvDriveContact;
}
