# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Eval Trace Viewer is a full-stack web application for exploring evaluation traces and providing feedback on model outputs. It consists of a FastAPI backend and a React + Vite frontend, using Supabase (PostgreSQL) for persistent storage.

## Development Commands

### Backend (FastAPI)

**Start the backend server:**
```bash
uv run uvicorn backend.main:app --reload --port 8001
```

**Install dependencies:**
```bash
uv sync
```

**Ingest evaluation results:**
```bash
# Ingest specific files
uv run python -m backend.scripts.ingest_results ../results/file1.json ../results/file2.json

# Scan and ingest all files in directory
uv run python -m backend.scripts.ingest_results --scan-dir ../results
```

The backend runs on `http://localhost:8001` with API docs at `http://localhost:8001/docs`.

### Frontend (React + Vite)

**Start the development server:**
```bash
cd frontend
npm run dev
```

**Build for production:**
```bash
cd frontend
npm run build
```

**Lint the code:**
```bash
cd frontend
npm run lint
```

**Preview production build:**
```bash
cd frontend
npm run preview
```

The frontend runs on `http://localhost:5173`.

## Architecture Overview

### Backend Structure

The backend is organized by resource with clear separation of concerns:

- **`backend/models.py`**: Pydantic models for all data types (EvalRun, EvalSample, Feedback) with separate models for base, create, and full representations. All database responses are validated through these models.

- **`backend/api/`**: API route handlers split by resource:
  - `evals.py`: Evaluation run CRUD operations, file listing, and ingestion endpoint
  - `samples.py`: Sample retrieval, filtering, and comparison functionality
  - `feedback.py`: Feedback CRUD operations and statistics aggregation

- **`backend/database.py`**: Singleton Supabase client accessed via `get_db()`.

- **`backend/config.py`**: Environment-based configuration using Pydantic Settings. Loads from `.env` file.

- **`backend/scripts/ingest_results.py`**: Standalone script that can run via CLI or be called from the API endpoint. Handles parsing of filename metadata and batch insertion of samples.

### Frontend Structure

React application with routing and TypeScript:

- **`frontend/src/pages/`**: Top-level page components:
  - `EvalsList.tsx`: Dashboard showing all evaluation runs
  - `SamplesList.tsx`: List of samples for a specific evaluation run
  - `TraceView.tsx`: Detailed trace viewer with conversation display and feedback UI
  - `ComparisonView.tsx`: Side-by-side comparison of multiple samples

- **`frontend/src/components/MessageRenderer.tsx`**: Core component that renders different message types from conversation traces. Handles:
  - User messages
  - Assistant messages (with markdown support via react-markdown)
  - Reasoning messages (collapsible for long content)
  - Code interpreter calls (with code blocks and output rendering)
  - Fallback rendering for unknown message types

- **`frontend/src/api/client.ts`**: Centralized Axios-based API client with typed methods matching backend endpoints.

- **`frontend/src/types/index.ts`**: TypeScript interfaces that mirror the Pydantic models from the backend.

### Database Schema

Three main tables with cascading relationships:

1. **`eval_runs`**: Stores evaluation run metadata (name, model, scores, metrics, file_path)
2. **`eval_samples`**: Stores individual samples with conversation traces (JSONB), linked to eval_runs via foreign key
3. **`feedback`**: Stores user feedback on samples (type, rating, notes, tags), linked to eval_samples via foreign key

All relationships use `ON DELETE CASCADE` to maintain referential integrity.

## Message Type Handling

The `MessageRenderer` component in `frontend/src/components/MessageRenderer.tsx` is the central place for handling different message types in conversation traces. When adding support for new message types:

1. Add a new conditional block in `MessageRenderer`
2. Define appropriate styling and layout
3. Extract relevant fields from the message object
4. Use the `extractText()` helper for content extraction if needed

Current supported types:
- `role: 'user'` - User messages
- `role: 'assistant'` - Assistant responses (markdown rendered)
- `type: 'reasoning'` - Reasoning traces (collapsible)
- `type: 'code_interpreter_call'` - Code execution with outputs

## Data Ingestion Flow

The ingestion system expects JSON files with this structure:

```json
{
  "score": <float>,
  "metrics": { "metric_name": <float>, ... },
  "htmls": ["<html>", ...],
  "convos": [[{message}, ...], ...],
  "metadata": {
    "example_level_metadata": [
      { "question": "...", ... }
    ]
  }
}
```

**Filename parsing** in `backend/scripts/ingest_results.py` extracts metadata from filenames following the pattern:
```
{eval_type}_{model}_{config}_temp{temp}_{timestamp}_allresults.json
```

**Ingestion process:**
1. Parse filename for metadata (eval_type, model_name, timestamp)
2. Check if file_path already exists in database to prevent duplicates
3. Create eval_run record with parsed metadata and overall score
4. Extract samples from htmls/convos arrays (paired by index)
5. Batch insert samples (100 at a time) with conversation JSONB

**Question extraction fallback:** If example_metadata doesn't contain a question, the ingestion script searches for "Question:" in the first user message content.

## Environment Configuration

**Backend** requires `.env` in project root:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
RESULTS_DIR=../results
CORS_ORIGINS=["http://localhost:5173"]
```

**Frontend** requires `.env` in `frontend/`:
```
VITE_API_URL=http://localhost:8001
```

## API Integration Pattern

The frontend uses React Query (`@tanstack/react-query`) for data fetching with automatic caching and refetching. All API calls go through `frontend/src/api/client.ts` which provides typed methods that match backend endpoints.

When adding new endpoints:
1. Add route in appropriate `backend/api/*.py` file
2. Add corresponding method in `frontend/src/api/client.ts`
3. Add TypeScript types in `frontend/src/types/index.ts` if needed
4. Use React Query hooks in components for automatic caching

## Styling

The frontend uses Tailwind CSS v4 with the Typography plugin for markdown rendering. Custom prose styles are applied to assistant messages for proper markdown formatting.