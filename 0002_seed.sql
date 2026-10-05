-- Exercise library for the default Alpha split
insert into public.exercises (name, body_region, split_day, is_compound) values
  ('Bench Press','upper','push',true),('Incline Dumbbell Press','upper','push',true),
  ('Seated Shoulder Press','upper','push',true),('Lateral Raises','upper','push',false),
  ('Weighted Dips','upper','push',true),('Tricep Pushdowns','upper','push',false),
  ('Pull Ups','upper','pull',true),('Lat Pulldowns','upper','pull',true),
  ('Barbell Rows','upper','pull',true),('Seated Rows','upper','pull',true),
  ('Face Pulls','upper','pull',false),('Hammer Curls','upper','pull',false),('EZ Bar Curls','upper','pull',false),
  ('Back Squat','lower','legs',true),('Romanian Deadlift','lower','legs',true),
  ('Leg Press','lower','legs',true),('Walking Lunges','lower','legs',true),
  ('Hamstring Curls','lower','legs',false),('Leg Extensions','lower','legs',false),
  ('Standing Calf Raises','lower','legs',false),
  ('Close-Grip Bench Press','upper','upper_abs',true),('Chest-Supported Row','upper','upper_abs',true),
  ('Dumbbell Shoulder Press','upper','upper_abs',true),('Cable Crunches','core','upper_abs',false),
  ('Hanging Leg Raises','core','upper_abs',false),('Ab Wheel','core','upper_abs',false),
  ('Plank','core','upper_abs',false),('Cable Woodchop','core','upper_abs',false),
  ('Incline Treadmill Walk','cardio','cardio_recovery',false),('Stairmaster','cardio','cardio_recovery',false),
  ('Rowing','cardio','cardio_recovery',false),('Cycling','cardio','cardio_recovery',false);

-- Default habits for each new user
create or replace function public.seed_user_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.habits (user_id, key, name) values
    (new.id,'workout','Workout completed'),(new.id,'protein','Protein goal hit'),
    (new.id,'water','Water goal hit'),(new.id,'meal_prep','Meal prep complete'),
    (new.id,'sleep','Sleep goal hit'),(new.id,'steps','Step goal hit');
  insert into public.goals (user_id, kind, name, target_value) values
    (new.id,'bodyweight','Reach 190 lbs',190),(new.id,'squat','500 lb squat',500),
    (new.id,'bench','315 lb bench',315),(new.id,'abs','Visible abs',12);
  return new;
end $$;
create trigger on_profile_created after insert on public.profiles
  for each row execute function public.seed_user_defaults();
