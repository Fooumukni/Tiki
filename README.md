<img  /><p align="center">
  <img src="frontend/src/assets/tiki-logo.png" alt="Tiki logo" width="120" />
</p>

<h1 align="center">Tiki</h1>

<p align="center">
  <strong>AI-powered multichannel issue intake platform for organizations.</strong>
</p>

<p align="center">
  Tiki helps organizations receive, classify, prioritize, and manage support issues from multiple channels using artificial intelligence.
</p>

<p align="center">
  <a href="https://tiki.cimemyc.online">Live Frontend</a>
  ·
  <a href="https://api.tiki.cimemyc.online/api">Backend API</a>
  ·
  <a href="https://api.tiki.cimemyc.online/api/docs">Swagger Docs</a>
  ·
  <a href="https://auth.tiki.cimemyc.online">Keycloak Auth</a>
</p>

<p align="center">
  <img alt="Angular" src="https://img.shields.io/badge/Frontend-Angular-DD0031?style=flat-square&logo=angular&logoColor=white" />
  <img alt="NestJS" src="https://img.shields.io/badge/Backend-NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" />
  <img alt="Redis" src="https://img.shields.io/badge/Queue-Redis-DC382D?style=flat-square&logo=redis&logoColor=white" />
  <img alt="Docker" src="https://img.shields.io/badge/Infra-Docker-2496ED?style=flat-square&logo=docker&logoColor=white" />
  <img alt="License" src="https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square" />
</p>

---

## About Tiki

Tiki is an initial SaaS release designed for public demonstration and further production hardening.

It provides a centralized platform where organizations can receive support issues from authenticated dashboards, public forms, and Telegram. Each issue can be enriched with AI-generated classification, priority, sentiment, summary, suggested team, suggested response, and tags.

The platform uses organization-based isolation, Keycloak authentication, asynchronous AI processing, and a cloud-ready deployment model.

---

## Spanish Description

Tiki es una plataforma SaaS para organizaciones que permite recibir, clasificar, priorizar y gestionar issues de soporte desde múltiples canales usando inteligencia artificial.

---

## Author

**Marcelo Antonio Choque Burgoa**

---

## Problem

Support requests usually arrive through disconnected channels such as dashboards, public forms, chat apps, and manual reports.

This creates operational friction:

- requests are difficult to track,
- urgent issues can be missed,
- triage depends on manual review,
- teams lose context across channels,
- external users need a simple reporting flow,
- support teams spend time summarizing instead of solving.

---

## Solution

Tiki centralizes issue intake per organization and enriches every request with AI-assisted triage.

The platform helps teams:

- receive issues from multiple channels,
- keep organization data isolated,
- classify and prioritize requests automatically,
- process AI analysis asynchronously,
- manage internal members and roles,
- track support activity from one professional dashboard.

---

## Screenshots

Add your screenshots inside:

```text
docs/screenshots/
```

Recommended files:

```text
docs/screenshots/landing.png
docs/screenshots/dashboard.png
docs/screenshots/issues.png
docs/screenshots/issue-detail.png
docs/screenshots/telegram-settings.png
docs/screenshots/public-report.png
```

### Landing Page
<img width="2531" height="1102" alt="image" src="https://github.com/user-attachments/assets/01372877-36df-4138-a52a-92345c8aa57e" />




### Dashboard
<img width="2146" height="973" alt="image" src="https://github.com/user-attachments/assets/73a73c02-940c-47e5-bfc3-898a47430db9" />

 
### Issues
<img width="2531" height="1102" alt="image" src="https://github.com/user-attachments/assets/23c112ca-059d-4ce6-b56d-4b408c7a7136" />


### Issue Detail
<img width="2146" height="973" alt="image" src="https://github.com/user-attachments/assets/bebd3044-48f6-4d99-85bf-7c0a83416624" />


### Telegram Settings

![Telegram settings](docs/screenshots/telegram-settings.png)

### Public Report

![Public report](docs/screenshots/public-report.png)

---

## Core Features

| Area | Capability |
|---|---|
| Authentication | Login, registration, logout, and token issuance through Keycloak |
| Organizations | Organization-based tenancy with isolated data |
| Memberships | Internal roles such as `ORG_ADMIN`, `AGENT`, and `VIEWER` |
| Issues | Create, list, filter, update, and resolve issues |
| Public Intake | External users can report issues without login |
| Telegram Intake | One shared Telegram bot can route messages to the correct organization |
| AI Triage | AI-generated title, summary, category, priority, sentiment, team, response, and tags |
| Queue Processing | Redis and BullMQ process AI analysis asynchronously |
| Auditability | Important organization, issue, and integration actions are logged |
| Deployment | Angular on GitHub Pages, backend services on Oracle Cloud VM |

---

## Architecture

```text
Browser
  |
  | HTTPS
  v
GitHub Pages / Custom Domain
Angular Frontend
  |
  | HTTPS
  v
Oracle Cloud VM
Nginx Reverse Proxy
  |
  |-- /api  -> NestJS Backend
  |-- /auth -> Keycloak
              |
              |-- PostgreSQL App Database
              |-- PostgreSQL Keycloak Database
              |-- Redis + BullMQ
```

---

## Repository Structure

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
├── LICENSE
└── README.md
```

---

## Technical Stack

### Frontend

- Angular
- TypeScript
- Angular Router
- Angular Material
- Keycloak JS Adapter
- HTTP interceptors
- Route guards
- Domain-based services

### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ
- Keycloak JWT validation
- Swagger/OpenAPI
- class-validator
- class-transformer
- Helmet
- Docker

### Infrastructure

- Docker Compose
- Nginx reverse proxy
- GitHub Actions
- GitHub Pages
- Oracle Cloud VM

---

## Public URLs

| Service | URL |
|---|---|
| Frontend | `https://tiki.cimemyc.online` |
| Backend API | `https://api.tiki.cimemyc.online/api` |
| Swagger Docs | `https://api.tiki.cimemyc.online/api/docs` |
| Keycloak | `https://auth.tiki.cimemyc.online` |

---

## Local Development

Install dependencies:

```bash
npm install
```

Start local infrastructure:

```bash
docker compose up -d postgres_app postgres_keycloak redis keycloak
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations:

```bash
npm run prisma:migrate:deploy
```

Start backend and frontend:

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

---

## Docker Deployment

Start backend platform services:

```bash
docker compose up -d --build
```

Check service status:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f backend
docker compose logs -f keycloak
docker compose logs -f nginx
```

Apply database migrations:

```bash
docker compose exec backend npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

---

## GitHub Pages Deployment

The Angular frontend is deployed through GitHub Actions.

Build command:

```bash
npm run build:pages
```

The production frontend should point to:

```text
https://api.tiki.cimemyc.online/api
https://auth.tiki.cimemyc.online
```

GitHub Pages source:

```text
GitHub Actions
```

Workflow:

```text
.github/workflows/frontend-pages.yml
```

---

## Oracle VM Deployment

Connect to the VM:

```bash
ssh -i ~/Downloads/ssh-key-2026-05-08.key ubuntu@<vm-ip>
```

Clone the repository:

```bash
cd /home/ubuntu
git clone https://github.com/Fooumukni/Tiki.git
cd Tiki
```

Create the real environment file:

```bash
cp .env.example .env
nano .env
```

Start services:

```bash
docker compose up -d --build
```

Run migrations:

```bash
docker compose exec backend npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

Smoke test:

```bash
curl https://api.tiki.cimemyc.online/api/health
curl https://api.tiki.cimemyc.online/api/docs
curl https://auth.tiki.cimemyc.online
```

---

## Production Environment

Create a real `.env` file on the VM. Do not commit it.

Important values:

```text
NODE_ENV=production
BACKEND_PORT=3100

FRONTEND_URL=https://tiki.cimemyc.online
APP_BASE_URL=https://api.tiki.cimemyc.online
APP_CORS_ORIGIN=https://tiki.cimemyc.online

KEYCLOAK_REALM=tiki
KEYCLOAK_FRONTEND_CLIENT_ID=tiki-frontend
KEYCLOAK_BACKEND_CLIENT_ID=tiki-api
KEYCLOAK_AUDIENCE=tiki-api
KEYCLOAK_BASE_URL=https://auth.tiki.cimemyc.online
KEYCLOAK_ISSUER_URL=https://auth.tiki.cimemyc.online/realms/tiki
KEYCLOAK_JWKS_URI=https://auth.tiki.cimemyc.online/realms/tiki/protocol/openid-connect/certs

REDIS_HOST=redis
REDIS_PORT=6379

AI_PROVIDER=mock
```

Database passwords, Keycloak admin password, Telegram bot token, webhook secret, OpenAI key, and Gemini key must only exist in the real `.env`.

---

## Keycloak Configuration

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
```

Valid redirect URIs:

```text
https://tiki.cimemyc.online/*
https://fooumukni.github.io/Tiki/*
http://localhost:4210/*
```

Valid post logout redirect URIs:

```text
https://tiki.cimemyc.online/*
https://fooumukni.github.io/Tiki/*
http://localhost:4210/*
```

Web origins:

```text
https://tiki.cimemyc.online
https://fooumukni.github.io
http://localhost:4210
```

Realm roles:

```text
platform_user
platform_admin
```

Application organization roles such as `ORG_ADMIN`, `AGENT`, and `VIEWER` are managed inside the application database.

---

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

Frontend build:

```bash
cd frontend
npm run build:pages
```

Docker checks:

```bash
docker compose config
docker compose up -d --build
docker compose ps
```

---

## Security Notes

- The backend validates JWTs issued by Keycloak.
- The backend never handles passwords.
- Secrets are not committed to the repository.
- PostgreSQL and Redis are not publicly exposed.
- Public endpoints use rate limiting.
- Organization access is checked through internal memberships.
- AI usage is limited per organization.
- Telegram webhooks require a secret header.
- HTTPS is required for production browser usage.

---

## Roadmap

- Production-grade Keycloak hardening
- Automated TLS certificate renewal
- Monitoring and observability
- Email intake
- WhatsApp intake
- Billing and subscription plans
- Tenant administration panel
- Audit reporting
- Advanced AI routing rules
- Team assignment workflows
- 
---

## Project Conventions

- Code, identifiers, API responses, and UI strings are written in English.
- Secrets are stored only in local environment files.
- `.env` files, SSH keys, tokens, passwords, and private certificates are never committed.
- Controllers stay thin and delegate business logic to services.
- Authentication stays separate from organization authorization.
- Docker Compose runs backend platform services for the VM.
- GitHub Pages or a custom domain hosts the Angular frontend.

---

## License

This project is licensed under the **Apache License 2.0**.

See [LICENSE](LICENSE) for details.
