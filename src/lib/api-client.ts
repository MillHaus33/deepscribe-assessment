import { SearchResponse, PatientProfile } from './schemas';

/**
 * Error response from the API
 */
export interface APIErrorResponse {
  error: string;
  details?: string;
}

/**
 * Custom error class for API errors
 */
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Search for clinical trials by uploading a patient transcript.
 *
 * @param file - The transcript file to upload (.txt or .md)
 * @returns Promise resolving to search results with trials
 * @throws APIError if the request fails or server returns an error
 */
export async function searchTrials(file: File): Promise<SearchResponse> {
  // Create form data
  const formData = new FormData();
  formData.append('file', file);

  try {
    // Make API request
    const response = await fetch('/api/search/transcript', {
      method: 'POST',
      body: formData,
    });

    // Handle error responses
    if (!response.ok) {
      const errorData: APIErrorResponse = await response.json();
      const errorMessage = errorData.error || `Server error (${response.status}): ${response.statusText}`;

      throw new APIError(errorMessage, response.status, errorData.details);
    }

    // Parse successful response
    return await response.json();
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Wrap network errors and other errors
    if (error instanceof Error) {
      throw new APIError(`Network error: ${error.message}`);
    }

    throw new APIError('An unexpected error occurred');
  }
}

/**
 * Search for clinical trials using a patient profile.
 *
 * @param profile - The patient profile with search criteria
 * @returns Promise resolving to search results with trials and profile
 * @throws APIError if the request fails or server returns an error
 */
export async function refineSearch(profile: PatientProfile): Promise<SearchResponse> {
  try {
    // Make API request
    const response = await fetch('/api/search/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ profile }),
    });

    // Handle error responses
    if (!response.ok) {
      const errorData: APIErrorResponse = await response.json();
      const errorMessage = errorData.error || `Server error (${response.status}): ${response.statusText}`;

      throw new APIError(errorMessage, response.status, errorData.details);
    }

    // Parse successful response
    return await response.json();
  } catch (error) {
    // Re-throw APIError as-is
    if (error instanceof APIError) {
      throw error;
    }

    // Wrap network errors and other errors
    if (error instanceof Error) {
      throw new APIError(`Network error: ${error.message}`);
    }

    throw new APIError('An unexpected error occurred');
  }
}
