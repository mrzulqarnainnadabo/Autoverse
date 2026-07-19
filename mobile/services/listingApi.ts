import { getAccessToken } from './authStorage';
import {
  ListingDraft,
  PublishCheckResult,
  LocalListingPhoto,
  ListingDetailsFormState,
} from '../types/listing.types';
import { AutoInspectReport } from '../types/autoinspect.types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.autoverse.ng';

async function authHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function createListingDraft(): Promise<{ vehicleId: string }> {
  const response = await fetch(`${API_BASE_URL}/api/v1/listings`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to start listing (${response.status})`);
  return response.json();
}

interface PhotosAndInspectParams {
  vehicleId: string;
  photos: LocalListingPhoto[];
  triggerInspection: boolean;
  declaredYear?: number;
  declaredMake?: string;
  declaredModel?: string;
  declaredMileageKm?: number;
}

export async function submitPhotosAndInspect(
  params: PhotosAndInspectParams
): Promise<{ photos: any[]; report: AutoInspectReport | null }> {
  const form = new FormData();
  params.photos.forEach((photo) => {
    form.append('angles', photo.angle || '');
    // @ts-expect-error React Native FormData file shape
    form.append('photos', { uri: photo.uri, name: `${photo.angle || 'photo'}.jpg`, type: 'image/jpeg' });
  });
  form.append('triggerInspection', String(params.triggerInspection));
  if (params.declaredYear) form.append('declaredYear', String(params.declaredYear));
  if (params.declaredMake) form.append('declaredMake', params.declaredMake);
  if (params.declaredModel) form.append('declaredModel', params.declaredModel);
  if (params.declaredMileageKm) form.append('declaredMileageKm', String(params.declaredMileageKm));

  const headers = await authHeaders();
  const response = await fetch(
    `${API_BASE_URL}/api/v1/listings/${params.vehicleId}/photos-and-inspect`,
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'multipart/form-data' },
      body: form,
    }
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Photo upload failed (${response.status})`);
  }
  return response.json();
}

export async function updateListingDetails(
  vehicleId: string,
  form: ListingDetailsFormState
): Promise<ListingDraft> {
  const payload: Record<string, any> = {};
  if (form.make) payload.make = form.make;
  if (form.model) payload.model = form.model;
  if (form.year) payload.year = Number(form.year);
  if (form.mileageKm) payload.mileageKm = Number(form.mileageKm);
  if (form.priceNGN) payload.priceNGN = Number(form.priceNGN.replace(/[^0-9]/g, ''));
  if (form.description) payload.description = form.description;
  if (form.transmission) payload.transmission = form.transmission;
  if (form.fuelType) payload.fuelType = form.fuelType;
  if (form.state) payload.state = form.state;
  if (form.lga) payload.lga = form.lga;

  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/listings/${vehicleId}`, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to save details (${response.status})`);
  }
  const data = await response.json();
  return data.listing as ListingDraft;
}

export async function checkPublishReadiness(vehicleId: string): Promise<PublishCheckResult> {
  const response = await fetch(`${API_BASE_URL}/api/v1/listings/${vehicleId}/publish-check`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to check listing (${response.status})`);
  return response.json();
}

export async function publishListing(vehicleId: string): Promise<ListingDraft> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/listings/${vehicleId}/publish`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Publish failed (${response.status})`);
  }
  const data = await response.json();
  return data.listing as ListingDraft;
}

export async function fetchListingDraft(vehicleId: string): Promise<ListingDraft> {
  const response = await fetch(`${API_BASE_URL}/api/v1/listings/${vehicleId}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to load listing (${response.status})`);
  const data = await response.json();
  return data.listing as ListingDraft;
}
