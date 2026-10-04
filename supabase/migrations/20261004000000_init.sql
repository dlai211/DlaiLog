-- DlaiLog — initial cloud schema (PRD §32).
--
-- Mirrors the TypeScript record types in `src/store/types.ts` one table per
-- list. Applied by `scripts/push-schema.mjs`; re-running it is safe.
--
-- Two deliberate choices, both explained in PRD §32:
--
--   * The seven lists have NO foreign keys between them. DlaiLog links its
--     records by normalized name (`key`) rather than by id — a purchase feeds
--     the pantry item of the same name, a shopping line remembers the meal it
--     came from by its label. That is how the app already works, and inventing
--     relationships the app does not use would only create ways to fail.
--
--   * Enumerations (category, status, unit, source) are `text` with a CHECK
--     rather than PostgreSQL enum types. Both look identical to the app, but a
--     CHECK is a one-line change when a new unit is added, whereas a real enum
--     needs ALTER TYPE. `src/store/schema.test.ts` fails if this list and the
--     app's own list of units ever drift apart.
--
-- Row Level Security is intentionally NOT enabled (Phase 2, by request).

-- ---------------------------------------------------------------- tasks ----
-- A repeating task is one row: `repeat_days` holds the weekdays it comes back
-- on (0 = Sunday), so its completions collect in `done_dates` over time.
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) > 0),
  "date"       date not null,
  "time"       text check ("time" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  end_time     text check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  note         text,
  done         boolean not null default false,
  repeat_days  smallint[] check (repeat_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  repeat_until date,
  done_dates   date[] not null default '{}',
  created_at   timestamptz not null default now()
);

create index if not exists tasks_date_idx on tasks ("date");
create index if not exists tasks_done_idx on tasks (done);

-- ---------------------------------------------------------------- notes ----
create table if not exists notes (
  id         uuid primary key default gen_random_uuid(),
  text       text not null check (length(trim(text)) > 0),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------- projects ----
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  description text,
  status      text not null default 'not-started'
              check (status in ('not-started', 'in-progress', 'done')),
  progress    smallint not null default 0 check (progress between 0 and 100),
  target_date date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projects_status_idx on projects (status);

-- ------------------------------------------------------------ purchases ----
-- One line of a shopping trip. `total_price` is what was actually paid and
-- `savings` is what coupons took off, kept beside it rather than folded in.
create table if not exists purchases (
  id          uuid primary key default gen_random_uuid(),
  "date"      date not null,
  item_name   text not null check (length(trim(item_name)) > 0),
  image_key   text,
  icon        text,
  category    text not null default 'grocery'
              check (category in ('condiment', 'grocery', 'misc')),
  amount      numeric(12, 3) not null default 1,
  unit        text not null default 'qty' check (unit in (
                'ml','L','g','kg','pcs','pack','bag','lb','oz',
                'tbsp','tsp','clove','stalk','qty')),
  total_price numeric(12, 2) not null default 0,
  savings     numeric(12, 2),
  store       text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists purchases_date_idx on purchases ("date");
create index if not exists purchases_store_idx on purchases (store);

-- ------------------------------------------------------------ inventory ----
-- `key` is the normalized identity a purchase matches on, so it is unique:
-- two rows for "Milk" would make the pantry update only one of them.
-- `capacity` is what a full stock bar means, not what is there now.
create table if not exists inventory (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  key        text not null unique,
  image_key  text,
  icon       text,
  category   text not null default 'grocery'
             check (category in ('condiment', 'grocery', 'misc')),
  quantity   numeric(12, 3) not null default 0,
  unit       text not null default 'qty' check (unit in (
               'ml','L','g','kg','pcs','pack','bag','lb','oz',
               'tbsp','tsp','clove','stalk','qty')),
  capacity   numeric(12, 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_category_idx on inventory (category);

-- ---------------------------------------------------------------- meals ----
-- `photo` holds a data URL of the uploaded dish picture, which is why it is
-- `text` rather than a link to storage. `ingredients` is the meal's own list,
-- owned by the meal and never queried on its own, so it is one jsonb column.
create table if not exists meals (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  photo       text,
  ingredients jsonb not null default '[]'::jsonb,
  steps       text not null default '',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------- shopping ----
create table if not exists shopping (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(trim(name)) > 0),
  key          text not null,
  amount       numeric(12, 3),
  unit         text check (unit in (
                 'ml','L','g','kg','pcs','pack','bag','lb','oz',
                 'tbsp','tsp','clove','stalk','qty')),
  source       text not null default 'manual'
               check (source in ('inventory', 'meal', 'manual')),
  source_label text,
  done         boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists shopping_done_idx on shopping (done);
