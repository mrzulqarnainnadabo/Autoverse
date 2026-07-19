export type InspectionAngle =
  | 'front_34'
  | 'rear_34'
  | 'left_side'
  | 'right_side'
  | 'dashboard'
  | 'odometer'
  | 'engine_bay'
  | 'tires_front'
  | 'tires_rear'
  | 'interior_seats'
  | 'vin_plate'
  | 'undercarriage';

export type Severity = 'info' | 'watch' | 'caution' | 'critical';
export type InspectionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface InspectionFlag {
  code: string;
  severity: Severity;
  title: string;
  description: string;
  location?: string;
  relatedAngle?: InspectionAngle;
}

export interface CategoryScore {
  category: string;
  score: number;
  summary: string;
}

export interface RepairEstimateItem {
  item: string;
  estimatedCostNGN: [number, number];
  urgency: 'cosmetic' | 'recommended' | 'urgent';
}

export interface AutoInspectReport {
  reportId: string;
  vehicleId: string;
  createdAt: string;
  overallScore: number;
  grade: InspectionGrade;
  confidence: 'low' | 'medium' | 'high';
  categoryScores: CategoryScore[];
  flags: InspectionFlag[];
  repairEstimates: RepairEstimateItem[];
  odometerReadingKm: number | null;
  odometerPlausible: boolean | null;
  imagesAnalyzed: InspectionAngle[];
  imagesMissingRecommended: InspectionAngle[];
  disclaimer: string;
}

export interface CapturedPhoto {
  angle: InspectionAngle;
  uri: string;
}
