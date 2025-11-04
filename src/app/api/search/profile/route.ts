import { NextRequest, NextResponse } from 'next/server';
import { PatientProfileSchema } from '@/lib/schemas';
import { searchAndMapTrials, CTGovAPIError } from '@/lib/ctgov';

/**
 * POST /api/search/profile
 * Accepts a patient profile and searches for matching clinical trials.
 * Skips LLM extraction since profile is already structured.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON body
    const body = await request.json();

    // Validate profile is present
    if (!body.profile) {
      return NextResponse.json({ error: 'profile is required' }, { status: 400 });
    }

    // Validate and parse the patient profile
    const parseResult = PatientProfileSchema.safeParse(body.profile);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid patient profile data',
          details: parseResult.error.message,
        },
        { status: 400 }
      );
    }

    const patientProfile = parseResult.data;

    // Validate that medical information exists
    // If no conditions, biomarkers, or stage, it's likely invalid
    if (
      (!patientProfile.conditions || patientProfile.conditions.length === 0) &&
      !patientProfile.biomarkers &&
      !patientProfile.stage
    ) {
      return NextResponse.json(
        {
          error:
            'No medical conditions in profile. Please provide at least one condition, biomarker, or stage.',
        },
        { status: 400 }
      );
    }

    // Search for clinical trials using the profile
    const trials = await searchAndMapTrials(patientProfile);

    // Return profile and trials
    return NextResponse.json(
      {
        profile: patientProfile,
        trials,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle ClinicalTrials.gov API errors (type-safe)
    if (error instanceof CTGovAPIError) {
      return NextResponse.json(
        {
          error: 'ClinicalTrials.gov service unavailable',
          details: error.message,
        },
        { status: 502 }
      );
    }

    // Handle all other unexpected errors
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('API /search/profile error:', message);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: message,
      },
      { status: 500 }
    );
  }
}
