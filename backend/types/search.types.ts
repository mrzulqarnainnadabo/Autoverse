import { InspectionAngle, InspectionFlag, CategoryScore, RepairEstimateItem, InspectionGrade } from './autoinspect.types';
import { Transmission, FuelType } from './listing.types';

export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'ai_score';
export type ConditionFilter = 'excellent' | 'good' | 'fair' | 'any'; // maps to AutoInspect grade bands

export interface SearchFilters {
  q?: string;                 // free-text: matches make/model
  make?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  state?: string;
  condition?: ConditionFilter;
  transmission?: Transmission;
  fuelType?: FuelType;
  sort?: SortOption;
  page?: number;
  limit?: number;
}

export interface SearchResultItem {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  priceNGN: number;
  state: string | null;
  lga: string | null;
  primaryImageUrl: string | null;
  autoInspectScore: number | null;
  autoInspectGrade: InspectionGrade | null;
  dealerBusinessName: string | null;
  dealerVerified: boolean;
  publishedAt: string;
}

export interface SearchResponse {
  results: SearchResultItem[];
  totalCount: number;
  page: number;
  limit: number;
}

export interface PublicListingDetail {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  priceNGN: number;
  description: string | null;
  transmission: Transmission | null;
  fuelType: FuelType | null;
  state: string | null;
  lga: string | null;
  publishedAt: string;
  photos: { url: string; angle: InspectionAngle | null; position: number }[];
  dealer: {
    id: string | null;
    businessName: string;
    verified: boolean;
    ratingAvg: number;
    ratingCount: number;
    phone: string | null;
  };
  autoInspect: {
    reportId: string;
    overallScore: number;
    grade: InspectionGrade;
    confidence: string;
    categoryScores: CategoryScore[];
    flags: InspectionFlag[];
    repairEstimates: RepairEstimateItem[];
    disclaimer: string;
  } | null;
}

export interface CreateInquiryInput {
  message: string;
  buyerName: string;
  buyerPhone: string;
}
