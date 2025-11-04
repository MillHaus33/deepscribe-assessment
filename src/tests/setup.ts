import { config } from 'dotenv';

// Load environment variables for testing
config({ path: '.env.test' });

// Set default test environment variables
process.env.CTGOV_API_BASE_URL =
  process.env.CTGOV_API_BASE_URL || 'https://clinicaltrials.gov/api/v2/studies';
