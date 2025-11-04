# DeepScribe Clinical Trials Matcher

A full-stack Next.js application that analyzes patient-doctor conversation transcripts using AI to extract structured medical data and match patients with relevant clinical trials from ClinicalTrials.gov. Features an intuitive web interface with drag-and-drop file upload and comprehensive trial results display.

---

## Overview

### Approach & Comments

**Backend Implementation**

I started by building a backend route for receiving transcript files, performing LLM extraction, building ClinicalTrials.gov API query parameters, and processing responses. I used a provider pattern that separates LLM infrastructure (OpenAI) from business logic, making it straightforward to add different providers or use cases. Tests with Vitest and runtime validation with Zod ensure accuracy and type safety.

**Frontend & Query Quality**

I created a simple frontend with drag-and-drop upload and trial results display. Rather than implementing pagination (nextPageToken) or expandable trial details, I focused on improving match quality by moving query building into the LLM extraction system. I generated test transcripts included in the repo and did analysis with my coding agent.

I chose a single LLM call for simplicity, though a two-stage architecture could further improve results: one call strictly for extraction, then a second call to generate the `query.cond` and `query.term` parameters for the ClinicalTrials.gov API request.

**Manual Query Refinement Feature**

I added the ability to manually edit the `query.cond` and `query.term` parameters in the UI. This addresses a key challenge I discovered: searching the vast ClinicalTrials.gov database is difficult, and AI extraction won't always match clinician intent. This feature provides immediate value and creates a feedback loop for future improvements by capturing how users adjust AI generated queries. The adjustments could be recorded and analyzed to understand gaps between system extraction and doctor or patient expectations.

**Design Decisions**

I considered several suggested enhancements. For trial ranking, ranking only the top 20 results per page seemed misleading without access to the full result set, and implementing ranking across all trials felt beyond assessment scope. For data persistence, implementing a database seemed beyond MVP scope, and local storage didn't seem creative. I also considered using the location decay filter by parsing patient location but ultimately decided the manual refinement feature provided more flexibility. Instead of these additions, I prioritized the query refinement feature, which delivers immediate value and provides data for future system improvements.

### Details

This application implements a **full-stack solution** with an intuitive web interface and robust backend API.

**Web Interface:** React-based UI with drag-and-drop file upload, real-time loading states, and comprehensive trial results display. Features responsive design with Tailwind CSS, error handling with dismissible messages, and "no results" states for better user experience.

**Search Refinement:** After initial search, users can view the extracted patient profile and manually edit the ClinicalTrials.gov search query parameters (condition query and term query) to refine results and re-run the search.

**LLM Extraction:** Uses OpenAI GPT-4o with structured outputs to extract patient profiles from transcripts. The LLM is prompted to identify demographics (age, sex), medical conditions, biomarkers (e.g., BRAF V600E), disease stage, performance status, and location. Zod schemas enforce runtime validation to ensure data integrity.

**Clinical Trials Matching:** Queries the ClinicalTrials.gov API v2 with filtering. The query builder combines conditions and biomarkers into search terms, filters by recruiting status, and retrieves detailed trial information including eligibility criteria and locations. Unicode normalization ensures compatibility with LLM-generated text.

**Architecture:** Modular design with clear separation of concerns - provider abstraction for LLM flexibility, business logic in extraction layer, and robust error handling with custom error types. TypeScript strict mode and comprehensive testing ensure production readiness.

---

## Live Demo

**Web Application:** https://deepscribe-assessment.vercel.app/

**API Endpoints:**

- `https://deepscribe-assessment.vercel.app/api/search/transcript`
- `https://deepscribe-assessment.vercel.app/api/search/profile`

Try it out with the sample transcripts included in the repository!

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

   The application will be available at `http://localhost:3000`

5. **Using the Web Interface**

   Open `http://localhost:3000` in your browser. You can:

   - **Drag and drop** a transcript file (`.txt` or `.md`) onto the upload area
   - **Click** the upload area to browse for a file
   - **Sample transcripts** are available in `src/tests/fixtures/transcripts/`:
     - `breast_cancer_her2_positive.txt` - Breast cancer with HER2+ biomarker
     - `melanoma_braf_ecog1.txt` - Metastatic melanoma with BRAF V600E
     - `glioblastoma_idh_wt.txt` - Brain cancer with IDH-wildtype
     - `heart_failure_nyha2.txt` - Cardiovascular condition
     - And more...

   After upload, the app will:

   - Analyze the transcript using AI (5-10 seconds)
   - Display the extracted patient profile and matching clinical trials
   - **Refine Search:** Click "Refine Search Criteria" to view the extracted profile and manually edit the search query parameters (condition query and term query) to re-run the search
   - Show trial eligibility criteria and locations
   - Provide links to ClinicalTrials.gov for each trial

6. **Testing the API Directly** (optional)
   ```bash
   # Use curl to test the transcript endpoint
   curl -X POST http://localhost:3000/api/search/transcript \
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

### `POST /api/search/transcript`

Accepts a transcript file (`.txt` or `.md`, max 1MB), extracts patient profile using AI, and returns matching clinical trials.

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/search/transcript \
  -F "file=@transcript.txt"
```

**Example Response:**

```json
{
  "profile": {
    "demographics": {
      "age": 55,
      "sex": "male"
    },
    "conditions": ["Metastatic Melanoma"],
    "biomarkers": [
      {
        "name": "BRAF",
        "value": "V600E"
      }
    ],
    "stage": "Stage IV",
    "performanceStatus": "ECOG 1",
    "ctgovQuery": {
      "conditionQuery": "melanoma",
      "termQuery": "(BRAF V600E) OR (BRAF mutation) OR (BRAF V600)"
    }
  },
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

### `POST /api/search/profile`

Accepts a patient profile and searches for matching clinical trials. Skips AI extraction since the profile is already structured.

**Example Request:**

```bash
curl -X POST http://localhost:3000/api/search/profile \
  -H "Content-Type: application/json" \
  -d '{
    "profile": {
      "demographics": { "age": 60, "sex": "female" },
      "conditions": ["Breast Cancer"],
      "biomarkers": [{ "name": "HER2", "value": "positive" }],
      "stage": "Stage II",
      "ctgovQuery": {
        "conditionQuery": "breast cancer",
        "termQuery": "(HER2 positive) OR (HER2+)"
      }
    }
  }'
```

**Response:** Same format as `/api/search/transcript` - returns `{ profile, trials }`

---

## Assumptions

1. **Transcript format** - Plain text files (.txt or .md) containing patient-doctor conversations, max 1MB
2. **LLM reliability** - OpenAI structured outputs provide consistent JSON extraction without additional validation layers
3. **No authentication** - MVP doesn't require user auth or API keys for client requests
4. **No data persistence** - Transcripts are processed on-demand and not stored
5. **ClinicalTrials.gov availability** - Assumes API is available; handles errors gracefully with 502 responses
6. **Client-side processing** - File upload and validation happen in the browser before sending to the API

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript (strict mode)
- **Frontend:** React 19 with Tailwind CSS v4 for styling
- **AI/LLM:** OpenAI GPT-4o with structured outputs
- **Validation:** Zod for runtime type safety
- **Testing:** Vitest (13 tests - unit, integration, and real API validation)
- **Code Quality:** ESLint, husky pre-commit hooks

---

This project was created for the DeepScribe technical assessment.
