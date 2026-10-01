# DlaiLog — Product Requirements Document (PRD)

| | |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-09-30 |
| **Status** | Confirmed by owner — the basis for development |
| **Product** | DlaiLog — a personal work & life app |
| **Platform (V1)** | Runs locally in this PC's browser (Expo / React Native for Web) |
| **Data** | Stored locally in this PC's browser — no server, no account, no internet required |
| **Users** | One person: the owner |

---

## 1. Product goals and usage scenarios

### 1.1 What this is

A single personal app that keeps the owner's work and daily life in one place: what to do today and this month, notes to self, development projects and their progress, what money was spent, and how grocery-item prices change over time.

It runs only on this computer, in the browser. There is no login, no internet requirement, no phone version, and no other users. All data is saved automatically the moment anything changes, so refreshing, closing the browser, or restarting the PC loses nothing.

### 1.2 Goals

1. **One place, one glance** — opening the app immediately answers: *What's on today? What am I working on? How much have I spent this month? Are prices going up?*
2. **Entering data must be fast** — logging a purchase takes seconds; the app remembers what it knows (icons, categories, units, stores) so the owner types less over time.
3. **Modules must be genuinely different** — each section is built for its own job (a calendar, a progress tracker, an expense log, a price-history view), not five copies of the same task list.
4. **Data must not be lost** — automatic saving on every change, plus a one-click backup file the owner controls.
5. **Zero setup** — no accounts, no cloud, no configuration. Start it, use it.

### 1.3 Usage scenarios

- **Morning** — Open Home, look at Today's Plan, tick off what's done, add anything new.
- **Planning the week** — Open To-do's Month view, drop tasks onto upcoming days; check the Day view for details.
- **During the day** — Jot a quick note on Home so it isn't forgotten.
- **At the store** — Log a purchase in Spending in a few seconds: pick the item (icon and category auto-fill from last time), type amount + unit + total price, pick the store.
- **After shopping / monthly review** — Open Grocery Tracker to see how the price per litre / per kg / per piece of each item has moved, and spot what's getting more expensive.
- **Working on projects** — Open Projects, update progress sliders and statuses; Home shows the same bars at a glance.
- **Now and then** — Download a backup file from the sidebar so years of price history are never one browser-clearing away.

### 1.4 Non-goals for V1

Mobile app, cloud sync, accounts/login, sharing with anyone else, notifications/reminders.

---

## 2. Overall page framework and navigation structure

### 2.1 App shell

Five sections, always reachable from a **left sidebar**. If the browser window becomes narrow, the sidebar automatically becomes a bottom bar (phone-style). The sidebar footer holds the backup button and a small "Saved on this PC" note.

```
┌──────────────────┬────────────────────────────────────────────────────┐
│  DlaiLog         │  Spending        [filters…]         [+ Add purchase]│
│                  ├────────────────────────────────────────────────────┤
│  🏠  Home        │                                                    │
│  ✅  To-do       │            (the current screen)                    │
│  📊  Projects    │                                                    │
│  💰  Spending    │                                                    │
│  🛒  Grocery     │                                                    │
│                  │                                                    │
│  ─────────────   │                                                    │
│  💾 Backup/Restore│                                                   │
│  Saved on this PC│                                                    │
└──────────────────┴────────────────────────────────────────────────────┘
```

### 2.2 Navigation rules

1. The five sections are: **Home · To-do · Projects · Spending · Grocery Tracker**.
2. Every screen follows the same layout pattern: page title top-left, the screen's **"+ Add"** button top-right, filters/controls in between.
3. All cross-references navigate, never duplicate: clicking a Home summary card opens that module; clicking a day in To-do's Month view opens that Day; clicking "edit in Spending" in the Grocery Tracker opens that entry in Spending.
4. The Grocery Tracker deliberately has **no add button** — it is fed by Spending (see §6).

### 2.3 Global interaction rules (apply to every screen)

| Rule | Detail |
|---|---|
| Adding | "+ Add" button top-right → centered pop-up form |
| Editing | Click the row/card → the same pop-up, pre-filled |
| Deleting | Hover shows ✎ ✕ icons → confirmation dialog. Exception: Quick Notes delete instantly with a short Undo. |
| Saving | Instant, on every change. There is no Save button at app level. |
| Keyboard | Enter submits a form, Esc closes it. Save is disabled until required fields are filled, with a short hint. |
| Formatting | Dates read like "Tue, Sep 30"; money shows 2 decimals with thousands separators. |
| Empty states | Every list has a friendly message when empty (e.g. "Nothing planned today — enjoy it 🌤"). |
| Theme | Light/dark follows the Windows system setting automatically. |
| Category colors | Condiment = amber, Grocery = green, Miscellaneous = blue — used consistently everywhere. |

---

## 3. Home page content structure

Home is a **dashboard**: it displays live summaries of the other modules and allows two quick actions (add a task, add a note). It stores nothing of its own except notes.

```
┌─ Home ──────────────────────────────────────────────[+ New task]─────┐
│ ┌─ Today's Plan · Tue, Sep 30 ──┐ ┌─ Quick Notes ───────────────────┐ │
│ │ ⚠ Overdue (2)                 │ │ ┌────────────────────────────┐  │ │
│ │ ☐ 09:00  Standup meeting      │ │ │ Call plumber about sink  ✕ │  │ │
│ │ ☐ 14:00  Call supplier        │ │ └────────────────────────────┘  │ │
│ │ ☐        Buy paint            │ │ [ Write a note…            ]    │ │
│ │ [ + Add a task…             ] │ │                                 │ │
│ │ M T W T F S S  ← week strip   │ │                                 │ │
│ └───────────────────────────────┘ └─────────────────────────────────┘ │
│ ┌─ Spending · Sep ──────────────┐ ┌─ Projects ──────────────────────┐ │
│ │ $412.80   ▲ 8% vs Aug         │ │ Website  ▓▓▓▓▓▓▓░░ 72%  Active  │ │
│ │ Top: Grocery $210 · 34 entries│ │ App      ▓▓░░░░░░░░ 25%  Plan   │ │
│ └───────────────────────────────┘ └─────────────────────────────────┘ │
│ ┌─ Grocery Watch — biggest price moves this month ───────────────────┐ │
│ │ 🫒 Olive oil   $12.90/L   ▲ +12% since Aug       → view tracker    │ │
│ └────────────────────────────────────────────────────────────────────┘ │
```

| Card | Shows | Comes from |
|---|---|---|
| **Today's Plan** | Overdue items (red, at top), today's tasks as working checkboxes — timed ones in order, untimed after — an inline "+ Add a task…" box, and a 7-day week strip (dots = tasks) that jumps to that day in To-do | To-do module, filtered to today |
| **Quick Notes** | Newest-first sticky notes; type + Enter to add; ✕ deletes with Undo | Notes (own record type) |
| **Spending summary** | This month's total, % change vs last month, top category, entry count → opens Spending | Spending |
| **Projects summary** | Up to 3 active projects: name, progress bar, %, status → opens Projects | Projects |
| **Grocery Watch** | The 2–3 items with the biggest unit-price change this month (▲/▼) → opens Grocery Tracker | Grocery Tracker |

---

## 4. Purpose of each module

| Module | The question it answers | Why it isn't just another list |
|---|---|---|
| **To-do** | *What do I need to do on each day this month?* | A calendar: Day and Month views, optional times, a Done section; tasks belong to dates |
| **Projects** | *How far along is each development project?* | Progress bars, status, target dates — measured in %, not checkboxes |
| **Spending** | *What did I buy, where, and for how much?* | An expense log with icons, amounts+units, stores, and filters; the raw record of every purchase |
| **Grocery Tracker** | *Is this item getting more expensive?* | A read-only, auto-built price-history view: one line per item, price per litre/kg/piece over time |
| **Home** | *What matters right now?* | A dashboard that pulls one live summary from every other module |

---

## 5. V1 data and operations per module

### 5.1 Task (To-do)

| Field | Required | Notes |
|---|---|---|
| Title | Yes | e.g. "Call supplier" |
| Date | Yes | Defaults to the day currently being viewed |
| Time | No | Behind a "Set time" toggle; e.g. 14:00 |
| Note | No | Free text |
| Done | — | Off by default; toggled by the checkbox |

**Operations:** add (from To-do *or* Home), edit, complete/uncomplete, delete (with confirmation).
**Views:** Day and Month toggle.

- **Day view:** TIMED section (sorted by time, time shown), ANYTIME section, then a collapsible "Done" section.
- **Month view:** 7-column grid; each day shows up to 3 task chips + "+N more"; today highlighted; clicking a day opens its Day view.
- Navigation: ◀ ▶ moves by day (Day view) or month (Month view); a Today button returns to today. A week strip at the top of Day view jumps between days.
- Overdue unfinished tasks from earlier days are surfaced at the top of today's plan.
- Completing a task never changes project progress (progress is manual — see 5.3).

### 5.2 Note (Quick Notes, Home only)

| Field | Required | Notes |
|---|---|---|
| Text | Yes | One note = one short piece of text |

**Operations:** add (type + Enter), delete (instant, with ~5s Undo). Newest first. No editing — delete and retype.

### 5.3 Project

| Field | Required | Notes |
|---|---|---|
| Name | Yes | e.g. "DlaiLog website" |
| Description | No | One-line summary |
| Status | Yes | Not started / In progress / Done (default: Not started) |
| Progress | Yes | Slider 0–100% (snaps to 5%), set by hand; shown as bar + % |
| Target date | No | Shows "3 days left", or red "Overdue" when past |
| Notes | No | Longer free-text area for project thoughts |

**Operations:** add, edit, delete (with confirmation), set progress, change status. Cards sorted: active first by target date, Done dimmed at the bottom. Filter chips: All / Active / Done.

### 5.4 Purchase (Spending)

| Field | Required | Notes |
|---|---|---|
| Date | Yes | Defaults to today |
| Item name | Yes | Text with autocomplete from past items |
| Icon | Yes | Emoji from a built-in searchable picker (recently used first) |
| Category | Yes | Condiment / Grocery / Miscellaneous — three big buttons |
| Amount + unit | Yes | Number + unit dropdown (ml, L, g, kg, pcs, pack) |
| Total price | Yes | e.g. 9.00 |
| Store | Yes | Text with autocomplete from past stores |

**Operations:** add, edit, delete (with confirmation).
**Smart entry (memory):** picking an autocomplete suggestion auto-fills that item's last icon, category, unit, and store.
**Live preview:** while typing amount + total, the form shows "= $6.45 per L" so the recorded unit price is visible before saving.
**List:** grouped by day, newest first, with per-day totals; each row shows icon + name, category, store, amount+unit, unit price (small), and total price (bold). Filters: month selector, category chips, store dropdown, search by name. Summary strip: month total, entry count, top store.

### 5.5 Grocery Tracker (derived — stores nothing itself)

Built live from Purchases: entries are grouped into items by **item name** (case-insensitive). Category tabs: Condiment / Grocery / Miscellaneous, each with a count, plus a search box.

**Item row:** emoji + name · latest unit price (large) · change vs the previous purchase (▲ red = more expensive / ▼ green = cheaper / — same) · last bought date + store · mini price line.
**Expanded item:** full price-history chart (one dot per purchase, x = date, y = unit price), stats (lowest · highest · average unit price · total spent on this item), and the purchase history table — each row links "edit in Spending ↗".

**Derived values:** unit price = total price ÷ amount; price change = latest unit price vs previous purchase's unit price.

**Rules:**
- The item name is the identity. Fixing a typo in an entry moves that entry into the corrected item's history.
- Editing or deleting a purchase in Spending updates the tracker instantly.
- Items with only one purchase show a single dot and "—" for change.

---

## 6. Relationships: Home ↔ Today's Plan ↔ modules

```
Task (To-do) ──filter: today──▶ Today's Plan ──live copy, same checkboxes──▶ Home
Purchase (Spending) ──derived, grouped by item──▶ Grocery Tracker ──biggest moves──▶ Home
Project ──progress %──▶ Home summary card
Note ──▶ Home only (the only data Home owns)
```

1. **Today's Plan is not a second to-do list.** It is the To-do module filtered to today, shown on Home. Ticking a box on Home immediately marks it done in To-do's Day view, and vice versa — same data, two views.
2. **Home never duplicates data.** Every summary card is computed live from its module; changing anything in a module is reflected on Home immediately (no refresh).
3. **Grocery Tracker is fed by Spending.** Purchases are entered once, in Spending; the tracker is a read-only analysis of them. To change price data, edit the purchase — never the tracker.
4. **Home is the entry point, modules are the workspaces.** Home's cards and rows navigate to the relevant module for any real editing.
5. **Deleting flows down.** Delete a task/purchase/project and every Home summary and tracker chart that used it updates instantly.

---

## 7. Local data, backup, and restore

### 7.1 Where data lives

- All data (tasks, notes, projects, purchases) is stored in **this PC's browser storage**, in a single local store, saved automatically on every change.
- It survives: refreshing the page, closing the tab/browser, restarting Windows.
- No server, no account, no internet connection is ever required.
- **Known risk:** clearing the browser's site data ("cookies and site data") for the app's address erases everything. This is exactly what backup exists for.

### 7.2 Backup / Restore

Lives in the sidebar footer ("💾 Backup/Restore") and opens a small pop-up with two buttons:

| Action | Behavior |
|---|---|
| **Download backup file** | Downloads one file containing all data, named e.g. `dlailog-backup-2026-09-30.json` |
| **Restore from file** | Pick a backup file → warning "This replaces all current data" → confirm → replaces everything with the file's contents |

- Restoring an invalid/corrupt file shows a clear error and **changes nothing**.
- Recommended habit: download a backup after heavy logging and once a month. (Automatic backups are out of scope for V1.)

---

## 8. Must-have features for V1

### 8.1 Shell & global

- [ ] Five-section sidebar navigation; becomes a bottom bar on narrow windows
- [ ] Backup/Restore in the sidebar footer; "Saved on this PC" note
- [ ] Consistent screen pattern: title · filters · "+ Add" button
- [ ] Pop-up forms for add/edit; confirmation dialog on delete (Undo for notes)
- [ ] Instant auto-save on every change; no Save button
- [ ] Light/dark follows the system; consistent category colors (amber/green/blue)
- [ ] Friendly empty states on every list

### 8.2 Home

- [ ] Today's Plan: working checkboxes, timestamps for timed tasks, overdue in red
- [ ] Inline quick-add task box; week strip that jumps into To-do
- [ ] Quick Notes: add, delete with Undo
- [ ] Spending summary card (month total, vs last month, top category)
- [ ] Projects summary card (up to 3 bars); Grocery Watch card (biggest price moves)
- [ ] All cards navigate to their module; nothing on Home needs a refresh to update

### 8.3 To-do

- [ ] Day view: TIMED / ANYTIME / collapsible Done; week strip; ◀ ▶ + Today navigation
- [ ] Month view: day grid, ≤3 chips per day + "+N more", click a day to open it
- [ ] Add/edit pop-up with title, date, optional time toggle, note
- [ ] Checkbox completes/uncompletes; delete with confirmation

### 8.4 Projects

- [ ] Card grid with progress bar + %, status pill, target date ("N days left"/"Overdue")
- [ ] Add/edit pop-up: name, description, status, manual progress slider (snaps 5%), target date, notes
- [ ] Sort active-first, Done dimmed; filter All / Active / Done; delete with confirmation

### 8.5 Spending

- [ ] Add/edit pop-up with all seven fields (date, name, emoji icon, category, amount+unit, total, store)
- [ ] Searchable emoji picker with recently-used first
- [ ] Item-name and store autocomplete; picking an item auto-fills icon/category/unit/store
- [ ] Live "= $x per unit" preview while typing
- [ ] Day-grouped list with day totals, unit price and total price per row
- [ ] Filters: month, category, store, name search; summary strip (total, count, top store)
- [ ] Edit/delete update everything downstream instantly

### 8.6 Grocery Tracker

- [ ] Category tabs with counts + search; item rows with unit price, ▲/▼ change, last date/store, mini chart
- [ ] Expanded item: price-history chart, low/high/average/total spent, purchase history with "edit in Spending ↗"
- [ ] Fully automatic: new purchases appear immediately; no add button
- [ ] Handles single-purchase items gracefully ("—")

### 8.7 Data safety

- [ ] Everything persists across refresh, browser close, and PC restart
- [ ] Download backup file; restore with confirmation; invalid file rejected safely

---

## 9. Out of scope for V1

**Platform:** phone/tablet app · cloud sync or any server · accounts/login · multi-user · internet features
**To-do:** drag-and-drop tasks between days · Week view · recurring/repeating tasks · reminders or notifications · sharing a calendar
**Projects:** automatic progress from sub-tasks/milestones · file attachments · time tracking
**Spending:** income · budgets · receipts/photos · multi-currency · CSV/Excel export · barcode scanning · general-category expenses beyond store purchases (e.g. rent, transport, dining out) — the data model allows adding categories later
**Grocery Tracker:** per-store price comparison charts · price-drop alerts · unit auto-conversion between L/ml and kg/g
**Other:** search across all modules · settings screen (currency symbol is fixed to `$` for now) · automatic scheduled backups

---

## 10. Acceptance criteria

Verifiable by hand: run the app, follow each step, observe the result. All boxes must pass for V1 to be considered done.

### 10.1 Shell & persistence

- [x] The app opens in the browser (at the local address Expo prints, default `http://localhost:8081`) and shows Home with all five sections in the sidebar
- [x] Narrowing the window below ~1000px turns the sidebar into a bottom bar
- [x] Add a task, refresh the browser → the task is still there
- [x] Close the browser completely, reopen the app → everything is still there
- [x] Restart the PC → everything is still there
- [x] Change Windows light/dark setting → the app follows it

### 10.2 Home

- [x] A task dated today, added in To-do, appears in Home's Today's Plan without any refresh
- [x] Ticking that task on Home marks it done in To-do's Day view (and unticking restores it)
- [x] An unfinished task dated yesterday appears under "Overdue" in red
- [x] Typing a note + Enter adds it to Quick Notes; ✕ removes it and Undo brings it back
- [x] After logging purchases this month, the Spending card shows the correct total and entry count
- [x] Progress changed in Projects is reflected on Home's Projects card immediately
- [x] The Grocery Watch card lists the correct biggest-change item; clicking cards opens their modules

### 10.3 To-do

- [x] Adding a task with time 14:00 places it in TIMED ordered by time; a task without a time lands in ANYTIME
- [x] Ticking a task moves it into the collapsible "Done" section; unticking brings it back
- [x] Deleting a task asks for confirmation first
- [x] ◀ ▶ moves one day in Day view and one month in Month view; Today returns to today
- [x] Month view: a day with 5 tasks shows 3 chips + "+2 more"; clicking the day opens its Day view
- [x] The week strip highlights today and clicking a day navigates to it

### 10.4 Projects

- [x] Creating a project with name + status + progress shows a card with the correct bar and %
- [x] Moving the progress slider updates the bar and % live, in the pop-up and on the card
- [x] A past target date shows red "Overdue"; a near one shows "N days left"
- [x] Filter chips narrow the grid; Done projects appear dimmed at the bottom
- [x] Deleting a project asks for confirmation and removes its Home summary entry

### 10.5 Spending

- [x] Typing item "Soy sauce", amount `1`, unit L, total `6.45` shows live preview "= $6.45 per L" before saving
- [x] After saving, the row shows: 🍜 Soy sauce · Condiment · store · 1 L · $6.45/L · $6.45
- [x] Typing "soy" in a new entry suggests "Soy sauce" and auto-fills its icon, category, unit, and store
- [x] The emoji picker searches (typing "oil") and shows recently used emojis first
- [x] Entries are grouped by day with correct day totals; the month filter, category chips, store filter, and name search each narrow the list and update the summary strip
- [x] Editing a purchase's price changes its row, the month total, and the Grocery Tracker immediately
- [x] Deleting a purchase asks for confirmation and removes it everywhere
- [x] Required fields block saving with a visible hint; e.g. amount `0` or empty name cannot be saved

### 10.6 Grocery Tracker

- [x] Logging a new purchase in Spending makes its item appear in the tracker immediately, in the correct category tab
- [x] Each purchase of an item adds one dot on its chart, in date order, at the correct unit price
- [x] ▲/▼ correctly compares the latest unit price with the previous purchase (red for up, green for down); an item with one purchase shows "—"
- [x] Expanding an item shows correct low/high/average unit price and total spent
- [x] Renaming an entry's item name moves it to the corrected item's history
- [x] Deleting a purchase removes its dot and updates the stats
- [x] The tracker has no add button; searching filters items by name

### 10.7 Backup & restore

- [x] Backup downloads a file named like `dlailog-backup-YYYY-MM-DD.json`
- [x] After clearing the app's browser data (or on an empty browser), restoring the file brings back tasks, notes, projects, purchases, and tracker history exactly
- [x] Restoring shows the "replaces all current data" warning first
- [x] Restoring a random/invalid file shows an error and leaves existing data untouched

### 10.8 Formatting & polish

- [x] All dates display like "Tue, Sep 30"; all money like "$1,234.50"
- [x] Condiment/Grocery/Miscellaneous always appear amber/green/blue, in Spending, the tracker tabs, and charts
- [x] Every empty list shows its friendly empty-state message
- [x] Esc closes an open pop-up; Enter submits a filled form

---


### How these were verified

Every box above is covered by automated tests, run in two layers:

```bash
npm run verify      # type check + lint + 206 unit/component tests (Jest)
npm run test:e2e    # builds the web app and drives it in a real browser (Playwright)
```

- **Unit & component tests** (`src/**/*.test.ts(x)`, screen tests in `src/__tests__/app/`) cover the logic, every screen and the cross-module flows, through the same data layer the app uses.
- **Browser tests** (`e2e/app.spec.ts`) cover the things only a real browser can prove: the app loading, navigation, data surviving a refresh, the sidebar becoming a bottom bar, Escape closing pop-ups, and a real backup download.

## 11. Confirmed decisions & assumptions

**Decisions confirmed with the owner:**

1. Quantity in Spending is recorded as **amount + unit** (e.g. 2 L), so the tracker compares price per litre/kg/piece fairly across pack sizes.
2. Tasks have **optional** times (date required, time behind a toggle).
3. Project progress is **set by hand** with a slider (no auto-progress from sub-tasks in V1).
4. Navigation is a **left sidebar** that becomes a bottom bar on narrow windows.
5. Add/edit happen in **pop-ups**, not separate pages.
6. Delete always **asks for confirmation**, except Quick Notes (instant, with Undo).
7. Month view shows **max 3 chips** per day + "+N more".
8. Currency symbol is **`$`** for V1 (one-line change later).
9. Spending covers **store purchases only** (things bought), not rent/bills/dining — more categories can be added later without rework.
10. **Backup/Restore button is part of V1.**

**Assumptions (safe to change later):** UI language is English · single user · emoji are the item icons (no image files) · charts are drawn with the lightest technique that renders in the browser (no heavy chart library).

---

## 12. Technical constraints for implementation

- Stack: Expo SDK 57 / Expo Router (file-based routes under `src/app/`), React Native for Web — existing project at `DlaiLog/`.
- Runs via `npm run web` in the browser; no build/deploy step for V1.
- Persistence: browser local storage through AsyncStorage (survives refresh/close/restart). One storage layer used by all modules; the backup file is simply this data serialized to JSON.
- Five existing template screens/components get repurposed (the "Explore" placeholder is removed).
- Data model (plain): **Task**, **Note**, **Project**, **Purchase** — the Grocery Tracker derives everything from Purchases; Home derives everything from the other four.
