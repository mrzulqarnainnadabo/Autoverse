import { getAccessToken } from './authStorage';
import { ConversationSummary, ConversationDetail, Message } from '../types/messaging.types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.autoverse.ng';

async function authHeaders() {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/v1/conversations`, { headers: await authHeaders() });
  if (!response.ok) throw new Error(`Failed to load messages (${response.status})`);
  const data = await response.json();
  return data.conversations as ConversationSummary[];
}

export async function fetchConversation(conversationId: string): Promise<ConversationDetail> {
  const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to load conversation (${response.status})`);
  const data = await response.json();
  return data.conversation as ConversationDetail;
}

export async function fetchMessages(conversationId: string, before?: string): Promise<Message[]> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/messages${qs}`, {
    headers: await authHeaders(),
  });
  if (!response.ok) throw new Error(`Failed to load messages (${response.status})`);
  const data = await response.json();
  return data.messages as Message[];
}

export async function sendChatMessage(conversationId: string, body: string): Promise<Message> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Failed to send message (${response.status})`);
  }
  const data = await response.json();
  return data.message as Message;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const headers = await authHeaders();
  await fetch(`${API_BASE_URL}/api/v1/conversations/${conversationId}/read`, {
    method: 'POST',
    headers,
  });
}

export async function startConversation(vehicleId: string): Promise<{ conversationId: string }> {
  const headers = await authHeaders();
  const response = await fetch(`${API_BASE_URL}/api/v1/vehicles/${vehicleId}/conversations`, {
    method: 'POST',
    headers,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Could not start conversation (${response.status})`);
  }
  return response.json();
}
