# RepoScan AI

RepoScan AI is a full-stack repository analysis tool that combines a FastAPI backend and a React dashboard to evaluate GitHub repositories for:

- Security risks
- Code quality and code smells
- Documentation gaps
- Learning insights
- Optional AI-generated fix pull requests

## Features

- Multi-agent analysis pipeline (`security`, `code review`, `code quality`, `docs`, `learning`)
- Health scoring and normalized output
- Chat endpoint to ask questions about a completed analysis
- Automated fix PR generation workflow for top issues
- FastAPI docs page out of the box (`/docs`)

## Tech Stack

- Backend: FastAPI, Uvicorn, Requests, Groq SDK
- Frontend: React, Vite, Framer Motion, Recharts
- Runtime: Python 3.10+, Node.js
- Deployment: Railway (Dockerfile included)

## Project Structure

```text
.
├─ main.py
├─ requirements.txt
├─ package.json
├─ vite.config.js
├─ agents/
├─ security/
├─ src/
├─ Dockerfile
└─ .dockerignore
```

## Environment Variables

Create a `.env` file in project root:

```env
GROQ_API_KEY=your_groq_key
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

Notes:

- `GROQ_API_KEY` is required for AI analysis and chat responses.
- `GITHUB_TOKEN` is required for private repo access and fix PR generation.
- Never commit real secrets.

## Local Development

From project root (`ai-repository-agent/ai-repository-agent`):

1. Install Python dependencies

```bash
pip install -r requirements.txt
```

2. Install Node dependencies

```bash
npm install
```

3. Start backend + frontend together

```bash
npm run dev
```

Default local endpoints:

- Frontend: `http://localhost:5173` (or next available port)
- API: `http://127.0.0.1:8000`
- API docs: `http://127.0.0.1:8000/docs`

## API Endpoints

### `GET /health`
Health check.

### `POST /analyze`
Analyze a GitHub repository.

Request body:

```json
{
  "repo_url": "https://github.com/owner/repo"
}
```

### `POST /chat`
Ask follow-up questions based on analysis output.

Request body:

```json
{
  "repo_url": "https://github.com/owner/repo",
  "message": "What are the top critical risks?",
  "analysis": {}
}
```

### `POST /generate-fix-pr`
Generate automated fix suggestions and create a PR.

Request body:

```json
{
  "repo_url": "https://github.com/owner/repo",
  "github_token": "ghp_...",
  "issues": []
}
```

## Railway Deployment

This repo includes a `Dockerfile` for stable Railway builds.

- Container entrypoint runs:

```bash
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

- After deployment, verify:

```text
GET /health
GET /docs
```

### Why `/` shows `{"detail":"Not Found"}`

That is expected with current backend config because no root route (`/`) is defined yet. Use `/health` or `/docs`.

## Current Public API URLs

- `https://reposcan-ai-production.up.railway.app`
- `https://reposcan-ai-production-a4b5.up.railway.app`

## Troubleshooting

- Port conflict on `8000` locally:
  - Stop existing process using that port, then rerun `npm run dev`.
- Railway deploy failed during build:
  - Ensure `Dockerfile` exists at root and redeploy.
- `401/403` with GitHub operations:
  - Check `GITHUB_TOKEN` scopes and validity.

## Security Notes

- `.env` is ignored by git; keep secrets local.
- Rotate keys if accidentally exposed.

## Roadmap Ideas

- Serve frontend and API from a single production domain
- Add a root landing route (`GET /`)
- Add automated tests for endpoint workflows
- Add CI checks for linting and smoke tests
