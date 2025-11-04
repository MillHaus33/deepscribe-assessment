# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Essential Commands

```bash
# Development
npm run dev          # Start Next.js dev server (http://localhost:3000)
npm test             # Run all tests (uses mocks, fast ~2s)
npm run build        # Production build + TypeScript check
npm run lint         # ESLint
npm run type-check   # TypeScript only (no build)

# Testing
npm test src/tests/extract.test.ts           # Run single test file
TEST_EXTRACTION=true npm test                # Include real OpenAI integration test (~$0.01)

# Pre-commit hooks run automatically via husky (ESLint + TypeScript on staged files)
```

---

## Architecture Overview

This is a **backend-focused Next.js 16 API** that processes medical transcripts using LLM extraction and matches patients with clinical trials.

### Data Flow
```
Transcript Upload → LLM Extraction → CT.gov API Search → Trial Results
     (API)           (OpenAI)         (External API)      (JSON Response)
```

### Layered Architecture

**1. API Layer** (`src/app/api/search/transcript/route.ts`, `src/app/api/search/profile/route.ts`)
- HTTP request handling, file upload validation, orchestration
- Maps errors to HTTP status codes (400/502/500)
- NO business logic - pure HTTP concerns

**2. Business Logic Layer**
- `src/lib/extract.ts` - LLM orchestration, prompt construction, response parsing/validation
- `src/lib/ctgov.ts` - CT.gov API client, query building, trial mapping/validation
- **Key principle:** Business logic lives here, NOT in providers

**3. Provider Layer** (`src/lib/providers/`)
- `llm.ts` - Generic LLM interface (accepts messages, returns raw string)
- `openai.ts` - OpenAI implementation
- **Key principle:** Pure infrastructure, no business logic, no parsing/validation

**4. Schema Layer** (`src/lib/schemas.ts`)
- Single source of truth for data shapes (Zod schemas)
- Runtime validation + TypeScript types (via `z.infer<>`)

---

## Key Architectural Patterns

### 1. Provider Pattern for LLM Abstraction

**Design:** Interface-based, NOT abstract class

```typescript
interface LLMProvider {
  complete(options: CompletionOptions): Promise<string>
}
```

**Critical:** Provider returns **raw string**, calling layer (extract.ts) handles:
- Prompt construction
- Model selection, temperature tuning
- JSON parsing
- Zod validation

**Why:** Business logic in calling layer makes it easy to swap providers without moving domain logic.

**OpenAI-specific features** (e.g., `response_format`) passed via options spread:
```typescript
provider.complete({
  messages: [...],
  response_format: zodResponseFormat(...), // OpenAI-specific
})
```

---

### 2. Custom Error Types for HTTP Mapping

**Pattern:**
```typescript
class CTGovAPIError extends Error {
  constructor(message: string, public statusCode?: number)
}
```

**Usage in route.ts:**
```typescript
catch (error) {
  if (error instanceof CTGovAPIError) {
    return NextResponse.json({ error: '...' }, { status: 502 }); // External API failure
  }
  return NextResponse.json({ error: '...' }, { status: 500 }); // Internal error
}
```

**Why:** Type-safe error handling, proper HTTP status codes (502 for external API failures)

---

### 3. Validation at Every Boundary

**Where we validate:**
1. API input (file size, type, content) - manual checks in route.ts
2. LLM output - `PatientProfileSchema.parse()` in extract.ts
3. CT.gov response - `TrialSchema.parse()` in ctgov.ts for each trial

**Pattern in ctgov.ts:**
```typescript
function mapStudyToTrial(study: CTGovStudy): Trial | null {
  try {
    const trial = { /* mapping logic */ };
    return TrialSchema.parse(trial); // Validate and return
  } catch {
    return null; // Invalid trial filtered out
  }
}
```

**Why:** Gracefully handle inconsistent CT.gov data (return some results vs. fail entirely)

---

### 4. Testing Strategy

**Mock external dependencies (LLM, CT.gov), test business logic:**

```typescript
// Mock LLM provider
vi.mock('@/lib/providers/llm', () => ({
  getLLMProvider: vi.fn(() => ({
    complete: vi.fn(async () => JSON.stringify(mockProfile)) // Raw JSON string
  }))
}))

// Mock fetch for CT.gov
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => mockResponse
})
```

**Integration test gating:**
- Real OpenAI test only runs with `TEST_EXTRACTION=true` (avoid API costs)
- Pattern: `{ skip: process.env.TEST_EXTRACTION !== 'true' }`

**Test fixtures:** `src/tests/fixtures/` (transcripts, CT.gov responses)

---

## Important Conventions

### File Organization

```
src/
├── app/
│   ├── api/search/
│   │   ├── transcript/route.ts # POST /api/search/transcript (file upload)
│   │   └── profile/route.ts    # POST /api/search/profile (profile search)
│   ├── page.tsx                # Home page (frontend)
│   └── layout.tsx              # Root layout
├── components/                 # Reusable UI components
│   └── *.tsx                   # Button, Card, etc.
├── lib/
│   ├── providers/              # LLM abstraction
│   ├── extract.ts              # LLM extraction (business logic)
│   ├── ctgov.ts                # CT.gov client (business logic)
│   └── schemas.ts              # Zod schemas (single source of truth)
└── tests/
    ├── fixtures/               # Test data
    └── *.test.ts               # Tests (NOT *.spec.ts)
```

### Import Conventions

**Use path aliases:**
```typescript
import { extractPatientProfile } from '@/lib/extract'; // ✅
import { extractPatientProfile } from '../../lib/extract'; // ❌
```

Configured in `tsconfig.json` and `vitest.config.ts`: `@/` → `./src/`

---

### Frontend Component Organization

**Key Principle:** Create reusable components in `src/components/` for any UI element used in multiple places.

**When to create a component:**
- Element is used in 2+ places (e.g., Button, Card, Badge)
- Element has complex logic that should be isolated
- Element will likely be reused in the future (e.g., form inputs, modals)

**Component file structure:**
```
src/components/
├── Button.tsx          # Simple components (single file)
├── Card.tsx
└── TrialCard/          # Complex components (folder with index)
    ├── index.tsx
    ├── TrialCard.test.tsx
    └── types.ts
```

**Naming conventions:**
- PascalCase for component files: `Button.tsx`, `TrialCard.tsx`
- Component name matches filename: `export function Button() { ... }`
- Props interface named `ComponentNameProps`: `interface ButtonProps { ... }`

**Example:**
```typescript
// src/components/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({ variant = 'primary', children, onClick }: ButtonProps) {
  // Implementation
}
```

**Usage:**
```typescript
import { Button } from '@/components/Button';

export default function Page() {
  return <Button variant="primary">Click me</Button>;
}
```

---

### Error Handling

**Always wrap and add context:**
```typescript
try {
  const result = await externalOperation();
} catch (error) {
  if (error instanceof SpecificError) {
    throw error; // Re-throw known errors
  }
  throw new Error(`Context about operation: ${error.message}`);
}
```

**Never:**
- Catch and ignore silently
- Throw strings: `throw 'error'` ❌
- Use generic messages without context

---

### Environment Variables

**Loading:**
- `.env` - local development (gitignored)
- `.env.example` - committed with placeholders
- `.env.test` - test environment (gitignored)
- `src/tests/setup.ts` loads `.env.test` for Vitest

**Required:**
- `OPENAI_API_KEY` - OpenAI API key (no default, required)

**Optional (with defaults):**
- `TEST_EXTRACTION` - Default: undefined (skips real LLM test)

**Application Constants (in code, not environment):**
- `CTGOV_API_BASE_URL` - `https://clinicaltrials.gov/api/v2/studies` (defined in `src/lib/ctgov.ts`)
- `MAX_FILE_SIZE` - `1048576` bytes / 1MB (defined in `src/app/api/search/transcript/route.ts`)

---

## Non-Obvious Architectural Decisions

### Why Business Logic Lives in Calling Layer (extract.ts), Not Provider

**Decision:** extract.ts owns prompts, model selection, parsing, validation

**Rationale:**
- Provider is pure infrastructure (protocol adapter only)
- Prompt engineering is domain-specific, not infrastructure
- Easy to test business logic with mocked provider
- Can swap providers without moving business logic

**Alternative considered:** `provider.extractStructured(schema, transcript)`
**Why not:** Couples provider to business domain

---

### Why mapStudyToTrial Returns `Trial | null`

**Decision:** Invalid trials return `null` and are filtered out

**Rationale:**
- CT.gov data can be inconsistent (missing fields, bad formats)
- Better to return some results than fail entirely
- Validation ensures returned trials are high-quality
- Trade-off: Silent failures (should add logging in production)

---

### OpenAI-Specific Features via Options Spread

**Decision:** Pass `response_format` through `CompletionOptions`, not dedicated interface method

**Rationale:**
- Interface stays generic: `[key: string]: any` in options
- Business layer can use provider-specific features
- Other providers ignore unknown options
- No breaking interface changes when adding features

---

### Environment-Gated Integration Tests

**Decision:** Real LLM test only runs with `TEST_EXTRACTION=true`

**Rationale:**
- Avoid API costs in CI (~$0.01 per run)
- Developers can validate extraction quality locally
- Fast test suite by default (~2s)
- Keeps integration tests in same codebase (not separate repo)

**Pattern:**
```typescript
const shouldRun = process.env.TEST_EXTRACTION === 'true';
it('test name', { timeout: 30000, skip: !shouldRun }, async () => { ... });
```

---

### No Database or Caching

**Decision:** Stateless API, no persistence

**Rationale:**
- HIPAA/PHI concerns (don't store medical data)
- Simple deployment (no DB setup)
- Fresh CT.gov data on every request
- MVP scope (caching is optimization)

**Future consideration:** Redis for CT.gov response caching (keyed by query params)

---

## Code Quality

**Pre-commit hooks (husky + lint-staged):**
- ESLint auto-fix on staged `*.ts` and `*.tsx`
- TypeScript type checking (`tsc --noEmit`)

**TypeScript strict mode:** Enabled in `tsconfig.json`
- No implicit any (except in test mocks where necessary)
- Explicit return types for public functions

**Zod best practices:**
- Use `.parse()` for exceptions (when invalid data should stop execution)
- Use `.safeParse()` for graceful handling (when filtering invalid items)
- Infer types: `type PatientProfile = z.infer<typeof PatientProfileSchema>`

---

## Tech Stack Summary

- **Framework:** Next.js 16 (App Router), TypeScript 5 (strict), React 19
- **AI/LLM:** OpenAI SDK 6.7, GPT-4o with structured outputs
- **Validation:** Zod 4.1
- **Testing:** Vitest 4.0, V8 coverage
- **Code Quality:** ESLint 9, Husky 9, lint-staged 16
