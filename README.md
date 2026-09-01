# LabPulse — Genie-Powered Facility & Laboratory Utilisation Intelligence
### Role-Based Edition

A full-stack campus operations platform that reconciles what facilities are
**booked** for against what they are **actually used** for, using a
Databricks Genie Space as the core reasoning engine, scoped per user role.

Built for: Databricks Campus Hackathon — RVCE Edition, Bengaluru Tech Week 2026
Track A: Real-World Campus Problem Solver — Genie-Powered Campus Intelligence

**Want a live clickable demo link right now?** See `GITHUB_PAGES_DEPLOY.txt`
— push this folder to GitHub, enable Pages, and `index.html` at the root
gives you a fully working, backend-free demo at
`https://<your-username>.github.io/<repo-name>/` in under 2 minutes.

---

## 1. What's in this project

```
labpulse_project/
├── index.html                       <- STATIC DEMO — GitHub Pages entry
│                                        point, works standalone in any browser
├── GITHUB_PAGES_DEPLOY.txt          <- exact steps + correct URL pattern
├── README.md                        <- you are here
├── PROJECT_DOCUMENTATION.txt        <- problem, solution, RBAC, architecture
├── INNOVATIONS_AND_CRUD.txt         <- full CRUD endpoint list + roadmap
├── MASTER_SPEC_COVERAGE_MAP.txt     <- maps every spec section to what's built
├── LabPulse_Prototype_Deck.pptx     <- hackathon pitch deck
├── backend/                         <- Node.js + Express API
│   ├── server.js
│   ├── routes/                      <- auth, users, facilities, bookings,
│   │                                    usage, maintenance, analytics,
│   │                                    notifications, audit, genie
│   ├── middleware/                  <- JWT auth + role-based access control
│   ├── services/                    <- Genie layer, analytics engine,
│   │                                    notifications, audit logger, data store
│   └── data/                        <- seed JSON (stand-in for Delta tables)
├── frontend/                        <- React (Vite) role-based dashboard
│   └── src/
│       ├── pages/                   <- dashboards, Facility Discovery,
│       │                                Analytics, Campus Map, Notifications,
│       │                                Audit Trail
│       └── components/              <- Sidebar, GenieChat, floating Genie button
└── database/
    ├── schema.sql                   <- full relational schema (all tables)
    ├── seed_*.csv                   <- seed data for Databricks upload
    └── genie_space_instructions.txt <- paste into your Genie Space
```

---

## 2. Roles supported

| Role | Can do | Genie sees |
|---|---|---|
| Admin | Everything, including full user & facility management (create/edit/delete) | Unrestricted |
| Faculty | Book facilities in their department, view/cancel own bookings | Own department + own bookings |
| Student | Check availability, request restricted bookings (routed for approval), cancel own requests | Availability only, read-only |
| Lab Incharge | Manage their assigned lab(s), log/correct usage, report issues | Scoped to assigned facility_id(s) |
| Maintenance | View/update the issue queue, mark facilities under repair | Maintenance records only |
| Operations | Cross-department analytics, utilisation trends | Full analytical scope, no user management |
| Guest | Time-boxed single-facility availability check | Single facility_id, availability only |

Role and scope are embedded directly into the JWT at login and re-validated
on every request — the frontend UI hides what a role shouldn't see, but the
**backend is the real enforcement layer**.

Every resource — users, facilities, bookings, usage logs, maintenance
tickets — supports full CRUD (Create, Read, Update, Delete), scoped by
role at every verb. See `INNOVATIONS_AND_CRUD.txt` for the complete
endpoint list and the new features layered on top (ghost booking
detection, and a stretch-goal roadmap for the pitch).

---

## 3. Running it locally

### Backend
```bash
cd backend
cp .env.example .env      # fill in JWT_SECRET at minimum
npm install
npm run dev                # http://localhost:5000
```

By default `USE_MOCK_GENIE` is effectively `true` (see `.env.example` — set
`USE_MOCK_GENIE=false` and fill in the Databricks variables once you have a
live Genie Space connected). The mock Genie service computes real answers
from the same seed data using the same reconciliation logic described in
`database/genie_space_instructions.txt`, so the full demo works end-to-end
with zero external dependencies.

### Frontend
```bash
cd frontend
npm install
npm run dev                # http://localhost:3000
```

The Vite dev server proxies `/api` to `http://localhost:5000`, so start the
backend first.

### Demo logins
| Email | Password | Role |
|---|---|---|
| admin@labpulse.edu | admin123 | Admin |
| rakesh.iyer@labpulse.edu | faculty123 | Faculty (Chemistry) |
| priya.sen@labpulse.edu | faculty123 | Faculty (Computer Science) |
| arjun.mehta@labpulse.edu | student123 | Student |
| vikram.nair@labpulse.edu | lab123 | Lab Incharge (Organic Chemistry Lab) |
| suresh.kumar@labpulse.edu | maint123 | Maintenance |
| divya.menon@labpulse.edu | ops123 | Operations |
| james.carter@labpulse.edu | guest123 | Guest (time-boxed) |

---

## 4. Connecting to real Databricks Genie

1. Upload the CSVs in `database/` as Delta tables in a Unity Catalog schema
   (e.g. `campus_ops.labpulse`).
2. Create a Genie Space over those tables, and paste in
   `database/genie_space_instructions.txt` as its instructions.
3. In `backend/.env`, set `DATABRICKS_HOST`, `DATABRICKS_TOKEN`,
   `GENIE_SPACE_ID`, and `USE_MOCK_GENIE=false`.
4. `backend/services/genieService.js` already contains the real Genie
   Conversation API call path — no other code changes needed.

---

## 6. What's new in this build

On top of the original CRUD + RBAC foundation, this version adds the full
LabPulse intelligence layer:

- **Phantom / ghost booking detection** — confirmed bookings with zero
  recorded usage, surfaced both via the dashboard and via Genie directly
  ("Which bookings are ghost bookings?")
- **Root cause analysis** — click "Why?" next to any facility's utilisation
  to get cause → evidence → recommended action
- **Facility health scores** — a weighted 0–100 score per facility, tiered
  healthy / attention required / critical
- **Demand intelligence** — most/least requested facilities, peak hour,
  department-level demand ranking
- **Baseline forecasting** — a simple next-period utilisation projection
  per facility (clearly labelled as a heuristic, not a trained model)
- **Notifications** — auto-generated on booking confirm/cancel and
  maintenance alerts, with a dedicated Notifications page
- **Audit trail** — every login, booking, and maintenance action logged
  and viewable by admins
- **Facility Discovery** — searchable/filterable facility catalogue with
  a book/request flow
- **Campus Map** — status-grid view of every facility (🟢🔴🟡⚪)
- **Global floating Genie button** — ask a question from any page
- **CSV report export** for utilisation, phantom bookings, and health scores

See `MASTER_SPEC_COVERAGE_MAP.txt` for a section-by-section mapping of the
full LabPulse master specification to what's implemented here vs. documented
as roadmap.

See `INNOVATIONS_AND_CRUD.txt` for the complete API endpoint list and
the full CRUD coverage added across every resource.
