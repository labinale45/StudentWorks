-- Create users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create ratings table
create table public.ratings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  student_id text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, student_id)
);

-- Create email verification table
create table public.email_verifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  email text not null,
  otp text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create RLS policies
alter table public.profiles enable row level security;
alter table public.ratings enable row level security;
alter table public.email_verifications enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Ratings policies
create policy "Anyone can view ratings"
  on public.ratings for select
  using (true);

create policy "Authenticated users can create ratings"
  on public.ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own ratings"
  on public.ratings for update
  using (auth.uid() = user_id);

-- Email verification policies
create policy "Users can view their own email verifications"
  on public.email_verifications for select
  using (auth.uid() = user_id);

create policy "Users can create their own email verifications"
  on public.email_verifications for insert
  with check (auth.uid() = user_id);

-- Create functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 