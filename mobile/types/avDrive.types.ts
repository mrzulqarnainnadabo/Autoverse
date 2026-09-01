/** Mirror of backend AV Drive contracts for the mobile client. */

export type AvDriveCity = 'Abuja' | 'Kaduna';
export type AvDriveJobType = 'airport_transfer' | 'intercity';
export type AvDriveJobStatus =
  | 'requested'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';
export type AvDrivePaymentStatus = 'unpaid' | 'logged' | 'paid' | 'refunded';
export type AvDriveKycStatus = 'pending' | 'verified' | 'rejected';
export type AvDriveStatusSignal =
  | 'owner_on_the_way'
  | 'owner_arrived'
  | 'client_ready'
  | 'trip_started'
  | 'trip_completed';

export interface AvDriveProfile {
  id: string;
  userId: string;
  vehicleId: string | null;
  homeCity: AvDriveCity;
  jobTypes: AvDriveJobType[];
  isAvailable: boolean;
  availableFrom: string | null;
  availableTo: string | null;
  workReady: boolean;
  kycStatus: AvDriveKycStatus;
  bio: string | null;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvDrivePartnerPublic {
  profileId: string;
  userId: string;
  displayName: string;
  homeCity: AvDriveCity;
  jobTypes: AvDriveJobType[];
  workReady: boolean;
  ratingAvg: number;
  ratingCount: number;
  vehicleId: string | null;
  vehicleLabel: string | null;
}

export interface AvDriveJobGeo {
  pickupLabel: string;
  dropoffLabel: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
}

export interface AvDriveJob {
  id: string;
  clientId: string;
  ownerId: string | null;
  profileId: string | null;
  vehicleId: string | null;
  conversationId: string | null;
  jobType: AvDriveJobType;
  corridor: string | null;
  city: AvDriveCity | null;
  geo: AvDriveJobGeo;
  scheduledAt: string;
  notes: string | null;
  status: AvDriveJobStatus;
  priceNgn: number | null;
  paymentStatus: AvDrivePaymentStatus;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvDriveJobEvent {
  id: string;
  jobId: string;
  actorId: string | null;
  eventType: string;
  signal: string | null;
  lat: number | null;
  lng: number | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface AvDriveContact {
  otherUserId: string;
  phone: string | null;
  whatsappUrl: string | null;
  telUrl: string | null;
}

export interface CreateAvDriveJobInput {
  jobType: AvDriveJobType;
  city?: AvDriveCity | null;
  corridor?: string | null;
  pickupLabel: string;
  dropoffLabel: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  scheduledAt: string;
  notes?: string | null;
  priceNgn?: number | null;
  preferredProfileId?: string | null;
}
