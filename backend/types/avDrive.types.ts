/**
 * AUTOVERSE — AV Drive types
 * Structured private hire for verified owners (Abuja + Kaduna pilot).
 */

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

/** Structured status chips / system events the UI can render without free-text. */
export type AvDriveStatusSignal =
  | 'job_requested'
  | 'job_accepted'
  | 'owner_on_the_way'
  | 'owner_arrived'
  | 'client_ready'
  | 'trip_started'
  | 'trip_completed'
  | 'job_cancelled'
  | 'payment_logged';

export interface AvDriveProfile {
  id: string;
  userId: string;
  vehicleId: string | null;
  homeCity: AvDriveCity;
  jobTypes: AvDriveJobType[];
  isAvailable: boolean;
  availableFrom: string | null; // "HH:MM:SS"
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
  vehicleLabel: string | null; // "2018 Toyota Camry"
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
  conversationId: string | null; // job-anchored chat (reuses messaging when possible)
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
  signal: AvDriveStatusSignal | null;
  lat: number | null;
  lng: number | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
}

export interface AvDriveRating {
  id: string;
  jobId: string;
  fromUserId: string;
  toUserId: string;
  stars: number;
  comment: string | null;
  createdAt: string;
}

/** Request / body contracts */
export interface UpsertAvDriveProfileInput {
  vehicleId?: string | null;
  homeCity: AvDriveCity;
  jobTypes: AvDriveJobType[];
  bio?: string | null;
}

export interface SetAvailabilityInput {
  isAvailable: boolean;
  availableFrom?: string | null;
  availableTo?: string | null;
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
  scheduledAt: string; // ISO
  notes?: string | null;
  priceNgn?: number | null;
  /** Optional: request a specific partner */
  preferredProfileId?: string | null;
}

export interface RateAvDriveJobInput {
  stars: number;
  comment?: string | null;
}

export interface LocationPingInput {
  lat: number;
  lng: number;
  accuracyM?: number | null;
}
