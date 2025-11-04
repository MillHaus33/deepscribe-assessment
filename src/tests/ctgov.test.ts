import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchAndMapTrials, buildCTGovQuery } from '@/lib/ctgov';
import { PatientProfile } from '@/lib/schemas';
import * as fs from 'fs';
import * as path from 'path';

// Helper to read fixture files
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readFixture(filename: string): any {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));
}

describe('searchAndMapTrials', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Mock fetch
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    // Restore fetch
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should search and map trials successfully', async () => {
    const mockResponse = readFixture('ctgov_search_minimal.json');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const profile: PatientProfile = {
      demographics: { age: 55, sex: 'male' },
      conditions: ['Metastatic Melanoma'],
      biomarkers: [{ name: 'BRAF', value: 'V600E' }],
      ctgovQuery: {
        conditionQuery: 'melanoma',
        termQuery: '(BRAF V600E) OR (BRAF mutation) OR (BRAF V600) OR (metastatic) OR (stage IV)',
      },
    };

    const trials = await searchAndMapTrials(profile);

    // Basic structure
    expect(trials).toHaveLength(2);
    expect(trials[0].nctId).toBe('NCT04267848');
    expect(trials[0].title).toContain('Metastatic Melanoma');
    expect(trials[0].overallStatus).toBe('RECRUITING');
    expect(trials[0].conditions).toContain('Metastatic Melanoma');
    expect(trials[0].phases).toEqual(['Phase 2']);
    expect(trials[0].url).toBe('https://clinicaltrials.gov/study/NCT04267848');

    // Eligibility mapping
    expect(trials[0].eligibility.minAge).toEqual({ value: 18, unit: 'Years' });
    expect(trials[0].eligibility.maxAge).toEqual({ value: 75, unit: 'Years' });
    expect(trials[0].eligibility.sex).toBe('ALL');
    expect(trials[0].eligibility.criteriaText).toContain('Age ≥18 years');
    expect(trials[0].eligibility.criteriaText).toContain('BRAF V600E');

    // Locations mapping
    expect(trials[0].locations).toBeDefined();
    expect(trials[0].locations?.length).toBe(2);
    expect(trials[0].locations?.[0].facility).toBe('MD Anderson Cancer Center');
    expect(trials[0].locations?.[0].city).toBe('Houston');
    expect(trials[0].locations?.[0].state).toBe('TX');

    // Interventions mapping
    expect(trials[0].interventions).toBeDefined();
    expect(trials[0].interventions?.length).toBe(2);
    expect(trials[0].interventions).toContain('BRAF Inhibitor XYZ');
  });

  it('should return empty array when no studies found', async () => {
    const mockResponse = readFixture('ctgov_search_empty.json');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const profile: PatientProfile = {
      demographics: { age: 50, sex: 'other' },
      conditions: ['Very Rare Disease'],
      ctgovQuery: {
        conditionQuery: 'Very Rare Disease',
        termQuery: '',
      },
    };

    const trials = await searchAndMapTrials(profile);

    expect(trials).toHaveLength(0);
  });

  it('should throw CTGovAPIError when API returns non-OK status', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const profile: PatientProfile = {
      demographics: { age: 55, sex: 'male' },
      conditions: ['Melanoma'],
      ctgovQuery: {
        conditionQuery: 'melanoma',
        termQuery: '',
      },
    };

    await expect(searchAndMapTrials(profile)).rejects.toThrow('API returned 500');
  });

  it('should throw CTGovAPIError when fetch fails', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const profile: PatientProfile = {
      demographics: { age: 55, sex: 'male' },
      conditions: ['Melanoma'],
      ctgovQuery: {
        conditionQuery: 'melanoma',
        termQuery: '',
      },
    };

    await expect(searchAndMapTrials(profile)).rejects.toThrow('Search failed: Network error');
  });
});

describe('buildCTGovQuery', () => {
  it('should build query with LLM-generated ESSIE syntax', () => {
    const profile: PatientProfile = {
      demographics: { age: 55, sex: 'male' },
      conditions: ['Metastatic Melanoma', 'BRAF V600E Mutation'],
      biomarkers: [{ name: 'BRAF', value: 'V600E' }],
      ctgovQuery: {
        conditionQuery: 'melanoma',
        termQuery: '(BRAF V600E) OR (BRAF mutation) OR (BRAF V600) OR (metastatic) OR (stage IV)',
      },
    };

    const query = buildCTGovQuery(profile);

    // LLM-generated queries are used directly (broad disease category, biomarkers in termQuery)
    expect(query['query.cond']).toBe('melanoma');
    expect(query['query.term']).toBe('(BRAF V600E) OR (BRAF mutation) OR (BRAF V600) OR (metastatic) OR (stage IV)');
    expect(query['filter.overallStatus']).toBe('RECRUITING,NOT_YET_RECRUITING');
    expect(query.pageSize).toBe(20);
    // Demographic filters
    expect(query['filter.advanced']).toBe('AREA[MinimumAge]RANGE[MIN,55 years] AND AREA[MaximumAge]RANGE[55 years,MAX]');
    expect(query.aggFilters).toBe('sex:m');
  });

  it('should handle minimal profile with empty queries', () => {
    const profile: PatientProfile = {
      demographics: { age: null, sex: null },
      conditions: [],
      ctgovQuery: {
        conditionQuery: '',
        termQuery: '',
      },
    };

    const query = buildCTGovQuery(profile);

    // Empty queries should not be added to params
    expect(query['query.cond']).toBeUndefined();
    expect(query['query.term']).toBeUndefined();
    expect(query['filter.overallStatus']).toBeDefined();
    expect(query.fields).toBeDefined();
  });

  it('should handle complex queries with biomarkers and stage', () => {
    const profile: PatientProfile = {
      demographics: { age: 55, sex: 'male' },
      conditions: ['Melanoma', 'Metastatic Cancer'],
      biomarkers: [
        { name: 'BRAF', value: 'V600E' },
        { name: 'PD-L1' },
      ],
      stage: 'Stage IV',
      ctgovQuery: {
        conditionQuery: 'melanoma',
        termQuery: '(BRAF V600E) OR (BRAF mutation) OR (PD-L1) OR (PD-L1 positive) OR (metastatic) OR (stage IV) OR (advanced)',
      },
    };

    const query = buildCTGovQuery(profile);

    // LLM generates queries with broad category + all biomarkers/stage in termQuery
    expect(query['query.cond']).toBe('melanoma');
    expect(query['query.term']).toBe('(BRAF V600E) OR (BRAF mutation) OR (PD-L1) OR (PD-L1 positive) OR (metastatic) OR (stage IV) OR (advanced)');
    // Biomarkers should NOT be in conditionQuery
    expect(query['query.cond']).not.toContain('BRAF');
    expect(query['query.cond']).not.toContain('PD-L1');
    // Demographic filters
    expect(query['filter.advanced']).toBe('AREA[MinimumAge]RANGE[MIN,55 years] AND AREA[MaximumAge]RANGE[55 years,MAX]');
    expect(query.aggFilters).toBe('sex:m');
  });
});

