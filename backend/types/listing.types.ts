import { InspectionAngle } from './autoinspect.types';

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
  dealerId: string;
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

export interface UpdateListingDetailsInput {
  make?: string;
  model?: string;
  year?: number;
  mileageKm?: number;
  priceNGN?: number;
  description?: string;
  transmission?: Transmission;
  fuelType?: FuelType;
  state?: string;
  lga?: string;
}

export interface PublishValidationResult {
  canPublish: boolean;
  missingFields: string[];
}
