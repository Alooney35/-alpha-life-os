-- Alpha Life OS — core schema
-- Every user-owned table carries user_id and is protected by row-level security.

create extension if not exists "pgcrypto";

-- ---------- Profiles (Users) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  sex text check (sex in ('male','female')) default 'male',
  birth_date date,
  height_in numeric(5,2),
  starting_weight_lb numeric(6,2),
  goal_weight_lb numeric(6,2) default 190,
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')) default 'moderate',
  goal_type text check (goal_type in ('aggressive_fat_loss','fat_loss','recomp','maintenance','lean_bulk','muscle_gain')) default 'fat_loss',
  macro_mode text check (macro_mode in ('alpha','calculated')) default 'alpha',
  weekly_allowance numeric(10,2) default 100,
  allowance_rollover boolean default true,
  timezone text default 'America/Chicago',
  units text check (units in ('imperial','metric')) default 'imperial',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create a profile when someone signs up
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Body ----------
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  weight_lb numeric(6,2) not null check (weight_lb > 0),
  body_fat_pct numeric(4,1) check (body_fat_pct between 2 and 70),
  note text,
  created_at timestamptz default now(),
  unique (user_id, logged_on)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null default current_date,
  waist_in numeric(5,2), chest_in numeric(5,2), hips_in numeric(5,2),
  arm_in numeric(5,2), thigh_in numeric(5,2), neck_in numeric(5,2),
  created_at timestamptz default now()
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_on date not null default current_date,
  storage_path text not null,
  pose text check (pose in ('front','side','back','other')) default 'front',
  created_at timestamptz default now()
);

create table public.macro_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  effective_from date not null default current_date,
  mode text not null check (mode in ('alpha','calculated')),
  calories int not null, protein_g int not null, carbs_g int not null, fat_g int not null,
  bmr int, tdee int,
  created_at timestamptz default now()
);

-- ---------- Nutrition ----------
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = shared/public food
  name text not null,
  brand text,
  source text check (source in ('custom','usda','openfoodfacts','restaurant')) default 'custom',
  external_id text,
  barcode text,
  serving_size numeric(8,2) not null default 100,
  serving_unit text not null default 'g',
  calories numeric(8,2) not null default 0,
  protein_g numeric(8,2) not null default 0,
  carbs_g numeric(8,2) not null default 0,
  fat_g numeric(8,2) not null default 0,
  fiber_g numeric(8,2) default 0,
  sugar_g numeric(8,2) default 0,
  sodium_mg numeric(8,2) default 0,
  cost_per_serving numeric(8,2),
  is_favorite boolean default false,
  created_at timestamptz default now()
);
create index on public.foods (barcode);
create index on public.foods using gin (to_tsvector('english', name));

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  servings numeric(6,2) not null default 1 check (servings > 0),
  instructions text,
  prep_label text,
  template text check (template in ('high_protein','keto','low_carb','travel','cutting','bulk')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid not null references public.foods(id),
  servings numeric(8,2) not null default 1
);

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null default current_date,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  food_id uuid references public.foods(id),
  recipe_id uuid references public.recipes(id),
  servings numeric(8,2) not null default 1,
  -- denormalized snapshot so history survives food edits
  calories numeric(8,2) not null, protein_g numeric(8,2) not null,
  carbs_g numeric(8,2) not null, fat_g numeric(8,2) not null, fiber_g numeric(8,2) default 0,
  created_at timestamptz default now(),
  check (food_id is not null or recipe_id is not null)
);
create index on public.food_logs (user_id, logged_on);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  mode text check (mode in ('same_daily','alternating','budget','high_protein','keto')),
  plan jsonb not null default '{}'::jsonb, -- {day: {meal: recipe_id}}
  est_weekly_cost numeric(10,2),
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

create table public.meal_prep_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  label text not null,
  category text check (category in ('breakfast','lunch','dinner','snack')),
  status text not null check (status in ('prepared','frozen','consumed','expired')) default 'prepared',
  portions int not null default 1,
  prepared_on date default current_date,
  expires_on date,
  cost numeric(8,2),
  created_at timestamptz default now()
);

create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  items jsonb not null default '[]'::jsonb, -- [{name, qty, unit, est_cost, checked}]
  total_cost numeric(10,2),
  created_at timestamptz default now()
);

-- ---------- Training ----------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade, -- null = library exercise
  name text not null,
  body_region text not null check (body_region in ('upper','lower','core','cardio')),
  split_day text check (split_day in ('push','pull','legs','upper_abs','cardio_recovery')),
  is_compound boolean default false,
  created_at timestamptz default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_on date not null,
  split_day text not null check (split_day in ('push','pull','legs','upper_abs','cardio_recovery','rest')),
  status text not null check (status in ('scheduled','completed','missed')) default 'scheduled',
  duration_min int,
  cardio jsonb, -- {type, minutes, distance_mi, calories, avg_hr, steps}
  recovery jsonb, -- {stretching, foam_rolling, mobility, sauna}
  notes text,
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index on public.workout_sessions (user_id, scheduled_on);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number int not null,
  target_reps int, reps int not null,
  weight_lb numeric(6,2) not null default 0,
  rpe numeric(3,1) check (rpe between 1 and 10),
  rest_sec int,
  notes text,
  created_at timestamptz default now()
);
create index on public.workout_sets (user_id, exercise_id, created_at desc);

create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lift text not null check (lift in ('bench','squat','deadlift','ohp','pullup')),
  weight_lb numeric(6,2) not null,
  reps int not null default 1,
  achieved_on date not null default current_date,
  video_path text,
  notes text,
  created_at timestamptz default now()
);

-- ---------- Habits ----------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null, -- workout, protein, water, meal_prep, sleep, steps, or custom
  name text not null,
  active boolean default true,
  created_at timestamptz default now(),
  unique (user_id, key)
);

create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  logged_on date not null default current_date,
  done boolean not null default true,
  unique (habit_id, logged_on)
);

-- ---------- Money ----------
create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  period text not null check (period in ('weekly','monthly')) default 'monthly',
  amount numeric(10,2) not null,
  created_at timestamptz default now()
);

create table public.allowance_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  spent_on date not null default current_date,
  amount numeric(10,2) not null check (amount > 0),
  category text not null check (category in ('coffee','restaurants','amazon','entertainment','impulse','personal','hobbies')),
  merchant text,
  note text,
  transaction_id uuid, -- set when imported from a linked bank (Phase: Plaid)
  created_at timestamptz default now()
);
create index on public.allowance_transactions (user_id, spent_on);

create table public.allowance_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  allowance numeric(10,2) not null,
  carryover_in numeric(10,2) not null default 0,
  spent numeric(10,2) not null default 0,
  closed boolean default false,
  unique (user_id, week_start)
);

-- Ready for Plaid; populated manually until then
create table public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('checking','savings','credit','investment','loan')),
  balance numeric(12,2) not null default 0,
  provider text default 'manual' check (provider in ('manual','plaid')),
  plaid_account_id text,
  updated_at timestamptz default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.bank_accounts(id) on delete cascade,
  posted_on date not null,
  amount numeric(12,2) not null, -- positive = outflow
  merchant text,
  category text,
  is_allowance boolean default false,
  plaid_transaction_id text unique,
  created_at timestamptz default now()
);

create table public.category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_text text not null,
  category text not null,
  is_allowance boolean default false
);

create table public.net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_on date not null default current_date,
  assets numeric(14,2) not null, liabilities numeric(14,2) not null,
  unique (user_id, snapshot_on)
);

create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null,
  current_amount numeric(12,2) not null default 0,
  monthly_contribution numeric(10,2),
  target_date date,
  created_at timestamptz default now()
);

-- ---------- Goals, check-ins, AI ----------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('bodyweight','abs','squat','bench','pullup','savings','consistency','custom')),
  name text not null,
  start_value numeric(10,2),
  target_value numeric(10,2),
  current_value numeric(10,2),
  target_date date,
  achieved_on date,
  created_at timestamptz default now()
);

create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start date not null,
  protein_days int check (protein_days between 0 and 7),
  meals_out int check (meals_out >= 0),
  workouts_completed boolean,
  within_allowance boolean,
  meal_prep_done boolean,
  grade text check (grade in ('A+','A','B','C','D')),
  action_plan text,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

create table public.ai_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coach text not null check (coach in ('performance','workout','money','meal')),
  period_start date not null,
  content jsonb not null,
  created_at timestamptz default now()
);

-- ---------- Row-level security ----------
alter table public.profiles enable row level security;
create policy "own profile" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array[
    'weight_entries','body_measurements','progress_photos','macro_targets','recipes','recipe_ingredients',
    'food_logs','meal_plans','meal_prep_inventory','grocery_lists','workout_sessions','workout_sets',
    'personal_records','habits','habit_logs','budgets','allowance_transactions','allowance_weeks',
    'bank_accounts','transactions','category_rules','net_worth_snapshots','financial_goals','goals',
    'weekly_checkins','ai_summaries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Shared library rows (user_id null) are readable by everyone; custom rows are private.
alter table public.foods enable row level security;
create policy "read shared or own foods" on public.foods for select using (user_id is null or user_id = auth.uid());
create policy "write own foods" on public.foods for insert with check (user_id = auth.uid());
create policy "update own foods" on public.foods for update using (user_id = auth.uid());
create policy "delete own foods" on public.foods for delete using (user_id = auth.uid());

alter table public.exercises enable row level security;
create policy "read shared or own exercises" on public.exercises for select using (user_id is null or user_id = auth.uid());
create policy "write own exercises" on public.exercises for insert with check (user_id = auth.uid());
create policy "update own exercises" on public.exercises for update using (user_id = auth.uid());
create policy "delete own exercises" on public.exercises for delete using (user_id = auth.uid());

-- Private storage bucket for progress photos and PR videos: path = <user_id>/<file>
insert into storage.buckets (id, name, public) values ('progress', 'progress', false) on conflict do nothing;
create policy "own progress files" on storage.objects for all
  using (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'progress' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Views ----------
create or replace view public.daily_nutrition with (security_invoker = true) as
select user_id, logged_on,
  sum(calories)::int as calories, sum(protein_g)::int as protein_g,
  sum(carbs_g)::int as carbs_g, sum(fat_g)::int as fat_g, sum(fiber_g)::int as fiber_g
from public.food_logs group by user_id, logged_on;
