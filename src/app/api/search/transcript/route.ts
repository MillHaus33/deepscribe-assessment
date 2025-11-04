import { NextRequest, NextResponse } from 'next/server';
import { extractPatientProfile } from '@/lib/extract';
import { searchAndMapTrials, CTGovAPIError } from '@/lib/ctgov';

// Maximum file size for transcript uploads (non-sensitive configuration)
const MAX_FILE_SIZE = 1048576; // 1MB

/**
 * POST /api/search/transcript
 * Accepts a transcript file, extracts patient profile, and returns matching clinical trials.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Validate file presence
    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`,
        },
        { status: 400 }
      );
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    const isValidType =
      fileName.endsWith('.txt') ||
      fileName.endsWith('.md') ||
      fileType === 'text/plain' ||
      fileType === 'text/markdown';

    if (!isValidType) {
      return NextResponse.json(
        {
          error: 'Invalid file type. Only .txt and .md files are allowed',
        },
        { status: 400 }
      );
    }

    // Read file contents
    const transcript = await file.text();

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json(
        { error: 'Transcript file is empty' },
        { status: 400 }
      );
    }

    // Extract patient profile
    const patientProfile = await extractPatientProfile(transcript);

    // Validate that medical information was extracted
    // If no conditions, biomarkers, or stage are found, the transcript likely doesn't contain medical information
    if (
      (!patientProfile.conditions || patientProfile.conditions.length === 0) &&
      !patientProfile.biomarkers &&
      !patientProfile.stage
    ) {
      return NextResponse.json(
        {
          error:
            'No medical conditions identified in transcript. Please upload a valid patient-doctor conversation.',
        },
        { status: 400 }
      );
    }

    // Search for clinical trials
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
    console.error('API /search/transcript error:', message);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: message,
      },
      { status: 500 }
    );
  }
}
