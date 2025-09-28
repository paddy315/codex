# Reach Abiqx Platform

This repository now ships with a lightweight, dependency-free prototype of the Reach Abiqx marketing intelligence hub. The goal is to ensure the experience can be started instantly in restricted environments (like this challenge workspace) while still showcasing the product vision with interactive dashboards, alerts, integrations, and scheduled report views.

## Structure

- `backend/` – Minimal Node.js server that serves the dashboard and exposes JSON endpoints for KPIs, campaigns, alerts, integrations, scheduled reports, and activity logs.
- `frontend/` – Static assets (HTML, CSS, JavaScript) that render the Reach Abiqx dashboard, draw KPI charts, and consume the backend endpoints.
- `docs/` – Architecture and data model documentation that outlines the long-term plan for the platform.

## Start the Application

No dependency installation is required. The same Node.js process serves both the API and the dashboard.

```bash
node backend/server.js
```

Then open [http://localhost:4000](http://localhost:4000) in your browser to explore the dashboard.

### Available API Routes

All endpoints respond with JSON, enabling the frontend to stay in sync with the marketing data snapshot shipped in `backend/data/`.

- `GET /api/overview`
- `GET /api/kpis`
- `GET /api/campaigns`
- `GET /api/alerts`
- `GET /api/integrations`
- `GET /api/reports`
- `GET /api/activity`

## Dashboard Highlights

- **KPI Cards & Trend Insights** – Surface spend, revenue, ROAS, and leads alongside deltas versus the current goals.
- **Custom Canvas Chart** – Visualize revenue and spend trajectories without third-party libraries.
- **Alerts & Activity Feed** – Highlight automated insights and recent system events for quick triage.
- **Integrations & Reports** – Track sync status across connected channels and upcoming scheduled exports.
- **Dark/Light Mode Toggle** – Respect user preference or switch themes manually using the sidebar control.

Refer to `docs/architecture-plan.md` for the in-depth blueprint that continues to guide future iterations of the platform once full-stack dependencies are available again.
