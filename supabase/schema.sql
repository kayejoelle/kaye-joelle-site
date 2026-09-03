-- ============================================================================
-- Kaye Joëlle Creator — schéma Supabase
-- ============================================================================
-- À exécuter une seule fois dans Supabase : Dashboard → SQL Editor → New query
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Fonction utilitaire : met à jour updated_at automatiquement
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- 1. site_content — paires clé/valeur pour tous les textes/réglages du site
--    (accueil, intro, à propos, contact, blocs statistiques, etc.)
-- ----------------------------------------------------------------------------
create table if not exists site_content (
  key         text primary key,
  value       text not null default '',
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_site_content_updated_at on site_content;
create trigger trg_site_content_updated_at
  before update on site_content
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. projects — éléments du portfolio (photo/vidéo, catégorie, description)
-- ----------------------------------------------------------------------------
create table if not exists projects (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default '',
  category      text not null default '',
  description   text not null default '',
  image_url     text default '',
  image_public_id text default '',
  video_url     text default '',
  video_public_id text default '',
  tall          boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_projects_updated_at on projects;
create trigger trg_projects_updated_at
  before update on projects
  for each row execute function set_updated_at();

create index if not exists idx_projects_sort on projects (sort_order);

-- ----------------------------------------------------------------------------
-- 3. reel_videos — formats verticaux (grille "Contenus UGC 9:16")
-- ----------------------------------------------------------------------------
create table if not exists reel_videos (
  id              uuid primary key default gen_random_uuid(),
  title           text not null default '',
  poster_url      text default '',
  poster_public_id text default '',
  video_url       text default '',
  video_public_id text default '',
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists trg_reel_videos_updated_at on reel_videos;
create trigger trg_reel_videos_updated_at
  before update on reel_videos
  for each row execute function set_updated_at();

create index if not exists idx_reel_videos_sort on reel_videos (sort_order);

-- ----------------------------------------------------------------------------
-- 4. testimonials — témoignages clients
-- ----------------------------------------------------------------------------
create table if not exists testimonials (
  id          uuid primary key default gen_random_uuid(),
  quote       text not null default '',
  name        text default '',
  org         text default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists trg_testimonials_updated_at on testimonials;
create trigger trg_testimonials_updated_at
  before update on testimonials
  for each row execute function set_updated_at();

create index if not exists idx_testimonials_sort on testimonials (sort_order);

-- ----------------------------------------------------------------------------
-- 5. collaborations — noms défilant dans le bandeau
-- ----------------------------------------------------------------------------
create table if not exists collaborations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists idx_collabs_sort on collaborations (sort_order);

-- ----------------------------------------------------------------------------
-- 6. media_library — médiathèque partagée (photos/vidéos Cloudinary),
--    utilisée par les différents "pickers" du dashboard
-- ----------------------------------------------------------------------------
create table if not exists media_library (
  id            uuid primary key default gen_random_uuid(),
  type          text not null check (type in ('image','video')),
  url           text not null,
  public_id     text not null,
  filename      text default '',
  bytes         bigint default 0,
  width         integer,
  height        integer,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- Empêche les doublons d'upload (même fichier Cloudinary référencé deux fois)
create unique index if not exists idx_media_library_public_id on media_library (public_id);
create index if not exists idx_media_library_created on media_library (created_at desc);
create index if not exists idx_media_library_sort on media_library (sort_order);

-- ----------------------------------------------------------------------------
-- 7. contact_messages — messages envoyés depuis le formulaire de contact
-- ----------------------------------------------------------------------------
create table if not exists contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  company     text default '',
  message     text not null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- Règle générale : lecture publique (le site doit s'afficher pour tout le
-- monde), écriture réservée aux utilisateurs authentifiés (le dashboard,
-- protégé par Supabase Auth).
-- ============================================================================

alter table site_content     enable row level security;
alter table projects         enable row level security;
alter table reel_videos      enable row level security;
alter table testimonials     enable row level security;
alter table collaborations   enable row level security;
alter table media_library    enable row level security;
alter table contact_messages enable row level security;

-- site_content
drop policy if exists "public read site_content" on site_content;
create policy "public read site_content" on site_content for select using (true);
drop policy if exists "auth write site_content" on site_content;
create policy "auth write site_content" on site_content for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- projects
drop policy if exists "public read projects" on projects;
create policy "public read projects" on projects for select using (true);
drop policy if exists "auth write projects" on projects;
create policy "auth write projects" on projects for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- reel_videos
drop policy if exists "public read reel_videos" on reel_videos;
create policy "public read reel_videos" on reel_videos for select using (true);
drop policy if exists "auth write reel_videos" on reel_videos;
create policy "auth write reel_videos" on reel_videos for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- testimonials
drop policy if exists "public read testimonials" on testimonials;
create policy "public read testimonials" on testimonials for select using (true);
drop policy if exists "auth write testimonials" on testimonials;
create policy "auth write testimonials" on testimonials for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- collaborations
drop policy if exists "public read collaborations" on collaborations;
create policy "public read collaborations" on collaborations for select using (true);
drop policy if exists "auth write collaborations" on collaborations;
create policy "auth write collaborations" on collaborations for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- media_library
drop policy if exists "public read media_library" on media_library;
create policy "public read media_library" on media_library for select using (true);
drop policy if exists "auth write media_library" on media_library;
create policy "auth write media_library" on media_library for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- contact_messages : n'importe qui peut ENVOYER un message (insert),
-- mais seule une personne connectée peut les LIRE ou les gérer.
drop policy if exists "public insert contact_messages" on contact_messages;
create policy "public insert contact_messages" on contact_messages for insert
  with check (true);
drop policy if exists "auth read contact_messages" on contact_messages;
create policy "auth read contact_messages" on contact_messages for select
  using (auth.role() = 'authenticated');
drop policy if exists "auth update contact_messages" on contact_messages;
create policy "auth update contact_messages" on contact_messages for update
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
drop policy if exists "auth delete contact_messages" on contact_messages;
create policy "auth delete contact_messages" on contact_messages for delete
  using (auth.role() = 'authenticated');
