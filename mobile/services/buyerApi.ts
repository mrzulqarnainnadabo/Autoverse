import { getAccessToken } from './authStorage';
import { SearchFilters, SearchResponse, PublicListingDetail } from '../types/search.types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://autoverse-backend.vercel.app';

function buildQueryString(filters: SearchFilters): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  return params.toString();
}

export async function searchListings(filters: SearchFilters): Promise<SearchResponse> {
  const qs = buildQueryString(filters);
  const response = await fetch(`${API_BASE_URL}/api/v1/listings/search?${qs}`);
  if (!response.ok) throw new Error(`Search failed (${response.status})`);
  return response.json();
}

export async function fetchListingDetail(vehicleId: string): Promise<PublicListingDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/listings/${vehicleId}/public`);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Failed to load listing (${response.status})`);
  }
  const data = await response.json();
  return data.listing as PublicListingDetail;
}

export async function sendInquiry(
  vehicleId: string,
  input: { message: string; buyerName: string; buyerPhone: string }
): Promise<{ inquiryId: string; conversationId: string }> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/listings/${vehicleId}/inquiries`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Inquiry failed (${response.status})`);
  }
  return response.json();
}
