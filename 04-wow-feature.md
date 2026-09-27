# Branch: `feature/wow-feature`
### CivicPulse — Day 4 scope

**Goal:** The live voice → instant-ranked-map demo moment, plus final merge and deploy. Branch off `feature/frontend-ui` (needs the dashboard) — this is the last branch, and it's isolated on purpose: if it's not fully stable by demo time, `main` still ships a working product without it.

---

## Tasks

### Morning — Realtime map
1. Add a Supabase Realtime subscription (`useRealtimeSubmissions.js`) listening for inserts on `submissions`
2. Wire new inserts to animate a point onto `HeatmapView.jsx` and re-sort the ranked list — this is the visible "AI is working" moment
3. Test with rapid-fire fake submissions (script 10 inserts in a row) to confirm the UI doesn't jank or drop updates

### Midday — Voice demo flow
4. Build `VoiceRecorder.jsx` — record button → upload to `POST /api/submissions/voice` → show live transcript preview → show it land on the map
5. Rehearse the **exact** live-mic flow at least 5 times, on the actual demo device/network if possible — this is where hackathons go wrong, not in the code
6. Build the fallback: 3–4 pre-tested example audio clips ready to trigger instantly if live mic/wifi fails on stage

### Afternoon — Merge everything
7. Merge order into `main`: `core-backend` → `ai-integration` → `frontend-ui` → `wow-feature`
8. Resolve conflicts, run the full flow end-to-end on the merged `main`
9. Redeploy: Render (backend), Vercel (frontend), confirm Supabase Realtime works across the deployed URLs (not just localhost)

### Evening — Submission polish
10. Record a 90-second backup demo video — required safety net, not optional
11. Write final `README.md`: problem, architecture diagram, setup steps, "how this scales across BRICS nations" section
12. Prep the 90-second pitch narrative (see `plan.md` §11)

---

## Components owned by this branch
```
client/src/components/voice/
├── VoiceRecorder.jsx
└── TranscriptPreview.jsx
client/src/hooks/useRealtimeSubmissions.js
```

## Done when
- A live voice submission visibly appears on the map and re-ranks the priority list within ~5 seconds, on the deployed (not local) build
- Fallback demo path (pre-tested clips) works and has been rehearsed
- `main` is fully merged, deployed, and demo-ready with no branch left unmerged
- Backup video recorded, README complete
- 5+ commits showing incremental progress (realtime wired → voice UI → merge → deploy → docs)
