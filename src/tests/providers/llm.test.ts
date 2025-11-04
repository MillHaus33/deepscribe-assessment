import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '@/lib/providers/openai';
import * as fs from 'fs';
import * as path from 'path';

describe('OpenAIProvider', () => {
  describe('Integration Test - Patient Extraction', () => {
    // Only run when TEST_EXTRACTION=true to avoid API costs during regular testing
    // This validates the full extraction pipeline with real OpenAI API
    const shouldRun = process.env.TEST_EXTRACTION === 'true';

    it(
      'should extract structured patient profile using real OpenAI API',
      { timeout: 30000, skip: !shouldRun },
      async () => {
        const { zodResponseFormat } = await import('openai/helpers/zod');
        const { PatientProfileSchema } = await import('@/lib/schemas');

        const systemPrompt = `You are a medical data extraction assistant. Extract structured patient information from transcripts.`;

        // Read the melanoma fixture
        const fixturePath = path.join(
          __dirname,
          '../fixtures/transcripts/melanoma_braf_ecog1.txt'
        );
        const transcript = fs.readFileSync(fixturePath, 'utf-8');

        // Create OpenAI provider and call real API (~$0.01 cost)
        const provider = new OpenAIProvider();
        const rawResponse = await provider.complete({
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Extract the patient profile from the following medical transcript:\n\n${transcript}`,
            },
          ],
          model: 'gpt-4o-2024-08-06',
          temperature: 0.1,
          response_format: zodResponseFormat(PatientProfileSchema, 'patient_profile'),
        });

        // Provider returns raw string
        expect(typeof rawResponse).toBe('string');

        // Parse and validate (business logic happens in calling layer)
        const profile = JSON.parse(rawResponse);
        const validation = PatientProfileSchema.safeParse(profile);
        expect(validation.success).toBe(true);

        // Validate extraction quality
        expect(profile.demographics.age).toBeGreaterThan(0);
        expect(['male', 'female', 'other']).toContain(profile.demographics.sex);

        const hasMelanoma = profile.conditions.some((c: string) =>
          c.toLowerCase().includes('melanoma')
        );
        expect(hasMelanoma).toBe(true);

        expect(profile.biomarkers).toBeDefined();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hasBRAF = profile.biomarkers?.some((b: any) => b.name.includes('BRAF'));
        expect(hasBRAF).toBe(true);
      }
    );
  });
});
