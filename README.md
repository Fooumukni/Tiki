# Tiki

Tiki is an AI-powered multichannel issue intake platform for organizations.

Tiki helps organizations receive, classify, prioritize, and manage support issues from multiple channels using artificial intelligence. It supports organization-based isolation, Keycloak authentication, issue intake from dashboard and external channels, asynchronous AI analysis, and cloud-ready deployment.

Tiki is an initial SaaS release designed for public demonstration and further production hardening.

## Spanish Description

Tiki es una plataforma SaaS para organizaciones que permite recibir, clasificar, priorizar y gestionar issues de soporte desde múltiples canales usando inteligencia artificial.

## Author

Marcelo Antonio Choque Burgoa

## Problem

Support requests often arrive through disconnected channels such as internal dashboards, public forms, and messaging apps. Teams lose context, triage is inconsistent, and urgent issues can be buried behind manual review.

## Solution

Tiki centralizes issue intake for each organization and enriches incoming requests with AI-generated title, summary, category, priority, sentiment, suggested team, suggested response, and tags. The platform keeps organizations isolated by `organizationId` and processes AI analysis asynchronously so HTTP requests stay responsive.

## Architecture

```text
Tiki/
├── backend/
├── frontend/
├── infra/
│   ├── keycloak/
│   └── nginx/
├── .github/
│   └── workflows/
│       └── frontend-pages.yml
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
└── README.md
```

Frontend:

- Angular hosted on GitHub Pages.
- Public URL: `https://<github-user>.github.io/Tiki/`.

Backend:

- NestJS hosted on an Oracle Cloud VM.
- Public API URL: `https://api.example.com/api`.
- Public Keycloak URL: `https://api.example.com/auth`.

Services on the Oracle VM:

- NestJS backend
- Keycloak
- PostgreSQL for the application
- PostgreSQL for Keycloak
- Redis and BullMQ
- Nginx reverse proxy

The backend is a modular monolith. This keeps deployment simple while preserving clean boundaries between auth, organizations, issues, AI analysis, public intake, Telegram intake, queues, and audit logging.

## Main Features

- Keycloak authentication.
- Organization-based tenancy.
- Internal organization memberships and roles.
- Issue management from the dashboard.
- Public issue intake by organization slug.
- Telegram issue intake through one shared bot.
- AI-powered issue classification and suggested responses.
- Asynchronous processing with Redis and BullMQ.
- Professional Angular dashboard.
- GitHub Pages frontend deployment.
- Oracle VM backend deployment with Docker Compose and Nginx.

## Technical Stack

- Frontend: Angular, TypeScript, Angular Router, Angular Material, Keycloak JS Adapter.
- Backend: NestJS, TypeScript, Prisma ORM, PostgreSQL, Swagger/OpenAPI, class-validator, class-transformer.
- Authentication: Keycloak.
- Queue: Redis and BullMQ.
- Infrastructure: Docker Compose and Nginx.
- Deployment: GitHub Pages for frontend, Oracle Cloud VM for backend services.

## Repository Setup

```bash
git init
git add .
git commit -m "initial Tiki platform release"
git branch -M main
git remote add origin https://github.com/<github-user>/Tiki.git
git push -u origin main
```

## GitHub Pages Deployment

Enable GitHub Pages:

1. Open the GitHub repository settings.
2. Go to Pages.
3. Set Source to GitHub Actions.
4. Push to `main`.

The workflow in `.github/workflows/frontend-pages.yml` builds Angular with:

```bash
npm run build:pages
```

The frontend is built with:

```bash
ng build --configuration production --base-href /Tiki/
```

Final frontend URL:

```text
https://<github-user>.github.io/Tiki/
```

Optional GitHub repository variables for the Pages workflow:

```text
TIKI_API_BASE_URL=https://api.example.com/api
TIKI_KEYCLOAK_URL=https://api.example.com/auth
TIKI_KEYCLOAK_REALM=tiki
TIKI_KEYCLOAK_CLIENT_ID=tiki-frontend
```

If these variables are not configured, the workflow uses safe placeholders.

## Oracle VM Deployment

Prepare the VM:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git
```

Install Docker and the Docker Compose plugin using Docker's official installation guide for Ubuntu.

Connect to the VM from your local machine:

```bash
chmod 600 ~/Downloads/ssh-key-2026-05-08.key
ssh -i ~/Downloads/ssh-key-2026-05-08.key ubuntu@<vm-ip>
```

Clone the repository:

```bash
cd /home/ubuntu
git clone https://github.com/<github-user>/Tiki.git
cd Tiki
```

Create the real environment file:

```bash
cp .env.example .env
nano .env
```

Start the backend platform services:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
docker compose logs -f keycloak
docker compose logs -f nginx
docker compose exec backend npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Smoke test URLs before HTTPS/domain setup:

```text
http://<vm-ip>/api/health
http://<vm-ip>/api/docs
http://<vm-ip>/auth
```

For GitHub Pages browser usage, expose the backend through HTTPS:

```text
https://api.example.com/api
https://api.example.com/auth
```

Using an HTTP backend from an HTTPS GitHub Pages frontend may be blocked by the browser as mixed content.

## Production Environment Variables

Create `.env` on the VM. Do not commit it.

Important values:

```text
NODE_ENV=production
BACKEND_PORT=3100

POSTGRES_APP_DB=tiki_app
POSTGRES_APP_USER=tiki_app
POSTGRES_APP_PASSWORD=<strong-app-database-password>

POSTGRES_KEYCLOAK_DB=tiki_keycloak
POSTGRES_KEYCLOAK_USER=tiki_keycloak
POSTGRES_KEYCLOAK_PASSWORD=<strong-keycloak-database-password>

DATABASE_URL=postgresql://tiki_app:<strong-app-database-password>@postgres_app:5432/tiki_app?schema=public

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<optional-redis-password>

KEYCLOAK_ADMIN=<admin-user>
KEYCLOAK_ADMIN_PASSWORD=<strong-keycloak-admin-password>
KEYCLOAK_REALM=tiki
KEYCLOAK_FRONTEND_CLIENT_ID=tiki-frontend
KEYCLOAK_BACKEND_CLIENT_ID=tiki-api
KEYCLOAK_AUDIENCE=tiki-api
KEYCLOAK_ISSUER_URL=https://api.example.com/auth/realms/tiki
KEYCLOAK_JWKS_URI=https://api.example.com/auth/realms/tiki/protocol/openid-connect/certs
KEYCLOAK_BASE_URL=https://api.example.com/auth

FRONTEND_URL=https://<github-user>.github.io
APP_BASE_URL=https://api.example.com
APP_CORS_ORIGIN=https://<github-user>.github.io

AI_PROVIDER=mock
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_BOT_USERNAME=
```

For GitHub Pages, `FRONTEND_URL` must be the origin only:

```text
https://<github-user>.github.io
```

Do not include `/Tiki` in CORS origins.

## Keycloak Manual Configuration

Realm:

```text
tiki
```

Frontend client:

```text
tiki-frontend
```

Backend audience/client:

```text
tiki-api
```

Frontend client settings:

```text
Client type: OpenID Connect
Access type: Public
Standard flow: Enabled
PKCE: S256
Valid redirect URIs: https://<github-user>.github.io/Tiki/*
Valid post logout redirect URIs: https://<github-user>.github.io/Tiki/*
Web origins: https://<github-user>.github.io
```

Realm roles:

```text
platform_user
platform_admin
```

Organization roles such as `ORG_ADMIN`, `AGENT`, and `VIEWER` are managed inside the application database, not in Keycloak.

## Local Development

Install dependencies:

```bash
npm install
```

Run backend and frontend separately:

```bash
npm run dev:backend
npm run dev:frontend
```

Local URLs:

```text
Frontend: http://localhost:4210
Backend: http://localhost:3100
Swagger: http://localhost:3100/api/docs
Keycloak: http://localhost:8180
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate:deploy
```

## Verification Commands

Root checks:

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

Backend checks:

```bash
cd backend
npx prisma generate
npm run build
```

Frontend GitHub Pages build:

```bash
cd frontend
npm run build:pages
```

Docker checks:

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs -f backend
docker compose logs -f keycloak
docker compose logs -f nginx
docker compose exec backend npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

## Roadmap

- HTTPS with a custom backend domain.
- Production-grade Keycloak configuration.
- Monitoring and observability.
- Expanded AI usage controls per organization.
- Email intake.
- WhatsApp intake.
- Billing.
- Tenant administration panel.
- Audit reporting.

## Technical Pitch

Tiki is an AI-powered multichannel issue intake platform for organizations. It allows teams to receive support issues through a dashboard, public forms, and Telegram, then automatically classify, prioritize, summarize, and route them using AI. The architecture uses Angular on GitHub Pages for the frontend, while NestJS, Keycloak, PostgreSQL, Redis, and Nginx run on an Oracle Cloud VM. Each organization is isolated through `organizationId`, and AI analysis is processed asynchronously.

## Pitch Técnico En Español

Tiki es una plataforma SaaS para la recepción inteligente de issues en organizaciones. Permite recibir solicitudes desde un dashboard, formularios públicos y Telegram, para luego clasificarlas, priorizarlas, resumirlas y enroutarlas usando inteligencia artificial. La arquitectura usa Angular en GitHub Pages para el frontend, mientras que NestJS, Keycloak, PostgreSQL, Redis y Nginx se ejecutan en una VM de Oracle Cloud. Cada organización está aislada mediante `organizationId`, y el análisis con IA se procesa de forma asíncrona.

## Project Conventions

- Code, identifiers, API responses, and UI strings are written in English.
- Secrets are stored only in local environment files.
- `.env` files, SSH keys, tokens, passwords, and private certificates are never committed.
- Controllers stay thin and delegate business logic to services.
- Authentication stays separate from organization authorization.
- Docker Compose runs backend platform services for the VM.
- GitHub Pages hosts the Angular frontend.
