import { pool } from '../db/pool';
import { AutoInspectReport } from '../types/autoinspect.types';

export async function saveAutoInspectReport(
  report: AutoInspectReport,
  sellerId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO autoinspect_reports
       (report_id, vehicle_id, seller_id, model_used, overall_score, grade,
        confidence, category_scores, flags, repair_estimates,
        odometer_reading_km, odometer_plausible, images_analyzed,
        images_missing_recommended, disclaimer, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
      report.reportId,
      report.vehicleId,
      sellerId,
      report.modelUsed,
      report.overallScore,
      report.grade,
      report.confidence,
      JSON.stringify(report.categoryScores),
      JSON.stringify(report.flags),
      JSON.stringify(report.repairEstimates),
      report.odometerReadingKm,
      report.odometerPlausible,
      JSON.stringify(report.imagesAnalyzed),
      JSON.stringify(report.imagesMissingRecommended),
      report.disclaimer,
      report.createdAt,
    ]
  );
}
