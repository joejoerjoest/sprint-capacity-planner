# Capacity Planner for Jira

> Know your real sprint capacity before planning, not after committing.

Capacity Planner for Jira is an Atlassian Forge app that helps Scrum Masters and Delivery Managers calculate **true sprint capacity** — accounting for working days, holidays, leave, part-time availability, and meeting overhead — and compare it against what's actually **committed in Jira**, with charts, history, PDF export, and one-click publishing to Confluence.

## Overview

Teams often plan a sprint against headcount, not against the days people are actually available. Leave, public holidays, partial working weeks, part-time members, and meeting overhead quietly shrink real capacity — and the gap only shows up after the team has over-committed. This app surfaces the honest number *before* planning starts, and (when linked to a Jira sprint) shows committed story points versus available capacity, per team, per role, and per person.

## Features

### Capacity model
- **Sprint configuration** — name, start/end dates, capacity unit (Hours / Story Points / Both), default hours per day, hours-per-story-point conversion.
- **Configurable work week** — choose which weekdays count (defaults to Mon–Fri).
- **Company holidays** — org-wide non-working days that reduce capacity for everyone.
- **Team members** — per-member role and hours/day.
- **Per-member availability %** — set someone to e.g. 50% for the sprint (part-time, split across teams, ramp-up).
- **Leave planning** — per-member absences (Planned Leave, Public Holiday, Sick Leave, WFH), including **half-day** leave.
- **Buffer %** — shave a flat percentage off available capacity for meetings/overhead.

### Reporting & visuals
- **Capacity report** — working days, available hours & SP, average capacity, and a per-member breakdown with health pills (Healthy / Reduced / Critical) and a capacity-risk callout.
- **Capacity charts** — Available vs Committed SP per member, rendered both in-app and in the PDF.
- **Capacity by role** — available (and committed) capacity aggregated per role.
- **PDF export** — a polished report with the per-member table and the capacity chart; timestamped filenames.
- **Velocity & commitment trend** — a chart across saved history snapshots showing available vs committed SP over past sprints.

### Live Jira integration
- **Import sprint** — pull the project's active/future Scrum sprints; selecting one fills the name and dates and links it.
- **Import assignees** — add the linked sprint's issue assignees as team members.
- **Committed vs available** — sum committed story points for the linked sprint and compare to computed available capacity, at **team**, **per-role**, and **per-assignee** level (headroom vs over-committed).
- **Auto-load on open** — optionally pull commitment automatically when the page opens.
- The Jira sprint link is persisted per project.

### Workflow
- **Per-project persistence** — all setup is saved per Jira project (Forge KVS).
- **Sprint history** — snapshot the current sprint; view, restore, or delete past snapshots.
- **Start next sprint** — snapshot the current sprint, roll dates forward by the same span, keep the team/work-week/holidays/settings, and clear leave for a fresh sprint.
- **Publish to Confluence** — create (or update in place) a Confluence page with the report.

## Tabs at a glance

| Area | What it does |
|------|--------------|
| Sprint Configuration | Dates, unit, hours, buffer %, import/link Jira sprint, start next sprint |
| Work Week & Holidays | Pick working weekdays; manage org holidays |
| Team Setup | Add members (role, hours/day, availability %), import Jira assignees |
| Leave Planner | Log per-member leave (full or half day) |
| Capacity Report | Metrics, committed-vs-available, charts, by-role, per-member breakdown, PDF, Confluence publish |
| History | Velocity & commitment trend, snapshot/restore/delete |

## Using the app

1. **Open the planner** from a Jira project's nav (under **Apps** / **More** → *sprint-capacity-planner*).
2. **Configure the sprint** — set dates, unit, hours, and (optionally) buffer %. Use **Import sprint from Jira** to pull dates from a Scrum sprint.
3. **Set the work week & holidays.**
4. **Add the team** — manually or via **Import assignees from Jira**; set each member's hours/day and availability %.
5. **Log leave** in the Leave Planner (full or half day).
6. **Open the Capacity Report** — review available capacity, load **Jira commitment** to compare against committed work, view charts and the by-role/per-member breakdowns. **Export PDF** or **Publish to Confluence** to share.
7. **Roll forward** with **Start next sprint** when the sprint ends; review trends in **History**.

---

## For developers

This repository is the Forge app source.

- **Frontend:** Custom UI (Create React App) in `static/hello-world/` — all UI and capacity math live in `static/hello-world/src/App.js`.
- **Backend:** Forge resolver in `src/index.js` — per-project storage (`@forge/kvs`) and Jira/Confluence REST calls (`@forge/api`, `asApp`).
- **Manifest:** `manifest.yml` — `jira:projectPage` module, scopes, and Confluence egress.

### Prerequisites
- Node.js LTS and npm
- Forge CLI: `npm install -g @forge/cli`
- `forge login` with an Atlassian API token

### Build & deploy
```bash
# 1. Build the Custom UI frontend
cd static/hello-world
npm install
CI=false npm run build      # CI=false so CRA warnings don't fail the build

# 2. Deploy (from repo root)
cd ../..
forge deploy -e development

# 3. Install (multi-product: Jira + Confluence)
forge install --upgrade -p Jira       -s <your-site>.atlassian.net -e development --confirm-scopes
forge install            -p Confluence -s <your-site>.atlassian.net -e development --confirm-scopes
```
Re-run `forge install --upgrade` whenever scopes change. Promoting to production is the same with `-e production`.

> Note: the app uses both Jira and Confluence APIs, so it must be installed on **both** products, and the site must have Confluence activated for the publish feature.

### Storage model
- Per-project state: key `cap:<projectId>` (config, members, leaves, bufferPct).
- Sprint history: key `cap:<projectId>:hist` (capped at 20 snapshots).

### Permission scopes
Jira (granular): `read:board-scope:jira-software`, `read:sprint:jira-software`, `read:issue:jira-software`, `read:user:jira`, `read:project:jira`, `read:issue-details:jira`, `read:field:jira`, `read:jql:jira`, `read:issue-meta:jira`, `read:status:jira`, `read:project-role:jira`.
Confluence: `read:space:confluence`, `read:page:confluence`, `write:page:confluence`.
Platform: `storage:app`. Plus backend egress to Confluence for publishing.

## Compatibility and data handling

- **Hosting:** Jira Cloud + Confluence Cloud (Atlassian Forge).
- **Data handling:** The app stores planner state in Atlassian-hosted Forge storage, scoped per project. It reads only the Jira/Confluence information needed to calculate and publish the report, at the time you use it. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Support

For support, questions, or security matters, contact **security@jebanmartin.in**. See also [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md).

## Notes

- The display name is **Capacity Planner for Jira** (formerly *Sprint Capacity Planner for Jira*). The permanent app key (`com.jonathanjebanmartin.sprint-capacity-planner`) and this repository name are unchanged, as the app key cannot be modified after creation.
