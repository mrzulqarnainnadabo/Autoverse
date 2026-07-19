export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type VehicleStatus = 'draft' | 'active' | 'sold' | 'archived';
export type InquiryStatus = 'new' | 'contacted' | 'closed';
export type AutoInspectGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface DealerDashboardSummary {
  dealerId: string;
  businessName: string;
  verificationStatus: VerificationStatus;
  subscriptionTier: 'free' | 'plus' | 'pro';
  activeListings: number;
  soldThisMonth: number;
  totalViews30d: number;
  totalInquiries30d: number;
  newInquiries: number;
  avgAutoInspectScore: number | null;
}

export interface DealerListingItem {
  vehicleId: string;
  make: string;
  model: string;
  year: number;
  mileageKm: number;
  priceNGN: number;
  status: VehicleStatus;
  primaryImageUrl: string | null;
  autoInspectScore: number | null;
  autoInspectGrade: AutoInspectGrade | null;
  views30d: number;
  inquiries30d: number;
  createdAt: string;
  updatedAt: string;
}

export interface DealerInquiryItem {
  id: string;
  vehicleId: string;
  vehicleLabel: string;
  buyerName: string;
  buyerPhone: string;
  message: string | null;
  status: InquiryStatus;
  createdAt: string;
}

export interface DealerDashboardResponse {
  summary: DealerDashboardSummary;
  listings: DealerListingItem[];
  recentInquiries: DealerInquiryItem[];
}
