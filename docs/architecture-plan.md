# Reach Abiqx Marketing Tracking App – Architecture Plan

## 1. Vision & Guiding Principles
- **Unified marketing intelligence**: Aggregate campaign data from paid, owned, and earned channels in one place.
- **Actionable insights**: Surface KPI trends, anomalies, and goal deviations with automated alerts.
- **Scalable foundation**: Modular integrations and API-driven services to onboard new channels quickly.
- **Secure collaboration**: Role-based access and team spaces tailored to agencies and multi-brand organizations.

## 2. High-Level System Architecture

```text
┌─────────────────────────────┐        ┌─────────────────────────────┐
│         Client Apps          │        │    Third-Party Platforms     │
│  - Web (Next.js)             │        │  - Google Ads / Meta Ads     │
│  - (Future) Mobile / Widgets │        │  - Email Service APIs        │
└─────────────┬───────────────┘        │  - Analytics APIs            │
              │                        └─────────────┬────────────────┘
              │ HTTPS (GraphQL/REST)                 │ Webhooks / Polling
┌─────────────▼───────────────┐        ┌─────────────▼───────────────┐
│     API Gateway / BFF       │        │   Integration Workers        │
│  - NestJS GraphQL/REST      │        │  - Scheduled fetchers        │
│  - Auth (JWT/OAuth2)        │<───────┤  - Webhook receivers        │
│  - Request validation       │        │  - Data normalization        │
└─────────────┬───────────────┘        └─────────────┬───────────────┘
              │                                     Batch jobs (BullMQ)
┌─────────────▼───────────────┐        ┌─────────────▼───────────────┐
│       Core Services          │        │   Analytics & Insights       │
│  - User & Team Service       │        │  - KPI aggregation           │
│  - Campaign Service          │        │  - Goal tracking             │
│  - Channel Service           │        │  - Alert engine              │
│  - Reporting Service         │        │  - Recommendation engine     │
└─────────────┬───────────────┘        └─────────────┬───────────────┘
              │                                     │
┌─────────────▼───────────────┐        ┌─────────────▼───────────────┐
│ PostgreSQL (Primary DB)     │        │  Redis / Queue               │
│  - Prisma ORM               │        │  - Job scheduling            │
│  - Row Level Security       │        │  - Caching (metrics, tokens) │
└─────────────────────────────┘        └─────────────────────────────┘
```

### Deployment Blueprint
- **Frontend**: Next.js app deployed to Vercel with ISR for dashboards and server actions for secure data fetching.
- **Backend API**: NestJS monorepo deployed on Render (or containerized via Docker). Provides GraphQL + REST endpoints, integrates with Redis for queues, and exposes webhook endpoints.
- **Database**: Managed PostgreSQL (Supabase or Render) with Prisma migrations. Leverage schema versioning and seed scripts for default roles.
- **Worker Tier**: Dedicated Node.js worker dynos processing background jobs (data sync, alert evaluation, report generation) via BullMQ + Redis.
- **Storage**: Object storage (Supabase Storage/S3) for generated report PDFs/CSVs.
- **Observability**: Centralized logging (Winston + Logflare/Datadog), metrics (Prometheus-compatible), and alerting on job failures.

## 3. Domain-Driven Module Overview
- **Identity Module**: Authentication, OAuth2 channel connections, organizations, teams, invites, RBAC.
- **Marketing Data Module**: Channels, integrations, campaigns, ad sets, creatives, metrics ingestion.
- **Analytics Module**: KPI calculation, normalization, time-series storage, goal evaluation.
- **Reporting Module**: Scheduled and on-demand report generation, templating, exports.
- **Notification Module**: Alert rules, notifications (email, Slack webhook), anomaly detection.

Each module is encapsulated in NestJS feature modules with their own controllers, services, repositories, and DTOs. Shared utilities (logging, error handling, DTO validation) live in a common library.

## 4. Data Model (Entity Overview)

| Entity | Purpose | Key Fields | Relationships |
| ------ | ------- | ---------- | ------------- |
| **Account** | Represents a tenant (company or agency). | `id`, `name`, `plan`, `settings` | One Account has many Teams, Users, Channels. |
| **Team** | Logical workspace within an Account (e.g., brand or client). | `id`, `account_id`, `name`, `default_timezone` | Belongs to Account; has many Users (via TeamMembership), Campaigns, Goals. |
| **User** | Application user authenticated via email/password or SSO. | `id`, `account_id`, `email`, `name`, `role`, `status`, `auth_provider` | Belongs to Account; many-to-many with Teams via TeamMembership. |
| **TeamMembership** | Join table capturing user roles per team. | `id`, `team_id`, `user_id`, `role` | Links Users and Teams; drives RBAC at team level. |
| **Channel** | Marketing platform connection (e.g., Google Ads). | `id`, `account_id`, `type`, `display_name`, `status`, `auth_metadata` | Belongs to Account; linked to Integrations, Campaigns. |
| **Integration** | Specific API connection credentials (refresh tokens, scopes). | `id`, `channel_id`, `external_account_id`, `credentials`, `expires_at` | One Channel has one or more Integrations for sub-accounts. |
| **Campaign** | Unified campaign object across channels. | `id`, `team_id`, `channel_id`, `external_id`, `name`, `status`, `start_date`, `end_date`, `budget` | Belongs to Team & Channel; has many AdGroups, Metrics, Goals. |
| **AdGroup / AdSet** | Sub-structure of campaigns for granular tracking. | `id`, `campaign_id`, `external_id`, `name`, `status` | Belongs to Campaign; has many Creatives and Metrics. |
| **Creative** | Individual ads or assets. | `id`, `ad_group_id`, `external_id`, `name`, `format`, `status`, `landing_url` | Belongs to AdGroup; metrics aggregated per creative. |
| **MetricDefinition** | Catalog of supported KPIs. | `id`, `key`, `name`, `unit`, `aggregation_type`, `description` | Referenced by MetricData, Goals, Alerts. |
| **MetricData** | Time-series fact table storing normalized metrics. | `id`, `metric_definition_id`, `entity_type`, `entity_id`, `timestamp`, `granularity`, `value`, `currency`, `dimension_filters` | Belongs to MetricDefinition; polymorphic relation to Campaign/AdGroup/Creative. |
| **Goal** | Target KPI definitions. | `id`, `team_id`, `entity_type`, `entity_id`, `metric_definition_id`, `period`, `target_value`, `comparison_operator` | Belongs to Team; linked to AlertRules. |
| **AlertRule** | Rules for anomaly detection or goal deviations. | `id`, `goal_id`, `threshold_type`, `threshold_value`, `notification_channels`, `is_active` | Associated with Goals; triggers AlertEvents. |
| **AlertEvent** | Logged alert occurrences. | `id`, `alert_rule_id`, `detected_at`, `status`, `details` | Belongs to AlertRule; used for notifications and audit trail. |
| **Insight** | Automated insight or recommendation record. | `id`, `team_id`, `entity_type`, `entity_id`, `title`, `description`, `insight_type`, `score`, `generated_at` | Linked to campaigns/ad groups; surfaced in dashboard and reports. |
| **ReportTemplate** | Definition of report structure. | `id`, `team_id`, `name`, `description`, `layout_config` | Has many ReportSchedules and ReportInstances. |
| **ReportSchedule** | Recurring report configuration. | `id`, `report_template_id`, `frequency`, `recipients`, `next_run_at`, `timezone`, `format` | Generates ReportInstances via worker jobs. |
| **ReportInstance** | Concrete report files generated (PDF/CSV). | `id`, `report_template_id`, `generated_at`, `status`, `file_url`, `parameters` | Linked to storage location and downloadable via API. |
| **AuditLog** | Tracks key actions for compliance. | `id`, `account_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at` | Referenced by security and support workflows. |
| **WebhookSubscription** | Outbound webhook destinations for clients. | `id`, `team_id`, `target_url`, `events`, `secret`, `status` | Used by Alert and Reporting modules to push updates. |
| **SessionToken / RefreshToken** | Auth tokens for user sessions. | `id`, `user_id`, `expires_at`, `scopes`, `device_info`, `revoked_at` | Managed by Identity module for JWT rotation. |

## 5. Data Flow Highlights
1. **Integration Setup**: User connects a channel → OAuth flow stores credentials in Integration → Channel marked active → background job syncs metadata.
2. **Data Ingestion**: Scheduled workers fetch metrics per Integration → normalize into MetricData → aggregate snapshots stored for dashboards.
3. **Analytics Processing**: KPI service computes rolling averages and goal comparisons → updates Insight and AlertRule evaluations.
4. **Dashboard Delivery**: Frontend queries BFF using GraphQL → receives denormalized DTOs (Campaign summary, KPI charts, alerts) optimized via caching.
5. **Reporting**: Report schedules enqueue jobs → worker renders template (React PDF/Handlebars) → uploads file to storage → notifies recipients via email/Slack.

## 6. Security & Compliance Considerations
- Enforce **row-level security** and account scoping in every query.
- Secrets (API keys, OAuth tokens) stored encrypted via KMS or Vault.
- Audit logging for key actions (auth events, channel changes, report downloads).
- Rate limiting and IP allowlists for public APIs/webhooks.
- GDPR-compliant data retention and deletion policies per account.

## 7. Extensibility Roadmap
- Abstract integration layer with adapters per channel; share normalization contracts.
- Plug-in system for new metrics (MetricDefinition seeds + transformation pipeline).
- Extend Notification module for SMS/Teams connectors.
- Support data warehouse export (BigQuery/Snowflake) via additional workers.

## 8. Next Steps
1. Validate data model with marketing stakeholders and prioritize MVP entities.
2. Define API surface (GraphQL schema + REST endpoints) per module.
3. Create low-fidelity UI wireframes for dashboard, alerts, reporting flows.
4. Establish development environments, CI/CD pipeline, and coding standards.
