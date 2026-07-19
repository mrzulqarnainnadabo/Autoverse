/**
 * AUTOVERSE — AI AutoInspect
 * Shared type contracts between backend and mobile client.
 *
 * Design note: We treat every AutoInspect report as a legal-adjacent
 * artifact — it will be shown to buyers, attached to listings, and
 * potentially referenced in disputes. Types are intentionally strict
 * and every field is documented so the schema stays audit-friendly.
 */

export type InspectionAngle =
  | 'front_34'        // front three-quarter
  | 'rear_34'         // rear three-quarter
  | 'left_side'
  | 'right_side'
  | 'dashboard'
  | 'odometer'
  | 'engine_bay'
  | 'tires_front'
  | 'tires_rear'
  | 'interior_seats'
  | 'vin_plate'
  | 'undercarriage';  // optional, high-value for flood detection

export type Severity = 'info' | 'watch' | 'caution' | 'critical';

export type InspectionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface InspectionFlag {
  code: string;                 // e.g. "PANEL_GAP_MISALIGNMENT"
  severity: Severity;
  title: string;
  description: string;
  location?: string;            // e.g. "Rear right quarter panel"
  relatedAngle?: InspectionAngle;
}

export interface CategoryScore {
  category:
    | 'exterior_body'
    | 'paint_consistency'
    | 'tires_wheels'
    | 'glass_lighting'
    | 'interior'
    | 'engine_bay_visible'
    | 'flood_accident_indicators'
    | 'odometer_plausibility';
  score: number;                // 0–100
  summary: string;
}

export interface RepairEstimateItem {
  item: string;
  estimatedCostNGN: [number, number]; // [low, high] range
  urgency: 'cosmetic' | 'recommended' | 'urgent';
}

export interface AutoInspectReport {
  reportId: string;
  vehicleId: string;
  createdAt: string;             // ISO timestamp
  modelUsed: string;              // Claude model id used for analysis
  overallScore: number;           // 0–100
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

export interface AutoInspectRequestPhoto {
  angle: InspectionAngle;
  base64: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface AutoInspectRequest {
  vehicleId: string;
  sellerId: string;
  declaredMileageKm?: number;
  declaredYear?: number;
  declaredMake?: string;
  declaredModel?: string;
  photos: AutoInspectRequestPhoto[];
}
