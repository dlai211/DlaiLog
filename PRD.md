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

**Assumptions (safe to change later):** UI language is English · single user · charts are drawn with the lightest technique that renders in the browser (no heavy chart library). *(Superseded in Version 2: item icons are drawn ingredient tiles rather than emoji — see §13.)*

---

## 12. Technical constraints for implementation

- Stack: Expo SDK 57 / Expo Router (file-based routes under `src/app/`), React Native for Web — existing project at `DlaiLog/`.
- Runs via `npm run web` in the browser; no build/deploy step for V1.
- Persistence: browser local storage through AsyncStorage (survives refresh/close/restart). One storage layer used by all modules; the backup file is simply this data serialized to JSON.
- Five existing template screens/components get repurposed (the "Explore" placeholder is removed).
- Data model (plain): **Task**, **Note**, **Project**, **Purchase** — the Grocery Tracker derives everything from Purchases; Home derives everything from the other four.

---

# Version 2 — design refresh, Meals, Inventory & Shopping

Added 2026-10-01. Everything below is built, committed and verified the same way as V1:
`npm run verify` (type check + lint + 264 unit/component tests) and `npm run test:e2e`
(10 real-browser tests, run against the built app).

## 13. Design system

- **Light palette** — cream `#FBF3D5` background, clean white cards, pale sage `#D6DAC8`
  surfaces, muted sage `#9CAFAA` lines and accents, terracotta rose `#D6A99D`, dark warm text.
- **Dark palette** — deep green-charcoal surfaces with the same accents lifted for contrast.
  The app follows the system setting in both.
- **Borders** — dashed for surfaces that hold things (cards, chips, panels, pop-ups), solid
  for things you type in or press (inputs, filled buttons, the focused field).
- **Icons** — the emoji in the navigation, empty states and row actions are replaced by a
  monochrome SVG line-icon set (`src/components/ui/icon.tsx`); icons take the theme's colour.
- **Pictures instead of emoji** — the emoji picker is gone. Purchases and pantry rows show a
  drawn ingredient tile (`src/data/ingredient-images.tsx`, 50 ingredients). Version-1 rows
  still show their old emoji, and editing one guesses the matching tile from its name.
- **Motion** — screens fade and lift in on navigation; buttons, cards, chips, nav items and
  row actions lift, tint or scale on hover.

Acceptance (all ticked, verified by tests and the browser suite):
- [x] Light and dark palettes; the app follows the system setting
- [x] Dashed/solid border rule applied consistently; no emoji left in the UI chrome
- [x] No emoji picker; ingredient pictures searchable by name and keyword
- [x] Page transitions and hover feedback on every interactive element

## 14. Meals

- A dish has a **name**, an **uploaded finished-dish picture** (shrunk to 800px JPEG before
  it is stored, because it lives in the same browser storage as everything else), an
  **ingredients** list (name, amount, unit — with autocomplete from the pantry and purchase
  history) and **steps to cook**.
- Each ingredient is labelled against the pantry: **in stock (n)** or **missing**, and
  "missing · on the shopping list" once it has been queued.
- **Add missing to shopping list** queues everything the dish needs in one press.

## 15. Inventory

- The pantry is **fed by Spending automatically**: logging a purchase creates the item or
  adds to its stock; editing a purchase moves the difference; deleting one takes its amount
  back out (never below zero). When units don't line up, a purchase re-bases the count in
  its own unit rather than guessing a conversion.
- Stock is **adjustable in place** with − / + buttons that step sensibly per unit
  (1 for pieces, 0.5 for litres and kilos, 50 for grams and millilitres).
- Rows show an **Out of stock** label, the **last bought** date, price and store from Spending,
  and a cart button that queues the item.
- Items can also be added, edited and removed by hand; a hand-typed name that loosely matches
  an existing item adds to that row instead of creating a duplicate.

## 16. Shopping list

- Lives beside the pantry (Inventory → **Shopping list**).
- Suggestions come from two places: pantry items that **ran out**, and ingredients a **meal**
  needs — each labelled with where it came from.
- An item reaches the cart by **dragging its grab handle** onto the cart or pressing its
  cart button. The cart highlights while something is dragged over it.
- Items are ticked off as bought, kept until **Clear bought**, removable individually, and
  the same item is never queued twice while it is still open.

## 17. Saved-name memory (items and stores)

- While typing an item or store name, saved names are offered — prefix matches first, then
  near-misses that ignore case, spacing and punctuation ("soy-sauce" finds "Soy sauce").
- A near-miss spelling shows a "You already track …" notice with a one-tap **Use it**.
- Pantry stock, meal ingredients and purchase history all resolve to the same item, so the
  same thing can no longer exist twice under slightly different names.

## 18. Fixes made alongside

- [x] Nested `<button>` markup (tappable cards and calendar cells containing real buttons)
      — invalid HTML that broke hydration; containers are now plain regions and the buttons
      inside carry the actions
- [x] `shadow*` style props replaced with `boxShadow` (the deprecation warning is gone)
- [x] Hydration mismatch (React #418): the pre-rendered page used the narrow shell and the
      browser the wide one; the shell now renders only after the saved data has loaded
- [x] Tall pop-ups can scroll again, so their Save buttons are always reachable
- [x] A new browser test fails on **any** console error or warning, so this class of bug
      cannot come back unnoticed

## 19. Data, migration and backup

- Records added: **Ingredient** (pantry), **Meal**, **ShoppingItem**; the database is now
  **version 2**.
- A version-1 database is migrated forward on load — nothing is lost, the new lists start empty.
- Version-1 **backup files still restore**, and are migrated on the way in.
- The backup panel now reports how much of the browser's storage the data is using.

---

# Version 3 — recurring work, your own pictures, and a livelier app

## 20. Appearance: System / Light / Dark

- [x] A three-way switch — **System** (the default: follow the computer), **Light**, **Dark**
- [x] It sits at the foot of the sidebar, and in the Backup & Restore dialog on narrow windows
- [x] The choice is remembered in the browser, next to the data, and survives a refresh
- [x] Dark mode is a full second palette, not an inversion: deep green-charcoal surfaces with
      the same accents lifted just enough to read

## 21. Repeating tasks

- [x] A task can **repeat weekly** on any set of days — the worked example, every Tuesday and
      Thursday, 12:00–14:00, until a chosen date, is exactly what the form builds
- [x] The form spells the pattern back in words before saving ("Every Tue & Thu · 12:00 – 2:00 pm
      · until Dec 18") and refuses a pattern with no days on it
- [x] Every occurrence shows in the Day view and as a chip in the Month view, and the week strip's
      dots count occurrences rather than records
- [x] Each day is ticked off on its own: finishing Tuesday's class leaves Thursday's waiting
- [x] A repeating task never appears in **Overdue** — a missed Tuesday is not a debt; the pattern
      simply comes round again
- [x] Deleting one warns that every occurrence goes with it
- [x] Optional end time as well as a start time (a real time *range*, shown as "12:00 – 2:00 pm")

## 22. Your own ingredient pictures

- [x] 33 photographs the user supplied, prepared by `node scripts/prepare-ingredient-images.mjs`
      (squared, fitted on white, 256×256 — 11 MB of originals become 325 KB in `assets/ingredients/`)
- [x] They are bundled with the app: no internet, nothing downloaded at runtime
- [x] The library grew to 68 tiles, adding the Chinese-market ingredients the photographs cover
      (bok choy, choy sum, ong choy, chinese chives, bitter melon, bao, dumplings, pork belly,
      pork ribs, steak, minced beef, chicken thigh, hot sauce, oyster sauce, green onions…)
- [x] Pictures follow the same key as the pantry and purchases, so a photo added once appears
      everywhere that item does
- [x] Tiles without a photograph keep their drawn picture; a tile with neither gets a neutral one
- [x] New test: no photograph can exist without a tile to belong to

## 23. Sizing and responsiveness

> **Superseded (see §28).** An earlier version of this section scaled type, icons and spacing with
> the window (CSS `clamp()` values). That is what crashed the Android app, and it left the content
> clustered on the left of a wide display. Sizes are fixed numbers again, and responsiveness is a
> matter of layout — a fixed sidebar, a centred column with a maximum width, and rows that wrap.

- [x] Every size — spacing, type, icons, pictures, radii — is a **plain number**. React Native
      rejects CSS strings for dimensions (`'1.2vw'` crashes Android with "String cannot be cast to
      Double"), so none are used anywhere; a test scans the whole source tree to keep it that way
      (`src/constants/react-native-compat.test.ts`).
- [x] The sidebar is a **fixed 248px** (rail: 84px), so the navigation labels are always legible.
- [x] The content column **fills the window**, stops growing at **1400px** and is centred beyond
      that, so a wide display gets a centred column rather than a cluster on the left.
- [x] Summary tiles and widget rows **wrap** with flexbox and grow to fill the space they are
      given, so nothing is squashed on the right.
- [x] Below 1000px the shell switches to the phone-style bottom bar (PRD §2.1).

## 24. The sidebar

- [x] Order, top to bottom: **Home, To-do, Projects, Meals, Inventory, Spending, Grocery**
- [x] A button at its top-right compacts it to a rail that keeps only the logo and the icons
- [x] Hovering the rail opens it for as long as the pointer is on it, so the labels are always
      one hover away; clicking the button again pins it open
- [x] The choice is remembered across reloads

## 25. Example data

- [x] A brand-new install opens with a working example: three weeks of shopping with prices that
      moved, a pantry with three things run out, three dishes with their ingredients and steps,
      four projects, a week of tasks including the repeating class, and notes
- [x] It is written **only** into a completely empty store, so it can never overwrite real data
- [x] Backup & Restore also offers **Load example data** and **Erase everything**; erasing is
      remembered, so the example data does not come back on reload
- [x] Tests set `EXPO_PUBLIC_DLAILOG_NO_SEED=1` (and the browser tests set `dlailog:no-seed`),
      so every test still controls its own data

## 26. More colour, more design

- [x] A wider accent palette (`Accents`) in the same earthy family: sage, mint, rose, bloom,
      clay, sand, olive, sky, plum — each with a dark-mode version
- [x] One accent per screen: the title pill and rule at the top of every page wears it
- [x] Home gained an at-a-glance row — four tiles, one number per module, each in that module's
      colour, each a shortcut to its screen
- [x] Projects: progress bars and status chips coloured by state (mint finished, clay moving,
      sky not started)
- [x] Inventory: a stock-level bar under each item, in the item's category colour, empty when
      the item has run out
- [x] Spending: a "Where it went" bar splitting the month across the three categories
- [x] Meals: in-stock / missing chips now wear the palette's mint and rose
- [x] The last emoji in the interface (the date picker's calendar glyph) is gone

## 27. Data, migration and backup (Version 3)

- The database is now **version 3**. Version 2 databases migrate forward on load; the new task
  fields are optional, so nothing is rewritten.
- **Version 2 backup files still restore** (the header check accepts 1, 2 and the current
  version), and are migrated on the way in.
- New stored fields: `Task.repeat`, `Task.doneDates`, `Task.endTime`, `MealIngredient.imageKey`,
  and the appearance/sidebar/seed preferences (`dlailog:theme`, `dlailog:sidebar`,
  `dlailog:no-seed`).

## 28. Dashboard layout, spacing and React Native compatibility (fix)

The Android crash (`fontSize` … `java.lang.String cannot be cast to java.lang.Double`) came from
this app, and so did the layout it was wrapped in. Both are fixed:

- [x] **No CSS units anywhere.** Every `fontSize`, `lineHeight`, `borderRadius`, `padding`,
      `margin` and dimension is a raw number. The window-scaling helpers (`clamp()` values,
      `useUiScale`) are deleted, along with their tests — the feature is gone, not hidden.
- [x] **A guard test** walks every source file and fails if a CSS unit or function (`px`, `vw`,
      `vh`, `rem`, `clamp(`, `calc(`) appears inside a style — proven to fail by planting one.
      `boxShadow` is the single, documented exception (a shadow definition, not a dimension).
- [x] **Sidebar:** a stable 248px (compact rail: 84px) — navigation stays clean and legible at any
      window size.
- [x] **Dashboard container:** `flex: 1`, `width: '100%'`, `maxWidth: 1400`, `alignSelf: 'center'`,
      so it expands to fill the right-hand side and centres on very wide displays.
- [x] **Columns wrap** (flexbox `wrap` + `flexGrow`) and the four metric tiles share the row evenly.
- [x] **Vertical breathing room:** 32px above and below the page inside the scroll area, 32px
      between the header, the metric tiles and the widget bands, 24px between widget rows, and
      cards at 18px internal padding — content no longer sits against a card's edge.
- [x] The header bar has its own top and bottom padding, and cards keep their natural height
      instead of stretching to fill an empty row.
- [x] Verified in a browser at 2400, 1600 and 1100 wide: sidebar 248px at all three; the content
      column measured 1400 / 1304 / 804; no CSS-function value left in the DOM; no console
      warnings.

## 29. Logging a whole shopping trip at once

Entering a receipt one purchase at a time is slow, so Spending has a batch form beside the
single-item one: **+ Log shopping trip**.

- [x] **Header:** the store (with the saved-name autocomplete) and the date, once for the trip
- [x] **A row per item:** picture, item name (autofill from the pantry, purchases and pictures),
      category, quantity, unit (pcs, pack, bag, lb, oz, g, kg, ml, L), **Paid**, optional
      **Saved**, and a ✕ to drop the row
- [x] Typing a name picks the picture, the category and the unit; choosing a saved item also
      fills in what it last cost
- [x] **+ Add another item** appends a row; the form opens with three
- [x] **Live summary:** Items gross (`paid + saved`), Total savings (green, shown as a
      deduction), and Final paid
- [x] **Save trip (N items)** writes everything in **one batch transaction** — Spending, the
      Grocery Tracker's price history and the pantry's stock all update together, and two rows of
      the same item add up instead of overwriting
- [x] `Purchase.savings` (optional) is stored beside the price: `totalPrice` is always the money
      actually paid, savings is what the discounts took off. The purchase row shows a
      "saved $x.xx" chip, and the month summary adds the savings up
- [x] Nothing is refused silently: the store, at least one named item, and a price above zero for
      every named row are all required before the trip saves

## 30. The Albertsons receipt, and the pictures that came with it

**The trip.** A real 14-item shopping trip is now part of the app's data
(`src/store/sample-data.ts` → `ALBERTSONS_TRIP_ITEMS`), item for item:

- [x] Store **Albertsons**, receipt date **2026-10-03**, 14 lines with the exact names,
      quantities, units, prices and savings
- [x] It is in the **example dataset**, so a fresh install (and "Load example data") has it —
      dated to the day the example was built, so it always counts as recent
- [x] **One-time import:** Backup & Restore → **"Add the Albertsons trip (14 items)"** appends
      the receipt to the data you already have, dated to the receipt itself. It is
      **idempotent** — recognised by store + day + item name, so pressing it twice adds nothing —
      and it feeds the pantry exactly like the batch form does
- [x] The receipt totals: **$79.72 paid**, **$5.90 saved** across four discounted lines
      ($0.30 oil, $4.59 chicken, $0.41 tomatoes, $0.60 carrots)
- [x] Amounts are stored in the units the receipt uses, so unit prices come out right
      (steak $19.99/lb, chicken $1.29/lb, potatoes $0.50/lb)

**The pictures.** Four photographs the user added — coffee, ketchup, oil, butter — are prepared
and wired in (37 pictures, 364 KB):

- [x] `scripts/prepare-ingredient-images.mjs` needed no change to pick them up, and now also
      **reports any prepared picture that is not registered** in `ingredient-photos.ts`
- [x] New tiles: **Coffee**, **Ketchup**; the existing cooking-oil tile is now the **Oil** tile
      (with the photograph); the butter tile gained its picture
- [x] Tile lookups forgive the picture files' own spellings: `chicken_leg`, `chinese_cabbage`,
      `eggs`, `shanghai_bok_choy`, `cooking-oil` all resolve to the right tile
- [x] The name guesser now only counts a keyword as a phrase match when it covers a real share of
      the name — so "Signature Select Oil Vegetable" finds the oil bottle rather than the greens
      tile, while "Kikkoman soya sauce" still finds the soy sauce

## 31. Pantry levels, dragging with a mouse, and more units

**The stock bar now measures against a full pantry** (it used to compare the quantity with four
"steps", so anything above that looked full — 2 eggs left of 18 showed a full bar):

- [x] `Ingredient.capacity` records what a full bar means: set when an item is first stocked
      (a purchase, a hand-added item), raised when the item is topped up, and left alone when it
      is used, so the bar falls as the pantry empties and returns to full when the item is
      bought again
- [x] Rows saved before this existed fall back to the **last purchase's amount**, so an old
      "2 of 18 eggs" row reads as nearly empty straight away (11%), with no migration needed
- [x] 0 stays 0 (out of stock), a sliver stays visible while anything is left, and nothing ever
      exceeds a full bar

**Dragging a suggestion into the shopping cart works with a mouse** (before, the row could not
leave its box):

- [x] The handle and the dragged row are `userSelect: 'none'` — the browser was starting a *text
      selection* on the first mouse move, which cancelled the gesture and snapped the row back.
      This was the real cause; the same fix covers dragging on any desktop browser
- [x] The cart **lights up while the pointer is over it** (the drop target is checked on every
      move, not only on release)
- [x] The cart re-measures itself when a drag starts, so a page scrolled since it was laid out
      is still tested against its real position
- [x] The handle shows a grab cursor, and the row shows a grabbing one, so it reads as draggable
- [x] A new browser test drags right across the gap between the two cards, checks the cart lights
      up, checks the drop lands, and asserts the browser selected **no** text along the way

**More units** — `tbsp`, `tsp`, `clove`, `stalk` and a catch-all `qty` ("1 Qty" for anything with
no better unit) are available everywhere units are chosen: meals, purchases, the shopping trip
form and the pantry.

## 32. Moving the data into the cloud (Supabase)

Until now every record lived in one JSON blob in the browser's (or the phone's) own storage. That
works, but it means the phone and the laptop each keep a separate copy, and clearing the browser
data takes the lot. This moves the data to a hosted PostgreSQL database so one account sees the
same app everywhere.

The migration runs in four checkpoints, each one verified and committed before the next begins.
Phases 1 and 2 are done.

**Phase 1 — the client.** `src/lib/supabase.ts` holds the shared connection. It is created the
first time something asks for it, so importing the module connects to nothing, and it throws a
message naming `.env.example` when the project is not configured rather than failing somewhere
confusing later.

- [x] `@supabase/supabase-js` installed; the project URL and publishable key live in `.env`
- [x] `.env` added to `.gitignore` — it previously listed only `.env*.local`, so a file named
      exactly `.env` **would have been committed**. This was fixed before the file was created
- [x] The database password is deliberately kept out of `.env` and out of the app entirely: it
      sits in the git-ignored `.env.migration` and is read only by the schema-push script, because
      it is a server secret and must never reach a browser or a phone
- [x] Sign-in is switched off in all three places supabase-js looks for it (there is no login to
      persist, refresh or recover), and a 15-second request timeout stops an offline phone waiting
      on a socket forever
- [x] Jest is given a WebSocket through the `ws` dev dependency: the client builds its realtime
      half inside the constructor even though DlaiLog never subscribes to anything, and Node 20 has
      no global WebSocket the way the browser and the phone do

**Phase 2 — the schema.** Seven tables, one per list the app stores: `tasks`, `notes`, `projects`,
`purchases`, `inventory`, `meals`, `shopping`.

- [x] Every table has a `uuid` primary key defaulting to `gen_random_uuid()`, and `timestamptz`
      defaults for its timestamps
- [x] **No foreign keys, deliberately.** DlaiLog links its records by normalized name (`key`), not
      by id — a purchase feeds the pantry item of the same name, and a shopping line remembers the
      meal it came from by its label. Inventing relationships the app does not use would only
      create ways to fail. `inventory.key` is unique, which is a genuine invariant: a purchase
      matches a pantry row on it, so two rows for "Milk" would update only one
- [x] Enumerations (category, status, unit, source) are `text` with a `CHECK`, not PostgreSQL
      enum types. Both look identical to the app, but adding a unit stays a one-line change instead
      of an `ALTER TYPE`
- [x] Money is `numeric(12,2)` and quantities `numeric(12,3)` — never floating point, which would
      drift on a receipt total
- [x] A repeating task stays **one row**: `repeat_days` holds the weekdays it comes back on and
      each completion accumulates in `done_dates`
- [x] `meals.ingredients` is `jsonb`, because a meal's ingredient list belongs to the meal and is
      never queried on its own
- [x] Verified by reading and writing through the same REST API the app uses: dates and times come
      back byte-identical to the app's `YYYY-MM-DD` and `HH:MM` strings, `numeric` arrives as a
      JavaScript number rather than a string, `jsonb` arrives as an object, and an unknown unit is
      refused with a 400
- [x] `src/store/schema.test.ts` fails the build if the SQL's unit, category, status or source
      list ever drifts from the app's own, or if RLS is switched on by habit. Proven by planting
      `'furlong'` in the SQL and watching it fail

**Two things about the connection are unusual, and both are deliberate:**

- The direct connection string Supabase offers (`db.<ref>.supabase.co`) resolves to an **IPv6-only**
  address, and this machine has no IPv6 route at all — a connection simply fails with
  `EHOSTUNREACH`. The schema is applied through the IPv4 pooler instead
  (`aws-0-us-west-2.pooler.supabase.com`), whose region was found by connecting to each candidate
  in turn.
- That pooler presents a certificate chain rooted in **Supabase's own certificate authority**,
  which Node does not trust out of the box. The usual advice is to switch certificate checking off.
  That was not done: it would mean sending the database password over a connection we had told
  ourselves not to verify. Supabase's published root certificate is pinned instead
  (`scripts/supabase-ca.crt`, `Supabase Root 2021 CA`, valid to 2031), so the connection is fully
  verified *and* works.

**Row Level Security is not enabled, and that is not an oversight.** With no sign-in, Supabase has
no way to tell who is asking, so any RLS policy would have to allow everyone (pointless) or deny
everyone (the app breaks). The consequence to understand: the publishable key ships inside the
app, so anyone holding it can read and write every row. That is acceptable while the app only runs
on your own machine, and it stops being acceptable the moment the web build is hosted somewhere
public. "Let other people reach the app" and "no login" cannot both be true later; adding Supabase
Auth is what makes RLS meaningful.

**Phase 3 (next) — the data layer swap.** The app's storage layer is replaced: loading reads the
seven tables and assembles them into the same database object the UI already renders, and saving
diffs the change against what was last loaded so only the rows that actually changed are written.
Every screen and component is left exactly as it is — including all sizing staying plain numbers.
A local copy is kept so the app still opens with no network.

**Phase 4 — the keep-alive.** A daily GitHub Action reads a single row so the free-tier project,
which pauses after seven days of inactivity, never reaches that point.
