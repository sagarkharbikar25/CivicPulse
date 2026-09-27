# CivicPulse Security Policy & Security Architecture
### BRICS Track 1 — AI-Powered Digital Public Infrastructure

CivicPulse is designed as a trustworthy, transparent, and resilient Digital Public Good (DPG). Because the platform aggregates citizen grievances and informs municipal capital allocation, data integrity, citizen privacy, and service availability are critical.

---

## 1. Vulnerability Reporting & Disclosure

If you discover a security vulnerability within CivicPulse, please report it privately:

- **Security Contact:** `security@civicpulse.org` (or open a confidential security advisory on GitHub)
- **Response Timeline:** We acknowledge reports within 24 hours and aim to provide a remediation plan within 72 hours.
- **Scope:** Includes Express API gateway, Supabase data layer, scoring engine algorithms, and React frontend interfaces.
- **Responsible Disclosure:** Please do not publicly disclose the vulnerability until an official patch has been deployed.

---

## 2. Architecture Security Model & Trust Boundaries

```
[ Citizen Browser / Mobile ] ──(HTTPS / TLS 1.3)──▶ [ Reverse Proxy / CDN (Vercel/Render) ]
                                                              │
                                                [ Express API Security Layer ]
                                                ├── Helmet HTTP Security Headers
                                                ├── Tiered Rate Limiting (express-rate-limit)
                                                ├── Payload Caps (100kb) & Sanitization
                                                └── Admin Authentication Guard (x-admin-key)
                                                              │
                                                              ▼
                                            [ Supabase PostgreSQL + PostGIS ]
                                            ├── Row Level Security (RLS) Enforced
                                            ├── Public Read / Restricted Write
                                            └── Service Role Isolation
```

### Trust Zones:
1. **Public Zone (Citizen Facing):**
   - Untrusted inputs (voice recordings, freeform text, coordinate submissions).
   - Must be strictly validated, sanitized, and rate-limited.
2. **Application Core (Express API):**
   - Authenticates external traffic, manages AI orchestration pipelines, computes deterministic scoring, and enforces business rules.
3. **Data Storage (Supabase Postgres):**
   - Protected by Row Level Security (RLS). Direct client connections can only execute permitted SELECT queries using the anonymous key. Destructive and batch recompute operations require the Service Role key.

---

## 3. Threat Model & Implemented Mitigations

| Threat Vector | Potential Impact | CivicPulse Mitigation |
|---|---|---|
| **Automated Spam / Bot Flood** | Artificially inflated ward urgency, denial of service | IP-based tiered rate limiting (`15 req / 15 min` on submissions, `100 req / 15 min` general). |
| **Cross-Site Scripting (XSS)** | Malicious script execution in policymaker dashboard | Input sanitization stripping HTML tags, strict React JSX auto-escaping, and Helmet Content Security Policy (CSP). |
| **SQL / PostGIS Injection** | Unauthorized data access or alteration | Parameterized queries via Supabase client, input schema validation, zero string-concatenated SQL queries. |
| **Denial of Service via Payload Exhaustion** | Server memory starvation from massive requests | Strict `100kb` body parser cap (`express.json({ limit: '100kb' })`). |
| **Admin Route Tampering** | Malicious trigger of recalculation / resource drain | Administrative route guard requiring cryptographic `x-admin-key` / bearer token validation. |
| **Citizen PII Exposure** | Doxxing or tracking of individual complainants | Phone numbers and names are never required; coordinates can be jittered or aggregated to ward polygons. |
| **Clickjacking & MIME Sniffing** | UI redress attacks or MIME-confusion exploits | `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and `Strict-Transport-Security` headers. |

---

## 4. Row Level Security (RLS) Specification

All tables enforce PostgreSQL Row Level Security to prevent unauthorized modifications:

```sql
-- 1. submissions table
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view non-sensitive submission data
CREATE POLICY "Public submissions read"
  ON submissions FOR SELECT
  USING (true);

-- Allow public to insert complaints with default status
CREATE POLICY "Public complaint intake"
  ON submissions FOR INSERT
  WITH CHECK (
    status in ('new', 'reviewed', 'prioritized') AND
    raw_input_type in ('voice', 'text', 'chat')
  );

-- 2. region_index table
ALTER TABLE region_index ENABLE ROW LEVEL SECURITY;

-- Anyone can view demographic & infrastructure gap statistics
CREATE POLICY "Public region read"
  ON region_index FOR SELECT
  USING (true);

-- Only service role can modify region index data
CREATE POLICY "Service role region modify"
  ON region_index FOR ALL
  USING (auth.role() = 'service_role');

-- 3. priority_projects table
ALTER TABLE priority_projects ENABLE ROW LEVEL SECURITY;

-- Public can view prioritized project rankings
CREATE POLICY "Public priority projects read"
  ON priority_projects FOR SELECT
  USING (true);

-- Only service role can update priority projects
CREATE POLICY "Service role priority modify"
  ON priority_projects FOR ALL
  USING (auth.role() = 'service_role');
```

---

## 5. Environment Secrets & Access Management

- **Public Anon Key (`VITE_SUPABASE_ANON_KEY`):**
  - Safe for public browser bundles.
  - Restricted strictly by Row Level Security policies.
- **Service Role Key (`SUPABASE_SERVICE_ROLE_KEY`):**
  - Stored strictly in server-side environment (`server/.env`).
  - Never bundled into client builds or committed to version control (`.gitignore` enforces isolation).
- **Admin Secret Key (`ADMIN_API_KEY`):**
  - Required for triggering batch administrative recalculations (`/api/admin/recompute`).

---

## 6. Secure Coding Checklist

- [x] Security headers enabled via `helmet`
- [x] Multi-tier rate limiting active via `express-rate-limit`
- [x] Payload size capped at 100kb
- [x] Input validation and HTML sanitization on all citizen intake routes
- [x] Zero credential exposure in Git history (`.gitignore` covers `.env*`)
- [x] Database RLS policies documented and prepared for Supabase deployment
- [x] Error handlers suppress internal database stack traces in production
