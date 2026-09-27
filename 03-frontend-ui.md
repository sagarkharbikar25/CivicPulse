# Branch: `feature/frontend-ui`
### CivicPulse — Day 3 scope

**Goal:** React dashboard wired to the real API from `core-backend` (not mocks), styled to a distinctive dark/glassmorphic theme, built entirely from reusable components and hand-authored SVG icons — no icon libraries. Branch off `feature/core-backend`.

---

## Tasks
1. Scaffold Vite + React + Tailwind in `client/`
2. Build the SVG icon set first (10–12 icons) as individual React components — this becomes your icon library for the rest of the build
3. Build reusable primitives: `Button`, `Card`, `Badge`, `StatPill`
4. Build `Dashboard.jsx` — static map view wired to `GET /api/priority/heatmap`, ranked list wired to `GET /api/priority`
5. Build `SubmitComplaint.jsx` — text submission form calling `POST /api/submissions/text` (voice recorder UI comes in `wow-feature` branch)
6. Build `PolicymakerView.jsx` — the ranked priority table with category filters

---

## Design direction (non-generic, per your reference)

- **Palette:** near-black background (`#0A0A0B` / `#121214`), soft white text, one accent color used sparingly (electric blue or warm amber) for interactive elements and score highlights — not a rainbow of category colors
- **Typography:** pair a clean sans-serif (body/UI) with a serif or italic display font for hero/headline moments — mirrors the "One-click for your *Success*" contrast in your reference
- **Texture:** subtle gradient glows behind key panels rather than flat cards; soft light-line accents at panel edges
- **Motion:** minimal — reserve animation for the WOW moment (new submission dropping onto the map), not decorative UI elements

## Components owned by this branch
```
client/src/components/
├── icons/          # one .jsx file per icon, e.g. MicIcon.jsx, MapPinIcon.jsx, CategoryRoadIcon.jsx
├── ui/              # Button.jsx, Card.jsx, Badge.jsx, StatPill.jsx
└── map/
    └── HeatmapView.jsx   # static render first, realtime subscription added in wow-feature branch
client/src/pages/
├── Dashboard.jsx
├── SubmitComplaint.jsx
└── PolicymakerView.jsx
```

## Done when
- Dashboard renders real data from the deployed `core-backend` API, not hardcoded mocks
- All icons are custom SVG components, zero external icon library imports
- Every repeated visual element (buttons, cards, badges) goes through the shared `ui/` components, not one-off styled divs
- Layout holds up at both desktop and typical demo-screen/projector resolution
- 5+ commits showing incremental progress (icons → primitives → dashboard wired → polish)
