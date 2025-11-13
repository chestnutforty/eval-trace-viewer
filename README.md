# Eval Trace Viewer

A lightweight web application for exploring evaluation traces and providing feedback on model outputs. Built with FastAPI (backend) and React + Vite (frontend), using Supabase for persistent storage.

## Features

- **Evaluation Runs Dashboard**: View all evaluation runs with metadata, scores, and sample counts
- **Sample Explorer**: Browse and search evaluation samples with filtering capabilities
- **Trace Viewer**: View detailed conversation traces with proper formatting for different message types (user, reasoning, code interpreter, assistant)
- **Feedback System**: Add structured feedback with types, ratings, notes, and tags
- **Comparison View**: Compare multiple samples side-by-side to analyze differences
- **Persistent Storage**: All data and feedback stored in Supabase (PostgreSQL)

## Architecture

```
eval-trace-viewer/
├── backend/           # FastAPI application
│   ├── api/           # API route handlers
│   ├── scripts/       # Data ingestion scripts
│   ├── config.py      # Settings and configuration
│   ├── database.py    # Supabase client
│   ├── models.py      # Pydantic data models
│   └── main.py        # FastAPI app entry point
├── frontend/          # React + Vite application
│   └── src/
│       ├── api/       # API client
│       ├── components/# Reusable React components
│       ├── pages/     # Page components
│       └── types/     # TypeScript type definitions
├── schema.sql         # Database schema
└── pyproject.toml     # Python dependencies
```

## Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend)
- Supabase account (free tier works fine)

## Setup

### 1. Set Up Supabase

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. In the SQL Editor, run the contents of `schema.sql` to create tables
3. Get your project URL and anon key from Settings > API

### 2. Configure Environment Variables

**Backend** (`eval-trace-viewer/.env`):
```bash
cp .env.example .env
```

Edit `.env`:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key-here
RESULTS_DIR=../results
CORS_ORIGINS=["http://localhost:5173"]
```

**Frontend** (`eval-trace-viewer/frontend/.env`):
```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```
VITE_API_URL=http://localhost:8001
```

### 3. Install Dependencies

**Backend**:
```bash
uv sync
```

**Frontend**:
```bash
cd frontend
npm install
```

## Running the Application

### Start Backend Server

```bash
cd eval-trace-viewer
uv run uvicorn backend.main:app --reload --port 8001
```

The API will be available at `http://localhost:8001`
API documentation at `http://localhost:8001/docs`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

The web app will be available at `http://localhost:5173`

## Ingesting Evaluation Results

The tool expects evaluation results in JSON format with this structure:

```json
{
  "score": <float>,
  "metrics": { "metric_name": <float>, ... },
  "htmls": ["<html>", ...],
  "convos": [[{message}, ...], ...],
  "metadata": {
    "example_level_metadata": [
      {
        "question": "...",
        "cutoff_date": "...",
        ...
      }
    ]
  }
}
```

### Ingestion Methods

**Option 1: Command Line Script**
```bash
# Ingest specific files
uv run python -m backend.scripts.ingest_results ../results/file1.json ../results/file2.json

# Scan and ingest all files in directory
uv run python -m backend.scripts.ingest_results --scan-dir ../results
```

**Option 2: API Endpoint**
```bash
# Scan directory and ingest all files
curl -X POST http://localhost:8001/api/evals/ingest \
  -H "Content-Type: application/json" \
  -d '{"scan_directory": true}'

# Ingest specific files
curl -X POST http://localhost:8001/api/evals/ingest \
  -H "Content-Type: application/json" \
  -d '{"file_paths": ["../results/file1.json"]}'
```

## API Endpoints

### Evaluation Runs
- `GET /api/evals` - List all evaluation runs (with pagination and filters)
- `GET /api/evals/{id}` - Get single evaluation run
- `DELETE /api/evals/{id}` - Delete evaluation run and samples
- `GET /api/evals/files/list` - List available JSON files
- `POST /api/evals/ingest` - Ingest results from JSON files

### Samples
- `GET /api/samples/eval/{eval_id}/samples` - List samples for evaluation
- `GET /api/samples/{id}` - Get single sample with full trace
- `GET /api/samples/compare?ids=...` - Compare multiple samples

### Feedback
- `GET /api/feedback/sample/{sample_id}/feedback` - Get feedback for sample
- `POST /api/feedback/sample/{sample_id}/feedback` - Create feedback
- `PATCH /api/feedback/{id}` - Update feedback
- `DELETE /api/feedback/{id}` - Delete feedback
- `GET /api/feedback/stats` - Get aggregate feedback statistics

## Database Schema

**eval_runs**: Stores evaluation run metadata
- id, name, model_name, eval_type, timestamp, overall_score, metrics, metadata, file_path

**eval_samples**: Stores individual samples with traces
- id, eval_run_id, sample_index, question, score, metrics, conversation, html_report, example_metadata

**feedback**: Stores user feedback
- id, sample_id, feedback_type, rating, notes, tags, created_at, updated_at

## Development

### Backend Development
```bash
# Run with auto-reload
uvicorn backend.main:app --reload --port 8001

# Run tests (if implemented)
pytest
```

### Frontend Development
```bash
cd frontend

# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Code Structure

**Backend**:
- `models.py`: Pydantic models for request/response validation
- `api/*.py`: Route handlers grouped by resource
- `database.py`: Supabase client singleton
- `config.py`: Environment-based configuration

**Frontend**:
- `pages/*.tsx`: Top-level page components with routing
- `components/*.tsx`: Reusable UI components
- `api/client.ts`: Axios-based API client with typed methods
- `types/index.ts`: TypeScript interfaces matching backend models

## Deployment

### Docker Deployment (Recommended)

The easiest way to deploy the entire application is using Docker Compose:

#### Prerequisites
- Docker and Docker Compose installed
- Supabase project created and configured (see Setup section above)

#### Quick Start with Docker

1. **Set up environment variables**:
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

2. **Build and start the containers**:
```bash
docker-compose up -d
```

This will:
- Build and start the backend API on port 8001
- Build and start the frontend on port 80
- Set up a Docker network for communication between services
- Enable automatic restarts

3. **Access the application**:
- Frontend: `http://localhost` (port 80)
- Backend API: `http://localhost:8001`
- API Documentation: `http://localhost:8001/docs`

4. **View logs**:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
```

5. **Stop the application**:
```bash
docker-compose down
```

#### Port Tunneling

To expose the application to the internet (e.g., for sharing with team members):

**Using ngrok**:
```bash
# Tunnel the frontend (port 80)
ngrok http 80

# Or tunnel both services separately
ngrok http 80    # For frontend
ngrok http 8001  # For backend API
```

**Using Cloudflare Tunnel**:
```bash
cloudflared tunnel --url http://localhost:80
```

**Important**: When tunneling, update the `VITE_API_URL` build argument in `docker-compose.yml` to use your public backend URL.

#### Production Deployment

For production deployments, consider:

1. **Use environment-specific configurations**:
   - Update CORS origins in `.env` to include your production domain
   - Use HTTPS for both frontend and backend
   - Set appropriate API URLs in docker-compose.yml

2. **Add SSL/TLS termination**:
   - Use a reverse proxy like Nginx or Caddy
   - Or deploy behind a service like Cloudflare

3. **Resource limits** (add to docker-compose.yml):
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

### Alternative Deployment Options

**Backend (FastAPI)**:
- Railway/Heroku/Render: Set environment variables and use start command `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
- Cloud Run/AWS Lambda: Package as container image

**Frontend (Vite)**:
- Vercel/Netlify: Build with `npm run build` and deploy the `dist/` directory
- Static hosting: Serve the built `dist/` directory with any web server

## Troubleshooting

**Backend won't start**:
- Check Supabase credentials in `.env`
- Verify database tables were created from `schema.sql`
- Check Python version (requires 3.10+)

**Frontend can't connect to API**:
- Verify `VITE_API_URL` in `frontend/.env`
- Check CORS settings in `backend/config.py`
- Ensure backend is running on the correct port

**Ingestion fails**:
- Verify `RESULTS_DIR` path in `.env`
- Check JSON file structure matches expected format
- Look for error messages in backend logs

**Database errors**:
- Check Supabase project is active
- Verify API key hasn't expired
- Check Row Level Security (RLS) policies if enabled

## Future Enhancements

- [ ] Bulk feedback operations
- [ ] Export feedback to CSV/JSON
- [ ] Advanced metric filtering (sliders, multi-select)
- [ ] Real-time collaboration (multiple users)
- [ ] Syntax highlighting for code blocks
- [ ] Full-text search on conversation content
- [ ] Tagging system for evaluation runs
- [ ] Dashboard with aggregate statistics
- [ ] User authentication (if needed)

## License

MIT

## Contributing

This is a standalone tool that can be adapted for different evaluation formats. To customize:

1. Modify `backend/scripts/ingest_results.py` to parse your JSON structure
2. Update `backend/models.py` if you need additional fields
3. Adjust `frontend/components/MessageRenderer.tsx` for custom message types
4. Add new feedback types in `frontend/pages/TraceView.tsx`
