-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Leads Table
create table public.leads (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null default auth.uid(),
    name text not null,
    phone text not null,
    company text,
    email text,
    status text default 'Not Contacted',
    callback_date timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notes Table
create table public.notes (
    id uuid default uuid_generate_v4() primary key,
    lead_id uuid references public.leads on delete cascade not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Lead Tags Table
create table public.lead_tags (
    id uuid default uuid_generate_v4() primary key,
    lead_id uuid references public.leads on delete cascade not null,
    tag_name text not null
);

-- Row Level Security
alter table public.leads enable row level security;
alter table public.notes enable row level security;
alter table public.lead_tags enable row level security;

create policy "Users can view their own leads" on public.leads for select using (auth.uid() = user_id);
create policy "Users can insert their own leads" on public.leads for insert with check (auth.uid() = user_id);
create policy "Users can update their own leads" on public.leads for update using (auth.uid() = user_id);
create policy "Users can delete their own leads" on public.leads for delete using (auth.uid() = user_id);

create policy "Users can view their own notes" on public.notes for select using (exists (select 1 from public.leads where id = lead_id and user_id = auth.uid()));
create policy "Users can insert their own notes" on public.notes for insert with check (exists (select 1 from public.leads where id = lead_id and user_id = auth.uid()));
