import { z } from 'zod';

// ============================================================================
// Patient Profile Schema
// ============================================================================

export const DemographicsSchema = z.object({
  age: z.number().nullable(),
  sex: z.enum(['male', 'female', 'other']).nullable(),
});

export const BiomarkerSchema = z.object({
  name: z.string(),
  value: z.string().nullable().optional(),
});

export const LocationSchema = z.object({
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
});

export const CTGovQuerySchema = z.object({
  conditionQuery: z.string().nullable(),
  termQuery: z.string().nullable(),
});

export const PatientProfileSchema = z.object({
  demographics: DemographicsSchema,
  conditions: z.array(z.string()),
  diagnosisDate: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  biomarkers: z.array(BiomarkerSchema).nullable().optional(),
  priorTherapies: z.array(z.string()).nullable().optional(),
  performanceStatus: z.string().nullable().optional(),
  location: LocationSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  ctgovQuery: CTGovQuerySchema,
});

export type PatientProfile = z.infer<typeof PatientProfileSchema>;
export type Demographics = z.infer<typeof DemographicsSchema>;
export type Biomarker = z.infer<typeof BiomarkerSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type CTGovQuery = z.infer<typeof CTGovQuerySchema>;

// ============================================================================
// Clinical Trial Schema
// ============================================================================

export const AgeUnitSchema = z.enum(['Years', 'Months', 'Days']);

export const AgeSchema = z.object({
  value: z.number(),
  unit: AgeUnitSchema,
});

export const SexSchema = z.enum(['ALL', 'FEMALE', 'MALE']).nullable();

export const EligibilitySchema = z.object({
  criteriaText: z.string().optional(),
  minAge: AgeSchema.optional(),
  maxAge: AgeSchema.optional(),
  sex: SexSchema.optional(),
  healthyVolunteers: z.boolean().nullable().optional(),
});

export const TrialLocationSchema = z.object({
  facility: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

export const TrialSchema = z.object({
  nctId: z.string(),
  title: z.string(),
  overallStatus: z.string(),
  conditions: z.array(z.string()),
  phases: z.array(z.string()).optional(),
  interventions: z.array(z.string()).optional(),
  eligibility: EligibilitySchema,
  locations: z.array(TrialLocationSchema).optional(),
  url: z.string().url(),
});

export type Trial = z.infer<typeof TrialSchema>;
export type Eligibility = z.infer<typeof EligibilitySchema>;
export type TrialLocation = z.infer<typeof TrialLocationSchema>;
export type Age = z.infer<typeof AgeSchema>;
export type AgeUnit = z.infer<typeof AgeUnitSchema>;
export type Sex = z.infer<typeof SexSchema>;

// ============================================================================
// API Response Schema
// ============================================================================

export const SearchResponseSchema = z.object({
  trials: z.array(TrialSchema),
});

export type SearchResponse = z.infer<typeof SearchResponseSchema>;
