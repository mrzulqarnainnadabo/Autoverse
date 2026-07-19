import { CapturedPhoto, AutoInspectReport } from '../types/autoinspect.types';
import { getAccessToken } from './authStorage'; // your existing token store

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.autoverse.ng';

interface SubmitParams {
  vehicleId: string;
  sellerId: string;
  declaredYear?: number;
  declaredMake?: string;
  declaredModel?: string;
  declaredMileageKm?: number;
  photos: CapturedPhoto[];
}

export async function submitAutoInspect(params: SubmitParams): Promise<AutoInspectReport> {
  const token = await getAccessToken();
  const form = new FormData();

  form.append('vehicleId', params.vehicleId);
  form.append('sellerId', params.sellerId);
  if (params.declaredYear) form.append('declaredYear', String(params.declaredYear));
  if (params.declaredMake) form.append('declaredMake', params.declaredMake);
  if (params.declaredModel) form.append('declaredModel', params.declaredModel);
  if (params.declaredMileageKm) form.append('declaredMileageKm', String(params.declaredMileageKm));

  params.photos.forEach((photo) => {
    form.append('angles', photo.angle);
    // @ts-expect-error React Native FormData file shape
    form.append('photos', {
      uri: photo.uri,
      name: `${photo.angle}.jpg`,
      type: 'image/jpeg',
    });
  });

  const response = await fetch(`${API_BASE_URL}/api/v1/autoinspect`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: form,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `AutoInspect request failed (${response.status})`);
  }

  const data = await response.json();
  return data.report as AutoInspectReport;
}

export async function fetchAutoInspectReport(reportId: string): Promise<AutoInspectReport> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/autoinspect/${reportId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to fetch report (${response.status})`);
  const data = await response.json();
  return data.report as AutoInspectReport;
}
