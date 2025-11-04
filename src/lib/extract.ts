import { zodResponseFormat } from 'openai/helpers/zod';
import { getLLMProvider } from './providers/llm';
import { PatientProfile, PatientProfileSchema } from './schemas';

/**
 * System prompt for medical transcript extraction.
 * Contains instructions for the LLM on what patient information to extract.
 */
const EXTRACTION_SYSTEM_PROMPT = `You are a medical data extraction assistant. Your job is to analyze patient-doctor conversation transcripts and extract structured patient information for clinical trial matching.

Extract the following information when available:
- **Demographics**: Patient age and sex (male/female/other)
- **Conditions**: All medical conditions, diagnoses, or diseases mentioned
- **Diagnosis Date**: When the primary diagnosis was made (if mentioned)
- **Stage**: Disease stage (e.g., "Stage IV", "Stage IIB", etc.)
- **Biomarkers**: Any genetic markers, mutations, or test results (e.g., "BRAF V600E", "HER2 Positive")
- **Prior Therapies**: Previous treatments, medications, or procedures
- **Performance Status**: ECOG or Karnofsky scores if mentioned
- **Location**: Patient's city, state, country, or zip code
- **Notes**: Any other relevant clinical information

Guidelines:
1. If information is not mentioned or unclear, use null or omit the field
2. Be precise with medical terminology - use exact terms from the transcript
3. For conditions, include both primary diagnosis and related conditions
4. Extract biomarkers even if partially mentioned (name without value is acceptable)
5. Include all prior therapies mentioned, even if unsuccessful
6. If the patient's location is not explicitly stated, omit it rather than guess
7. Use standard formats: dates as "YYYY-MM-DD", ages as numbers

Return a complete structured JSON object following the PatientProfile schema.`;

/**
 * Extract structured patient profile data from a medical transcript.
 * Uses the configured LLM provider with domain-specific extraction instructions.
 *
 * This function handles all business logic:
 * - Prompt construction (system + user messages)
 * - LLM configuration (model, temperature, response format)
 * - Response parsing (JSON)
 * - Schema validation
 *
 * @param transcript - The patient-doctor conversation transcript
 * @returns Promise resolving to a validated PatientProfile object
 * @throws Error if extraction fails or validation fails
 */
export async function extractPatientProfile(transcript: string): Promise<PatientProfile> {
  if (!transcript || transcript.trim().length === 0) {
    throw new Error('Transcript cannot be empty');
  }

  try {
    // Get the LLM provider (infrastructure)
    const provider = getLLMProvider();

    // Construct the messages (business logic)
    const userMessage = `Extract the patient profile from the following medical transcript:\n\n${transcript}`;

    // Call the LLM with business-driven configuration
    const rawResponse = await provider.complete({
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      model: 'gpt-4o-2024-08-06', // Business decision: which model to use
      temperature: 0.1, // Business decision: low temperature for consistent extraction
      response_format: zodResponseFormat(PatientProfileSchema, 'patient_profile'), // OpenAI-specific structured output
    });

    // Parse the JSON response (business logic)
    const parsedProfile = JSON.parse(rawResponse);

    // Validate with Zod schema (business logic - validate ONCE, not in provider)
    const validatedProfile = PatientProfileSchema.parse(parsedProfile);

    return validatedProfile;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Patient profile extraction failed: ${error.message}`);
    }
    throw new Error('Patient profile extraction failed with unknown error');
  }
}
