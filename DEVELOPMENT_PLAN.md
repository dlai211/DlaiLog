# DlaiLog — Development Plan (V1)

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-09-30 |
| **Basis** | `PRD.md` v1.0 (confirmed) — the PRD is the source of truth; this plan says *how and in what order* to build it |
| **Approach** | 10 small phases; the app stays runnable and demo-able at the end of every phase |
| **Audience** | The owner (a beginner) + any future development session |

> **Status: V1 complete** — all ten phases are built, committed and verified.
> Every acceptance criterion in `PRD.md` §10 is ticked, with a note on how it is verified.
> The work sits on the `build/v1` branch, one checkpoint commit per phase; `main` is untouched.
>
> Run it: `npm run web` (opens the app in the browser) ·
> Check it: `npm run verify` (types + lint + 206 unit/component tests) ·
> `npm run test:e2e` (builds the app and drives it in a real browser)

---

## 0. How to use this plan

- Each phase below is one work session. At the end of each phase there is a **Demo** (what you click) and a **Verify** (how we know it's correct, traced to `PRD.md` §10 acceptance criteria).
- The app must **run without errors after every phase** — never leave it broken.
- One command runs everything during development, from `C:\Users\laiji\VSCode\DlaiLog`:

```bash
npm run web          # starts the app and opens it in the browser (localhost:8081)
                     # Ctrl+C in the terminal stops it
npx tsc --noEmit     # type check — must pass before a phase is called done
npm run lint         # style check — same rule
```

- **Checkpoints (optional):** DlaiLog is a git repository. If you want, a git commit can be saved at the end of each phase so any phase can be undone. Say the word and it becomes part of the routine — otherwise we skip it.
- Verification is manual and honest: there is no test framework in V1; "verify" means the type check passes, the app runs, and the listed acceptance criteria really behave as described in the browser.

---

## 1. Setup facts (already checked in the project)

**Reused from the template:** the theme system (`src/constants/theme.ts` light/dark colors, `Spacing` scale), `ThemedText`/`ThemedView`, the `@/` → `src/` path alias, the Expo Router setup, and the animated splash.

**Replaced:** the template's tab bar (`app-tabs.tsx` / `app-tabs.web.tsx`) — it becomes a custom sidebar shell. The "Explore" demo screen is removed.

**Packages to install** (Phase 0) — nothing else is needed:

| Package | Why |
|---|---|
| `@react-native-async-storage/async-storage` | Save all data in the browser's local storage (works on a future phone version too) |
| `react-native-svg` | Draw the price-history line charts and mini price lines |

Both are installed with `npx expo install` (not `npm install`) so the versions match Expo SDK 57.

---

## 2. Target file map

Legend: **NEW** = create · **CHG** = modify · **DEL** = delete · **KEEP** = untouched

```
DlaiLog/
  PRD.md                          KEEP   (source of truth)
  DEVELOPMENT_PLAN.md             this file

  src/
    app/
      _layout.tsx                 CHG   providers + shell (was: theme + tabs)
      index.tsx                   CHG   Home dashboard
      todo.tsx                    NEW   To-do (Day/Month calendar)
      projects.tsx                NEW   Projects
      spending.tsx                NEW   Spending
      grocery.tsx                 NEW   Grocery Tracker
      explore.tsx                 DEL   template demo screen

    components/
      app-shell.tsx               NEW   responsive sidebar / bottom-bar navigation
      app-tabs.tsx                DEL   replaced by app-shell
      app-tabs.web.tsx            DEL   replaced by app-shell
      hint-row.tsx                DEL   template demo
      web-badge.tsx               DEL   template demo
      external-link.tsx           DEL   template demo
      animated-icon.tsx           KEEP  splash animation
      themed-text.tsx             KEEP
      themed-view.tsx             KEEP
      ui/
        collapsible.tsx           KEEP  reused for To-do's "Done" section
        modal.tsx                 NEW   centered pop-up frame used by every add/edit form
        form-field.tsx            NEW   labelled text/number input with hint + error
        select.tsx                NEW   dropdown (units, stores, filters)
        confirm-dialog.tsx        NEW   "Are you sure?" delete confirmation
        toast.tsx                 NEW   small bottom notification + Undo (notes)
        card.tsx                  NEW   rounded card container
        empty-state.tsx           NEW   friendly "nothing here" block
        progress-bar.tsx          NEW   project progress bar
        chip.tsx                  NEW   small pill (category tag, filter, "+2 more")
        segmented.tsx             NEW   segmented control (Day|Month, status, category)
        row-actions.tsx           NEW   hover-revealed ✎ ✕ on list rows
        month-grid.tsx            NEW   month calendar grid (To-do Month view AND date picker)
        date-picker.tsx           NEW   pop-up wrapping month-grid
        time-picker.tsx           NEW   simple hour/minute picker
        emoji-picker.tsx          NEW   searchable emoji grid
        autocomplete-field.tsx    NEW   text input with suggestions (items, stores)
        line-chart.tsx            NEW   SVG price-history chart + mini sparkline

    store/
      types.ts                    NEW   Task / Note / Project / Purchase definitions
      storage.ts                  NEW   load & save everything under one local-storage key
      data-provider.tsx           NEW   app-wide data + all add/edit/delete actions
      selectors.ts                NEW   derived data (today's tasks, grocery items, summaries…)
      backup.ts                   NEW   build backup file / read & validate a backup file

    data/
      categories.ts               NEW   Condiment / Grocery / Miscellaneous: labels + colors
      units.ts                    NEW   ml, L, g, kg, pcs, pack
      emoji-catalog.ts            NEW   ~150 food/household emojis with search keywords

    lib/
      format.ts                   NEW   money ($1,234.50) and date (Tue, Sep 30) formatting
      dates.ts                    NEW   date keys, month-grid math, week strip
      id.ts                       NEW   unique id generator

    constants/theme.ts            CHG   add the extra colors listed in §3.5
```

Template files that stay as-is but gain nothing: `src/hooks/*`, `src/components/ui/collapsible.tsx`, assets.

---

## 3. Data & storage design (the engine under every screen)

### 3.1 Records (from PRD §5)

| Record | Fields |
|---|---|
| **Task** | id · title · date (`YYYY-MM-DD`) · time? (`HH:MM`) · note? · done · createdAt |
| **Note** | id · text · createdAt |
| **Project** | id · name · description? · status (`not-started` / `in-progress` / `done`) · progress (0–100, multiples of 5) · targetDate? · notes? · createdAt · updatedAt |
| **Purchase** | id · date · itemName · icon (emoji) · category (`condiment` / `grocery` / `misc`) · amount · unit · totalPrice · store · createdAt |

Everything lives in one object: `{ version: 1, tasks: [], notes: [], projects: [], purchases: [] }`.

### 3.2 Storage rules

- One key: `dlailog:v1` in browser local storage (through AsyncStorage).
- **Load once at startup, then render nothing but a tiny "Loading…" until it's done** — this prevents the classic bug of an empty store overwriting real data.
- After loading, **every change is saved immediately** (no Save button, per PRD §2.3).
- `replaceAll(db)` exists solely for Restore.

### 3.3 Derived data (selectors — never stored)

- `tasksForDay`, `overdueTasks`, `monthMatrix(year, month)`, `weekStrip(date)`
- `spendingForMonth`, `dayGroups`, `monthSummary` (total, count, top store/category), `itemMemory` (name → last icon/category/unit/store)
- `groceryItems` — groups purchases by `itemName.trim().toLowerCase()`, each with history sorted by date, unit price per purchase, low/high/average unit price, total spent, and change vs previous purchase
- `homeSummary` — month total + % vs last month; top 3 active projects; biggest grocery price movers

### 3.4 Conventions (so all screens behave identically)

- **Dates** are `YYYY-MM-DD` strings in local time (no timezone bugs); **money** is a number, formatted `$1,234.50` on screen; unit price = `totalPrice ÷ amount`, rounded to 2 decimals for display.
- **Item identity** = lowercased, trimmed name — renaming an entry merges it into the corrected item automatically.
- **Ids** from `crypto.randomUUID()` with a fallback.
- **Browser-only code** (file download / file pick via `document`) is confined to `store/backup.ts` and marked with a comment, so a future phone version swaps exactly one file.

### 3.5 Theme additions (`constants/theme.ts`)

Add to both light and dark: `border`, `textTertiary`, `danger` (red — overdue, price ▲), `success` (green — cheaper ▼, done), `warning` (amber), and the three category colors — **Condiment amber, Grocery green, Miscellaneous blue** (PRD §2.3).

---

## 4. Phases

### Phase 0 — Setup & packages
**Goal:** install the two packages, touch nothing else. **Size:** small.

**Steps**
1. In `DlaiLog/`: `npx expo install @react-native-async-storage/async-storage react-native-svg`
2. `npm run web` → the template app still opens. `npx tsc --noEmit` → clean.

**Demo:** the unchanged Expo starter opens in the browser.
**Verify:** no red errors in the terminal or browser console.

---

### Phase 1 — App shell & navigation
**Goal:** DlaiLog looks like *our* app: five sections, sidebar navigation, empty screens. **Size:** medium.

**Files:** NEW `components/app-shell.tsx`, `app/todo.tsx`, `app/projects.tsx`, `app/spending.tsx`, `app/grocery.tsx` · CHG `app/_layout.tsx`, `app/index.tsx`, `constants/theme.ts` · DEL `components/app-tabs.tsx`, `components/app-tabs.web.tsx`, `app/explore.tsx`, `components/hint-row.tsx`, `components/web-badge.tsx`, `components/external-link.tsx`

**Steps**
1. Build `app-shell.tsx` using the headless tabs (`Tabs`/`TabList`/`TabSlot`/`TabTrigger` from `expo-router/ui` — the mechanism the template's web tab bar already uses). Five triggers: Home, To-do, Projects, Spending, Grocery, with their emoji (🏠 ✅ 📊 💰 🛒 — matching the PRD wireframe).
2. Responsive: window ≥ 1000px wide → vertical sidebar on the left; narrower → bottom bar. Uses `useWindowDimensions()`. Active section highlighted.
3. Sidebar footer: "💾 Backup/Restore" button (inert for now) + small "Saved on this PC" text; brand "DlaiLog" at the top.
4. Each screen gets the shared header pattern: title left, "+ Add" button right (inert for now), placeholder body.
5. Add theme colors from §3.5 and give each screen its own URL (`/`, `/todo`, `/projects`, `/spending`, `/grocery`).

**Demo:** click through all five sections; shrink the window below ~1000px and watch the sidebar become a bottom bar; switch Windows dark mode and watch the app follow.

**Verify:** PRD §10.1 boxes 1–2 and box 6 (theme). `tsc` clean.

---

### Phase 2 — Data engine & shared UI kit
**Goal:** the invisible foundation every module will stand on. No visible change yet — visible proof comes in Phase 3. **Size:** medium.

**Files:** NEW `store/types.ts`, `store/storage.ts`, `store/data-provider.tsx`, `store/selectors.ts` (first half), `lib/id.ts`, `lib/dates.ts`, `lib/format.ts`, `data/categories.ts`, `data/units.ts` · NEW `components/ui/`: `modal.tsx`, `form-field.tsx`, `select.tsx`, `confirm-dialog.tsx`, `toast.tsx`, `card.tsx`, `empty-state.tsx`, `progress-bar.tsx`, `chip.tsx`, `segmented.tsx`, `row-actions.tsx` · CHG `app/_layout.tsx` (wrap with `DataProvider` + `ToastProvider`)

**Steps**
1. Types exactly as §3.1; storage exactly as §3.2 (including the loading gate); provider exposes `db` + actions: `addTask/updateTask/deleteTask`, `addNote/deleteNote`, `addProject/updateProject/deleteProject`, `addPurchase/updatePurchase/deletePurchase`, `replaceAll`.
2. `format.ts`: money and date helpers; `dates.ts`: today-key, week strip, month grid math; `id.ts`.
3. UI kit as listed — each is small and generic (the pop-up frame, the confirm dialog, the toast with Undo, the progress bar…). All built once, reused by every module.

**Demo:** app still opens normally (no visible change).
**Verify:** `tsc` + `lint` clean, no console errors. Persistence itself gets proven in Phase 3.

---

### Phase 3 — Projects (first real module)
**Goal:** the first complete vertical slice — prove the whole pattern end-to-end: screen → pop-up → store → saved to disk → survives refresh. **Size:** medium.

**Files:** CHG `app/projects.tsx`, `store/selectors.ts` (project helpers)

**Steps**
1. Card grid: name, status pill, progress bar + %, target date ("3 days left" / red "Overdue" / "No due date"), description line; active first by target date, Done dimmed at bottom.
2. Filter chips: All / Active / Done.
3. "+ New project" pop-up: name (required), description, status (segmented), progress slider snapping to 5%, target date (via `date-picker.tsx`), notes. Same pop-up for editing (click a card). Delete with confirmation.
4. Empty state: "No projects yet — add your first one."

**Demo:** add two projects, drag the progress slider, refresh the browser → **both still there** (first persistence proof). Filter, edit, delete.
**Verify:** PRD §10.4 (all boxes) + §10.1 box 3.

> Good moment to pause and review the look & feel together before the pattern is copied four more times.

---

### Phase 4 — To-do (the calendar)
**Goal:** the biggest module: tasks on a Day and Month calendar. **Size:** large.

**Files:** CHG `app/todo.tsx`, `store/selectors.ts` (task helpers) · NEW `components/ui/month-grid.tsx`, `date-picker.tsx`, `time-picker.tsx`

**Steps**
1. Header: Day | Month segmented toggle, ◀ date/month ▶ navigation, "Today" button, "+ New task".
2. **Day view:** a week strip on top (dots = tasks, click to jump); TIMED section (sorted by time, time shown); ANYTIME section; collapsible "Done" section (reuse `ui/collapsible.tsx`). Checkbox completes/uncompletes. Overdue unfinished tasks from earlier days pinned in red at the top.
3. **Month view:** 7-column grid; each day shows up to 3 task chips + "+N more"; today highlighted; clicking a day opens its Day view. `month-grid.tsx` is shared with the date picker.
4. Add/edit pop-up: title (required), date (defaults to the viewed day), "Set time" toggle → `time-picker`, note. Delete with confirmation.
5. Support `/todo?date=YYYY-MM-DD` in the URL (used later by Home's week strip).

**Demo:** walk PRD §10.3 box by box.
**Verify:** PRD §10.3 (all), §10.1 box 3 for tasks.

---

### Phase 5 — Spending
**Goal:** the purchase log — the app's most-used input screen. **Size:** large.

**Files:** CHG `app/spending.tsx`, `store/selectors.ts` (spending helpers) · NEW `components/ui/emoji-picker.tsx`, `autocomplete-field.tsx`, `data/emoji-catalog.ts`

**Steps**
1. Filter bar: month selector (◀ Sep 2026 ▶), category chips, store dropdown, name search — all combinable.
2. Summary strip: month total, entry count, top store.
3. Day-grouped list (newest first) with day totals; each row: emoji + name, category tag (category color), store, amount + unit, unit price (small), total price (bold), hover ✎ ✕.
4. Add/edit pop-up in this order: item name (with `autocomplete-field` — picking a suggestion auto-fills icon, category, unit, and store from the item's last purchase = "item memory"), emoji icon (searchable picker, recently used first), category (three big buttons), amount + unit, total price with **live "= $6.45 per L" preview**, store (autocomplete), date (defaults today). Required fields block saving with a short hint.
5. Delete with confirmation. Support `/spending?edit=<id>` in the URL (used by the Grocery Tracker's "edit in Spending ↗").

**Demo:** walk PRD §10.5 box by box — especially the "soy" autofill and the live per-unit preview.
**Verify:** PRD §10.5 (all) + §10.1 box 3 for purchases.

---

### Phase 6 — Grocery Tracker
**Goal:** the payoff module — automatic price history, zero manual entry. **Size:** medium.

**Files:** CHG `app/grocery.tsx`, `store/selectors.ts` (`groceryItems`) · NEW `components/ui/line-chart.tsx` (react-native-svg)

**Steps**
1. `groceryItems` selector: group purchases by item identity; per item — history (date, store, amount, unit, total, unit price), latest unit price, change vs previous purchase, low/high/average, total spent.
2. Header: subtitle "Built automatically from your Spending entries"; **no add button**. Category tabs with counts (Condiment / Grocery / Miscellaneous) + search box.
3. Item rows: emoji + name, latest unit price (large), ▲ red / ▼ green / — , last bought date + store, mini sparkline.
4. Expand a row: full line chart (one dot per purchase), stats row, history table; each history row links "edit in Spending ↗" → `/spending?edit=<id>`.
5. Empty state: "No items yet — log a purchase in Spending and it appears here automatically."

**Demo:** walk PRD §10.6 box by box.
**Verify:** PRD §10.6 (all).

---

### Phase 7 — Home dashboard + Quick Notes
**Goal:** the front page that ties everything together. Built last because it summarizes modules that must already exist. **Size:** medium.

**Files:** CHG `app/index.tsx`, `store/selectors.ts` (`homeSummary`)

**Steps**
1. Today's Plan card: overdue in red on top, today's tasks as **working checkboxes** (same data as To-do), inline "+ Add a task…" box, week strip that navigates to `/todo?date=…`.
2. Quick Notes card: type + Enter to add, newest first, ✕ deletes instantly with an Undo toast.
3. Spending card: month total, % vs last month, top category, entry count → navigates to Spending.
4. Projects card: top 3 active projects with live progress bars → Projects.
5. Grocery Watch card: 2–3 biggest unit-price movers this month → Grocery Tracker.
6. Two-column card grid on wide windows, single column when narrow.

**Demo:** walk PRD §10.2 box by box — tick a task on Home, then confirm it's ticked in To-do too.
**Verify:** PRD §10.2 (all).

---

### Phase 8 — Backup & Restore
**Goal:** the data-safety promise from PRD §7. **Size:** small.

**Files:** NEW `store/backup.ts` · CHG `components/app-shell.tsx` (footer button gets its pop-up)

**Steps**
1. Backup format: `{ app: "dlailog", version: 1, exportedAt: ISO date, data: <db> }`.
2. **Download backup file** → `dlailog-backup-YYYY-MM-DD.json` (browser download; all web-specific code isolated in `backup.ts`).
3. **Restore from file** → file picker → validate (right app/version/basic shape) → "This replaces all current data" confirmation → `replaceAll` → app updates everywhere. Invalid file → clear error toast, existing data untouched.

**Demo:** walk PRD §10.7 box by box — including the real test: download a backup → clear the app's site data in the browser → app is empty → restore → everything is back, including grocery charts.
**Verify:** PRD §10.7 (all) + §10.1 boxes 3–5.

---

### Phase 9 — Polish & the full acceptance pass
**Goal:** go from "works" to "V1 done". **Size:** medium.

**Steps**
1. Walk **every checkbox in PRD §10 top to bottom** in one sitting and fix whatever fails — this is the definition of done.
2. Audit pass: formatting (all dates "Tue, Sep 30", all money `$1,234.50`), category colors consistent in Spending, tracker tabs and charts, empty states everywhere, Esc closes pop-ups / Enter submits, hover actions, dark mode on every screen, no console warnings.
3. Tick the finished boxes in `PRD.md` and (optionally) save a git checkpoint.

**Demo / Verify:** the entire PRD §10 checklist passes.

---

## 5. Traceability — PRD acceptance criteria → phases

| PRD criteria | Phase |
|---|---|
| §10.1 Shell & persistence (boxes 1–2, 6) | 1 |
| §10.1 persistence (boxes 3–5) | 3 (first proof), re-checked 9 |
| §10.2 Home | 7 |
| §10.3 To-do | 4 |
| §10.4 Projects | 3 |
| §10.5 Spending | 5 |
| §10.6 Grocery Tracker | 6 |
| §10.7 Backup & restore | 8 |
| §10.8 Formatting & polish | woven through 3–7, audited 9 |

## 6. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Empty store overwrites real data before loading finishes | Loading gate in Phase 2 (render nothing until load completes) |
| A phase leaves the app broken | "App runs at the end of every phase" rule + `tsc` gate before each phase closes |
| Float rounding in money | Round only at display time; unit price = total ÷ amount, rounded to 2 decimals |
| Web-only browser APIs make a future phone version painful | All of it confined to `store/backup.ts`, flagged with comments |
| Template leftovers cause confusing errors | Full delete list in Phase 1 |

## 7. After V1

The deferred list in `PRD.md` §9 is the backlog (phone version, cloud backup, week view, recurring tasks, budgets, etc.). Nothing in this plan blocks any of it.
