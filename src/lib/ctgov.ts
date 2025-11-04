import { PatientProfile, Trial, TrialSchema } from './schemas';

const CTGOV_API_BASE_URL =
  process.env.CTGOV_API_BASE_URL || 'https://clinicaltrials.gov/api/v2/studies';

/**
 * Custom error class for ClinicalTrials.gov API failures.
 * Thrown when the CT.gov API returns an error or the request fails.
 */
export class CTGovAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'CTGovAPIError';
  }
}

// ============================================================================
// Query Building
// ============================================================================

export interface CTGovQueryParams {
  'query.cond'?: string;
  'filter.overallStatus'?: string;
  'query.term'?: string;
  fields?: string;
  pageSize?: number;
  sort?: string;
  // TODO: Implement geographic filtering with proper distance-based format
  // 'filter.geo'?: string; // Requires: filter.geo=distance(lat,lon,radiusMi)
}

/**
 * Build ClinicalTrials.gov API v2 query parameters from a patient profile.
 * Constructs a query that filters trials based on the patient's conditions,
 * demographics, biomarkers, and location.
 *
 * @param profile - The patient profile with extracted medical information
 * @returns Query parameters object for the CT.gov API
 */
export function buildCTGovQuery(profile: PatientProfile): CTGovQueryParams {
  const params: CTGovQueryParams = {
    // Default to recruiting and not-yet-recruiting trials
    'filter.overallStatus': 'RECRUITING,NOT_YET_RECRUITING',

    // Request specific fields we need
    fields: [
      'NCTId',
      'BriefTitle',
      'OverallStatus',
      'Condition',
      'Phase',
      'InterventionName',
      'EligibilityCriteria',
      'MinimumAge',
      'MaximumAge',
      'Sex',
      'HealthyVolunteers',
      'LocationFacility',
      'LocationCity',
      'LocationState',
      'LocationCountry',
    ].join(','),

    // Page size (max 1000, but 20-50 is reasonable for initial results)
    pageSize: 20,

    // Sort by most recently updated
    sort: 'LastUpdatePostDate:desc',
  };

  // Build condition query from patient conditions
  if (profile.conditions && profile.conditions.length > 0) {
    // Join multiple conditions with OR logic
    params['query.cond'] = profile.conditions.join(' OR ');
  }

  // Build additional search terms from biomarkers and stage
  const searchTerms: string[] = [];

  if (profile.biomarkers && profile.biomarkers.length > 0) {
    profile.biomarkers.forEach((biomarker) => {
      if (biomarker.value) {
        searchTerms.push(`${biomarker.name} ${biomarker.value}`);
      } else {
        searchTerms.push(biomarker.name);
      }
    });
  }

  if (profile.stage) {
    searchTerms.push(profile.stage);
  }

  if (searchTerms.length > 0) {
    params['query.term'] = searchTerms.join(' OR ');
  }

  // TODO: Add geographic filtering with proper distance-based format
  // Requires geocoding location to lat/long and using: filter.geo=distance(lat,lon,radiusMi)

  return params;
}

/**
 * Convert query params object to URL query string.
 */
export function paramsToQueryString(params: CTGovQueryParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });

  return searchParams.toString();
}

// ============================================================================
// ClinicalTrials.gov API Client
// ============================================================================

/**
 * ClinicalTrials.gov API v2 response structure
 */
interface CTGovStudy {
  protocolSection?: {
    identificationModule?: {
      nctId?: string;
      briefTitle?: string;
    };
    statusModule?: {
      overallStatus?: string;
    };
    conditionsModule?: {
      conditions?: string[];
    };
    designModule?: {
      phases?: string[];
    };
    armsInterventionsModule?: {
      interventions?: Array<{
        name?: string;
      }>;
    };
    eligibilityModule?: {
      eligibilityCriteria?: string;
      minimumAge?: string;
      maximumAge?: string;
      sex?: string;
      healthyVolunteers?: boolean;
    };
    contactsLocationsModule?: {
      locations?: Array<{
        facility?: string;
        city?: string;
        state?: string;
        country?: string;
      }>;
    };
  };
}

interface CTGovResponse {
  studies?: CTGovStudy[];
  totalCount?: number;
}

/**
 * Search ClinicalTrials.gov for relevant trials and map to our Trial schema.
 *
 * @param profile - Patient profile with extracted medical information
 * @returns Array of validated Trial objects
 * @throws Error if API call fails or data validation fails
 */
export async function searchAndMapTrials(profile: PatientProfile): Promise<Trial[]> {
  try {
    // Build query parameters
    const queryParams = buildCTGovQuery(profile);
    const queryString = paramsToQueryString(queryParams);

    // Fetch from ClinicalTrials.gov API
    const url = `${CTGOV_API_BASE_URL}?${queryString}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new CTGovAPIError(
        `API returned ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data: CTGovResponse = await response.json();

    if (!data.studies || data.studies.length === 0) {
      return [];
    }

    // Map CT.gov studies to our Trial schema (includes validation)
    const trials = data.studies.map((study) => mapStudyToTrial(study)).filter((t) => t !== null);

    return trials;
  } catch (error) {
    // Re-throw CTGovAPIError as-is
    if (error instanceof CTGovAPIError) {
      throw error;
    }

    // Wrap other errors in CTGovAPIError
    if (error instanceof Error) {
      throw new CTGovAPIError(`Search failed: ${error.message}`);
    }
    throw new CTGovAPIError('Search failed with unknown error');
  }
}

/**
 * Map a CT.gov study to our Trial schema with validation.
 * Returns null if the study is missing required fields or fails validation.
 */
function mapStudyToTrial(study: CTGovStudy): Trial | null {
  const protocol = study.protocolSection;

  if (!protocol) {
    return null;
  }

  const nctId = protocol.identificationModule?.nctId;
  const title = protocol.identificationModule?.briefTitle;

  // NCT ID and title are required
  if (!nctId || !title) {
    return null;
  }

  try {
    const trial = {
      nctId,
      title,
      overallStatus: protocol.statusModule?.overallStatus || 'UNKNOWN',
      conditions: protocol.conditionsModule?.conditions || [],
      phases: protocol.designModule?.phases,
      interventions: protocol.armsInterventionsModule?.interventions?.map((i) => i.name || ''),
      eligibility: {
        criteriaText: protocol.eligibilityModule?.eligibilityCriteria,
        minAge: parseAge(protocol.eligibilityModule?.minimumAge),
        maxAge: parseAge(protocol.eligibilityModule?.maximumAge),
        sex: mapSex(protocol.eligibilityModule?.sex),
        healthyVolunteers: protocol.eligibilityModule?.healthyVolunteers,
      },
      locations: protocol.contactsLocationsModule?.locations?.map((loc) => ({
        facility: loc.facility,
        city: loc.city,
        state: loc.state,
        country: loc.country,
      })),
      url: `https://clinicaltrials.gov/study/${nctId}`,
    };

    // Validate against schema - returns validated Trial or throws
    return TrialSchema.parse(trial);
  } catch {
    // Invalid trial - return null to filter out
    return null;
  }
}

/**
 * Parse age string from CT.gov format (e.g., "18 Years", "6 Months") to our Age schema.
 */
function parseAge(ageStr?: string): { value: number; unit: 'Years' | 'Months' | 'Days' } | undefined {
  if (!ageStr) {
    return undefined;
  }

  // Match patterns like "18 Years", "6 Months", "30 Days"
  const match = ageStr.match(/^(\d+)\s*(Years?|Months?|Days?)$/i);

  if (!match) {
    return undefined;
  }

  const value = parseInt(match[1], 10);
  let unit: 'Years' | 'Months' | 'Days' = 'Years';

  const unitStr = match[2].toLowerCase();
  if (unitStr.startsWith('month')) {
    unit = 'Months';
  } else if (unitStr.startsWith('day')) {
    unit = 'Days';
  }

  return { value, unit };
}

/**
 * Map CT.gov sex values to our Sex schema.
 */
function mapSex(sex?: string): 'ALL' | 'FEMALE' | 'MALE' | null {
  if (!sex) {
    return null;
  }

  const normalized = sex.toUpperCase();

  if (normalized === 'ALL' || normalized === 'BOTH') {
    return 'ALL';
  } else if (normalized === 'FEMALE') {
    return 'FEMALE';
  } else if (normalized === 'MALE') {
    return 'MALE';
  }

  return null;
}
