import { getAccessToken } from './authStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://autoverse-backend.vercel.app';

export async function fetchDealerDashboard(dealerId: string): Promise<any> {
  const token = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}/api/v1/dealers/${dealerId}/dashboard`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Failed to load dashboard (${response.status})`);
  return response.json();
}
