import { describe, it, expect, vi } from 'vitest';
import { extractPatientProfile } from '@/lib/extract';
import * as fs from 'fs';
import * as path from 'path';

// Mock the LLM provider to return raw JSON strings
vi.mock('@/lib/providers/llm', () => ({
  getLLMProvider: vi.fn(() => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    complete: vi.fn(async (options: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userMessage = options.messages.find((m: any) => m.role === 'user')?.content || '';

      // Simple keyword-based mock that returns raw JSON string (not parsed object)
      if (userMessage.includes('melanoma') || userMessage.includes('Melanoma')) {
        const profile = {
          demographics: {
            age: userMessage.includes('55') ? 55 : null,
            sex: userMessage.includes('male') ? 'male' : null,
          },
          conditions: ['Metastatic Melanoma'],
          biomarkers: userMessage.includes('BRAF') ? [{ name: 'BRAF', value: 'V600E' }] : undefined,
          stage: userMessage.includes('Stage IV') ? 'Stage IV' : undefined,
          performanceStatus: userMessage.includes('ECOG') ? 'ECOG 1' : undefined,
          priorTherapies: userMessage.includes('therapy') ? ['Prior immunotherapy'] : undefined,
          location: userMessage.includes('San Francisco')
            ? { city: 'San Francisco', state: 'CA' }
            : undefined,
          ctgovQuery: {
            conditionQuery: 'melanoma',
            termQuery: [
              userMessage.includes('BRAF') ? '(BRAF V600E) OR (BRAF mutation) OR (BRAF V600)' : '',
              userMessage.includes('Stage IV') ? '(metastatic) OR (stage IV)' : '',
            ].filter(Boolean).join(' OR '),
          },
        };
        return JSON.stringify(profile); // Return raw JSON string
      }

      // Default profile
      const defaultProfile = {
        demographics: { age: 50, sex: 'other' },
        conditions: ['General Condition'],
        ctgovQuery: {
          conditionQuery: 'General Condition',
          termQuery: '',
        },
      };
      return JSON.stringify(defaultProfile); // Return raw JSON string
    }),
  })),
}));

// Helper to read fixture files
function readFixture(filename: string): string {
  const fixturePath = path.join(__dirname, 'fixtures', 'transcripts', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
}

describe('extractPatientProfile', () => {
  it('should extract complete profile from melanoma BRAF transcript', async () => {
    const transcript = readFixture('melanoma_braf_ecog1.txt');

    const profile = await extractPatientProfile(transcript);

    // Verify key extracted data (validation happens at runtime in extract.ts)
    expect(profile.demographics.age).toBe(55);
    expect(profile.demographics.sex).toBe('male');
    expect(profile.conditions).toContain('Metastatic Melanoma');
    expect(profile.stage).toBe('Stage IV');
    expect(profile.biomarkers).toBeDefined();
    expect(profile.biomarkers?.some((b) => b.name === 'BRAF')).toBe(true);
    expect(profile.priorTherapies).toBeDefined();
    expect(profile.performanceStatus).toBe('ECOG 1');
    expect(profile.location?.city).toBe('San Francisco');

    // Verify ctgovQuery follows new prompt guidance
    expect(profile.ctgovQuery.conditionQuery).toBe('melanoma');
    expect(profile.ctgovQuery.termQuery).toContain('BRAF');
    expect(profile.ctgovQuery.conditionQuery).not.toContain('BRAF');
    expect(profile.ctgovQuery.conditionQuery).not.toContain('AND');
  });

  it('should throw error for empty transcript', async () => {
    await expect(extractPatientProfile('')).rejects.toThrow('Transcript cannot be empty');
  });
});
