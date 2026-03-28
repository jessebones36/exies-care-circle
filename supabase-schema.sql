-- Exie's Care Circle — Supabase Schema
-- Run this in your Supabase SQL editor to set up the database

-- Volunteers
create table if not exists volunteers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  created_at timestamptz default now()
);

-- Visits / scheduled slots
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid references volunteers(id) on delete cascade not null,
  visit_date date not null,
  visit_time time not null,
  is_recurring boolean default false,
  recurrence_day smallint,           -- 0=Sun, 1=Mon ... 6=Sat
  bringing_groceries boolean default false,
  bringing_meal boolean default false,
  notes text,
  cancelled boolean default false,
  cancelled_at timestamptz,
  created_at timestamptz default now()
);

-- Food items planned for a visit
create table if not exists food_items (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid references visits(id) on delete cascade not null,
  item_name text not null,
  quantity text,
  created_at timestamptz default now()
);

-- Exie's pantry / fridge / freezer inventory
create table if not exists pantry_items (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  quantity text,
  location text check (location in ('pantry', 'fridge', 'freezer')) not null default 'pantry',
  last_updated timestamptz default now(),
  added_by text
);

-- Exie's freeform requests to volunteers
create table if not exists exie_requests (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  created_at timestamptz default now()
);

-- Indexes for common queries
create index if not exists visits_visit_date_idx on visits(visit_date);
create index if not exists visits_volunteer_id_idx on visits(volunteer_id);
create index if not exists food_items_visit_id_idx on food_items(visit_id);

-- Enable Row Level Security (open for now — lock down after auth is added)
alter table volunteers enable row level security;
alter table visits enable row level security;
alter table food_items enable row level security;
alter table pantry_items enable row level security;

create policy "Public read" on volunteers for select using (true);
create policy "Public insert" on volunteers for insert with check (true);
create policy "Public update" on volunteers for update using (true);

create policy "Public read" on visits for select using (true);
create policy "Public insert" on visits for insert with check (true);
create policy "Public update" on visits for update using (true);

create policy "Public read" on food_items for select using (true);
create policy "Public insert" on food_items for insert with check (true);
create policy "Public delete" on food_items for delete using (true);

create policy "Public read" on pantry_items for select using (true);
create policy "Public insert" on pantry_items for insert with check (true);
create policy "Public update" on pantry_items for update using (true);
create policy "Public delete" on pantry_items for delete using (true);

alter table exie_requests enable row level security;
create policy "Public read" on exie_requests for select using (true);
create policy "Public insert" on exie_requests for insert with check (true);
