import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/search/transcript/route';
import { NextRequest } from 'next/server';

// Mock the LLM provider to return raw JSON strings
vi.mock('@/lib/providers/llm', () => ({
  getLLMProvider: vi.fn(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    complete: vi.fn(async (options: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMessage = options.messages.find((m: any) => m.role === 'user')?.content || '';

      // Simple keyword-based mock for melanoma transcripts that returns raw JSON string
      if (userMessage.includes('melanoma') || userMessage.includes('Melanoma')) {
        const profile = {
          demographics: { age: 55, sex: 'male' },
          conditions: ['Metastatic Melanoma'],
          biomarkers: [{ name: 'BRAF', value: 'V600E' }],
          stage: 'Stage IV',
          performanceStatus: 'ECOG 1',
          location: { city: 'San Francisco', state: 'CA' },
          ctgovQuery: {
            conditionQuery: 'melanoma',
            termQuery: '(BRAF V600E) OR (BRAF mutation) OR (BRAF V600) OR (metastatic) OR (stage IV)',
          },
        };
        return JSON.stringify(profile); // Return raw JSON string
      }

      // Default profile
      const defaultProfile = {
        demographics: { age: 50, sex: 'other' },
        conditions: ['General Condition'],
        ctgovQuery: {
          conditionQuery: 'general condition',
          termQuery: '',
        },
      };
      return JSON.stringify(defaultProfile); // Return raw JSON string
    }),
  })),
}));

// Helper to create a File object for testing
function createTestFile(content: string, filename: string, type: string = 'text/plain'): File {
  const blob = new Blob([content], { type });
  return new File([blob], filename, { type });
}

describe('POST /api/search/transcript - Integration Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Mock fetch for CT.gov API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should return 400 when file is missing', async () => {
    // Create empty FormData
    const formData = new FormData();

    const request = new NextRequest('http://localhost:3000/api/search/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error).toBe('file is required');
  });

  it('should return 502 when ClinicalTrials.gov API fails', async () => {
    // Mock CT.gov API failure
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const transcriptContent = 'Patient with melanoma and BRAF mutation';
    const file = createTestFile(transcriptContent, 'test.txt');

    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost:3000/api/search/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(502);

    const data = await response.json();
    expect(data.error).toBe('ClinicalTrials.gov service unavailable');
  });

  it('should return profile and trials in successful response', async () => {
    // Mock successful CT.gov API response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        studies: [
          {
            protocolSection: {
              identificationModule: {
                nctId: 'NCT12345678',
                briefTitle: 'Test Trial for Melanoma',
              },
              statusModule: {
                overallStatus: 'RECRUITING',
              },
              descriptionModule: {
                briefSummary: 'A test trial summary',
              },
              conditionsModule: {
                conditions: ['Melanoma'],
              },
              contactsLocationsModule: {
                locations: [
                  {
                    city: 'San Francisco',
                    state: 'California',
                    country: 'United States',
                    facility: 'Test Hospital',
                  },
                ],
              },
            },
          },
        ],
      }),
    });

    const transcriptContent = 'Patient with melanoma and BRAF V600E mutation';
    const file = createTestFile(transcriptContent, 'test.txt');

    const formData = new FormData();
    formData.append('file', file);

    const request = new NextRequest('http://localhost:3000/api/search/transcript', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);

    const data = await response.json();

    // Verify response includes both profile and trials
    expect(data).toHaveProperty('profile');
    expect(data).toHaveProperty('trials');

    // Verify profile structure
    expect(data.profile).toMatchObject({
      demographics: { age: 55, sex: 'male' },
      conditions: ['Metastatic Melanoma'],
      biomarkers: [{ name: 'BRAF', value: 'V600E' }],
      stage: 'Stage IV',
      performanceStatus: 'ECOG 1',
      ctgovQuery: {
        conditionQuery: 'melanoma',
        termQuery: '(BRAF V600E) OR (BRAF mutation) OR (BRAF V600) OR (metastatic) OR (stage IV)',
      },
    });

    // Verify trials array
    expect(Array.isArray(data.trials)).toBe(true);
    expect(data.trials.length).toBeGreaterThan(0);
    expect(data.trials[0]).toMatchObject({
      nctId: 'NCT12345678',
      title: 'Test Trial for Melanoma',
      overallStatus: 'RECRUITING',
    });
  });
});
