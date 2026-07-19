/**
 * AUTOVERSE — Claude Vision Service
 * Wraps the Anthropic Messages API for AutoInspect photo analysis.
 */

import Anthropic from '@anthropic-ai/sdk';
import { randomUUID } from 'crypto';
import {
  AutoInspectRequest,
  AutoInspectReport,
  InspectionAngle,
} from '../types/autoinspect.types';
import { AUTOINSPECT_SYSTEM_PROMPT, buildUserContext } from '../prompts/autoInspectPrompt';

const RECOMMENDED_ANGLES: InspectionAngle[] = [
  'front_34',
  'rear_34',
  'left_side',
  'right_side',
  'dashboard',
  'odometer',
  'tires_front',
  'tires_rear',
  'interior_seats',
];

// Use Sonnet for the standard tier — strong vision reasoning at a
// price point that works for high-volume marketplace listings.
// Escalate to Opus for disputed/high-value listings (see escalate flag).
const MODEL_STANDARD = 'claude-sonnet-5';
const MODEL_HIGH_ACCURACY = 'claude-opus-4-8';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface AnalyzeOptions {
  escalateToHighAccuracy?: boolean; // for premium/dispute-flagged inspections
}

export class ClaudeVisionService {
  async analyzeVehicle(
    vehicleId: string,
    request: AutoInspectRequest,
    options: AnalyzeOptions = {}
  ): Promise<AutoInspectReport> {
    if (request.photos.length === 0) {
      throw new Error('At least one vehicle photo is required for AutoInspect.');
    }

    const model = options.escalateToHighAccuracy ? MODEL_HIGH_ACCURACY : MODEL_STANDARD;

    const imageBlocks = request.photos.map((photo) => ({
      type: 'image' as const,
      source: {
        type: 'base64' as const,
        media_type: photo.mediaType,
        data: photo.base64,
      },
    }));

    const labelBlock = {
      type: 'text' as const,
      text:
        'Image order and labels:\n' +
        request.photos.map((p, i) => `${i + 1}. ${p.angle}`).join('\n') +
        '\n\n' +
        buildUserContext({
          declaredYear: request.declaredYear,
          declaredMake: request.declaredMake,
          declaredModel: request.declaredModel,
          declaredMileageKm: request.declaredMileageKm,
        }),
    };

    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      system: AUTOINSPECT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [labelBlock, ...imageBlocks],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('AutoInspect model returned no text content.');
    }

    const parsed = this.parseModelJson(textBlock.text);
    const suppliedAngles = request.photos.map((p) => p.angle);
    const missingRecommended = RECOMMENDED_ANGLES.filter(
      (a) => !suppliedAngles.includes(a)
    );

    const report: AutoInspectReport = {
      reportId: randomUUID(),
      vehicleId,
      createdAt: new Date().toISOString(),
      modelUsed: model,
      overallScore: parsed.overallScore,
      grade: parsed.grade,
      confidence: parsed.confidence,
      categoryScores: parsed.categoryScores,
      flags: parsed.flags,
      repairEstimates: parsed.repairEstimates,
      odometerReadingKm: parsed.odometerReadingKm,
      odometerPlausible: parsed.odometerPlausible,
      imagesAnalyzed: suppliedAngles,
      imagesMissingRecommended: missingRecommended,
      disclaimer:
        parsed.disclaimer ||
        'This is an AI-generated visual assessment and does not replace an in-person mechanical inspection.',
    };

    return report;
  }

  /**
   * The model is instructed to return raw JSON only, but we defensively
   * strip any markdown fencing and validate required fields before
   * trusting the output — this report gets shown to real buyers.
   */
  private parseModelJson(raw: string): any {
    const cleaned = raw.trim().replace(/^```json\s*/i, '').replace(/```$/, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err) {
      throw new Error('Failed to parse AutoInspect model output as JSON.');
    }

    const requiredFields = [
      'overallScore',
      'grade',
      'confidence',
      'categoryScores',
      'flags',
      'repairEstimates',
    ];
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`AutoInspect model output missing required field: ${field}`);
      }
    }

    if (typeof parsed.overallScore !== 'number' || parsed.overallScore < 0 || parsed.overallScore > 100) {
      throw new Error('AutoInspect model returned an invalid overallScore.');
    }

    return parsed;
  }
}

export const claudeVisionService = new ClaudeVisionService();
