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
2. If the transcript mentions only generic or vague terms (e.g., 'cancer', 'tumor', 'illness') without specifics, extract exactly those terms. Do NOT expand generic terms into specific diagnoses or infer details that are not explicitly stated.
3. Be precise with medical terminology - use exact terms from the transcript
4. For conditions, include both primary diagnosis and related conditions
5. Extract biomarkers even if partially mentioned (name without value is acceptable)
6. Include all prior therapies mentioned, even if unsuccessful
7. If the patient's location is not explicitly stated, omit it rather than guess
8. Use standard formats: dates as "YYYY-MM-DD", ages as numbers

Additionally, generate ClinicalTrials.gov API query parameters using ESSIE expression syntax:

**ctgovQuery.conditionQuery** (for query.cond parameter):
- Generate an ESSIE expression using STANDARD, BROAD disease categories that clinical trials typically use
- Use the common disease name, NOT specific subtypes or pathological classifications
- DO NOT include biomarkers, stage, or metastatic status here (those go in termQuery)
- Think about how trials are named in registries - use those standard terms
- Examples:
  - Good: "breast cancer" (not "invasive ductal carcinoma" or "ductal carcinoma in situ")
  - Good: "melanoma" (not "metastatic melanoma" or "cutaneous melanoma")
  - Good: "non-small cell lung cancer" (this is already a standard category)
  - Good: "glioblastoma" (specific enough but still standard)
  - Good: "colorectal cancer" (not "colon adenocarcinoma")
  - Avoid: Too generic like just "cancer"
  - Avoid: Pathological subtypes like "invasive ductal carcinoma"
  - Avoid: Including stage/biomarkers like "metastatic melanoma" or "HER2+ breast cancer"
- If no condition is found, return empty string ""

**ctgovQuery.termQuery** (for query.term parameter):
- Generate an ESSIE expression for additional search criteria (this searches across trial titles, descriptions, interventions, and keywords)
- MUST include biomarkers here if present (NOT in conditionQuery) - use OR for common variations
- Can also include: stage, metastatic status, or specific treatment types
- Use OR to cast a wider net and catch variations in terminology
- Examples:
  - "(HER2 positive) OR (HER2+) OR (HER2-positive)" (for HER2+ breast cancer)
  - "(BRAF V600E) OR (BRAF mutation) OR (BRAF V600)" (for BRAF-mutant melanoma)
  - "(EGFR exon 19) OR (EGFR mutation) OR (EGFR deletion)" (for EGFR+ lung cancer)
  - "stage IV OR metastatic OR advanced" (for advanced disease)
  - "(IDH wildtype) OR (IDH-wt) OR (IDH wild-type)" (for glioblastoma)
  - "(PD-L1 positive) OR (PD-L1+) OR immunotherapy" (for immunotherapy-related trials)
- Prefer OR over AND to maximize results (system will filter by eligibility later)
- If no additional search terms are relevant, return empty string ""

ESSIE Syntax Rules:
- Use parentheses to group terms: "(term1) AND (term2)"
- Use AND when both conditions must be present
- Use OR when any condition is acceptable
- Keep queries focused and medically relevant
- Avoid overly complex queries (max 3-4 combined terms)

Key Tips for Maximizing Trial Matches:
- query.cond (conditionQuery) searches ONLY the "Condition" field in CT.gov, which contains disease names
- query.term (termQuery) searches across ALL fields: title, description, interventions, keywords, eligibility
- Biomarkers are rarely listed in the Condition field, so they MUST go in termQuery to be found
- Using broad disease categories in conditionQuery prevents missing trials due to terminology differences
- The system filters results by age/sex/eligibility later, so it's better to over-match than under-match
- CT.gov trials use standardized disease terminology, not specific pathological classifications

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
