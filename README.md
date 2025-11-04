# DeepScribe Clinical Trials Matcher

A Next.js backend service that analyzes patient-doctor conversation transcripts using AI to extract structured medical data and match patients with relevant clinical trials from ClinicalTrials.gov.

---

## Overview

### Approach

This application implements a **backend MVP** with a simple API endpoint that processes medical transcripts and returns matching clinical trials.

**LLM Extraction:** Uses OpenAI GPT-4o with structured outputs to extract patient profiles from transcripts. The LLM is prompted to identify demographics (age, sex), medical conditions, biomarkers (e.g., BRAF V600E), disease stage, performance status, and location. Zod schemas enforce runtime validation to ensure data integrity.

**Clinical Trials Matching:** Queries the ClinicalTrials.gov API v2 with intelligent filtering. The query builder combines conditions and biomarkers into search terms, filters by recruiting status, and retrieves detailed trial information including eligibility criteria and locations.

**Architecture:** Modular design with clear separation of concerns - provider abstraction for LLM flexibility, business logic in extraction layer, and robust error handling with custom error types. TypeScript strict mode and comprehensive testing ensure production readiness.

---

## Live Demo

**API Endpoint:** `[Deployment URL will be added here]`

*(To be deployed on Vercel)*

---

## Local Setup

### Prerequisites

- Node.js 20+ and npm
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd deepscribe-assessment
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your OpenAI API key:
   ```env
   OPENAI_API_KEY=sk-your-actual-api-key-here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3000`

5. **Test the API**
   ```bash
   # Use the sample transcript
   curl -X POST http://localhost:3000/api/search \
     -F "file=@src/tests/fixtures/transcripts/melanoma_braf_ecog1.txt"
   ```

### Running Tests

```bash
npm test          # Run all tests (uses mocks, fast)
npm run build     # Build and type-check
npm run lint      # Check code quality
```

**Optional:** To run the real OpenAI integration test (~$0.01 cost), add `TEST_EXTRACTION=true` to `.env.test`, then run `npm test`.

---

## API Usage

### `POST /api/search`

Accepts a transcript file (`.txt` or `.md`, max 1MB) and returns matching clinical trials.

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/search \
  -F "file=@transcript.txt"
```

**Example Response:**
```json
{
  "trials": [
    {
      "nctId": "NCT04267848",
      "title": "Study of BRAF Inhibitor in Metastatic Melanoma",
      "overallStatus": "RECRUITING",
      "conditions": ["Metastatic Melanoma"],
      "phases": ["Phase 2"],
      "eligibility": {
        "minAge": { "value": 18, "unit": "Years" },
        "maxAge": { "value": 75, "unit": "Years" },
        "sex": "ALL"
      },
      "locations": [
        {
          "facility": "MD Anderson Cancer Center",
          "city": "Houston",
          "state": "TX"
        }
      ],
      "url": "https://clinicaltrials.gov/study/NCT04267848"
    }
  ]
}
```

---

## Assumptions

1. **Backend-only MVP** - Focus on robust API implementation; frontend UI is out of scope for this assessment
2. **Transcript format** - Plain text files (.txt or .md) containing patient-doctor conversations, max 1MB
3. **LLM reliability** - OpenAI structured outputs provide consistent JSON extraction without additional validation layers
4. **No authentication** - MVP doesn't require user auth or API keys for client requests
5. **No data persistence** - Transcripts are processed on-demand and not stored to comply with PHI regulations
6. **Privacy compliance** - Transcripts are never logged; only structured, de-identified data is processed
7. **ClinicalTrials.gov availability** - Assumes API is available; handles errors gracefully with 502 responses

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript (strict mode)
- **AI/LLM:** OpenAI GPT-4o with structured outputs
- **Validation:** Zod for runtime type safety
- **Testing:** Vitest (12 tests - unit, integration, and real API validation)
- **Code Quality:** ESLint, husky pre-commit hooks

---

This project was created for the DeepScribe technical assessment.
