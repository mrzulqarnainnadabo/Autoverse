export type SenderRole = 'buyer' | 'dealer' | 'seller';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: SenderRole;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  role: SenderRole;
}

export interface ConversationVehicleContext {
  vehicleId: string;
  title: string;         // "2019 Toyota Camry"
  priceNGN: number;
  primaryImageUrl: string | null;
  status: string;
}

export interface ConversationSummary {
  conversationId: string;
  vehicle: ConversationVehicleContext;
  otherParticipant: ConversationParticipant;
  lastMessage: { body: string; createdAt: string; senderRole: SenderRole } | null;
  unreadCount: number;
  lastMessageAt: string;
}

export interface ConversationDetail extends ConversationSummary {
  myRole: SenderRole;
}
