import { InspectionAngle, AutoInspectReport } from './autoinspect.types';

export type Transmission = 'automatic' | 'manual';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export interface VehiclePhotoRecord {
  id: string;
  url: string;
  angle: InspectionAngle | null;
  position: number;
  isCover: boolean;
}

export interface ListingDraft {
  vehicleId: string;
  dealerId: string | null;
  status: 'draft' | 'active' | 'sold' | 'archived';
  make: string | null;
  model: string | null;
  year: number | null;
  mileageKm: number | null;
  priceNGN: number | null;
  description: string | null;
  transmission: Transmission | null;
  fuelType: FuelType | null;
  state: string | null;
  lga: string | null;
  photos: VehiclePhotoRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface PublishCheckResult {
  canPublish: boolean;
  missingFields: string[];
}

/** A photo captured locally, before it's uploaded to the server. */
export interface LocalListingPhoto {
  angle: InspectionAngle | null;
  uri: string;
}

export interface ListingDetailsFormState {
  make: string;
  model: string;
  year: string;
  mileageKm: string;
  priceNGN: string;
  description: string;
  transmission: Transmission | null;
  fuelType: FuelType | null;
  state: string;
  lga: string;
}

export type { AutoInspectReport };
