-- ============================================================================
-- Kaye Joëlle Creator — nettoyage des doublons
-- ============================================================================
-- À exécuter UNE SEULE FOIS si vous avez exécuté seed.sql plusieurs fois par
-- erreur (par exemple : 8 vidéos vues comme "24" dans le dashboard = 8 × 3).
--
-- Ce script garde la ligne la plus ancienne pour chaque doublon détecté
-- (même titre + même image/vidéo), supprime les autres, puis renumérote
-- proprement sort_order (0, 1, 2, ...) dans l'ordre d'origine.
--
-- Sans risque pour vos vraies données : un projet/vidéo/témoignage unique
-- ne sera jamais touché.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- projects
-- ----------------------------------------------------------------------------
with ranked as (
  select id, row_number() over (
    partition by title, image_public_id
    order by created_at asc
  ) as rn
  from projects
)
delete from projects where id in (select id from ranked where rn > 1);

with reordered as (
  select id, row_number() over (order by sort_order asc, created_at asc) - 1 as new_order
  from projects
)
update projects p set sort_order = r.new_order
from reordered r where r.id = p.id;

-- ----------------------------------------------------------------------------
-- reel_videos
-- ----------------------------------------------------------------------------
with ranked as (
  select id, row_number() over (
    partition by poster_public_id, video_public_id
    order by created_at asc
  ) as rn
  from reel_videos
)
delete from reel_videos where id in (select id from ranked where rn > 1);

with reordered as (
  select id, row_number() over (order by sort_order asc, created_at asc) - 1 as new_order
  from reel_videos
)
update reel_videos v set sort_order = r.new_order
from reordered r where r.id = v.id;

-- ----------------------------------------------------------------------------
-- testimonials
-- ----------------------------------------------------------------------------
with ranked as (
  select id, row_number() over (
    partition by quote, name
    order by created_at asc
  ) as rn
  from testimonials
)
delete from testimonials where id in (select id from ranked where rn > 1);

with reordered as (
  select id, row_number() over (order by sort_order asc, created_at asc) - 1 as new_order
  from testimonials
)
update testimonials t set sort_order = r.new_order
from reordered r where r.id = t.id;

-- ----------------------------------------------------------------------------
-- collaborations
-- ----------------------------------------------------------------------------
with ranked as (
  select id, row_number() over (
    partition by name
    order by created_at asc
  ) as rn
  from collaborations
)
delete from collaborations where id in (select id from ranked where rn > 1);

with reordered as (
  select id, row_number() over (order by sort_order asc, created_at asc) - 1 as new_order
  from collaborations
)
update collaborations c set sort_order = r.new_order
from reordered r where r.id = c.id;

-- ----------------------------------------------------------------------------
-- Vérification : lancez ceci après pour confirmer les nombres attendus
-- (24 projets, 8 vidéos, 7 témoignages, 8 collaborations)
-- ----------------------------------------------------------------------------
select 'projects' as table_name, count(*) from projects
union all select 'reel_videos', count(*) from reel_videos
union all select 'testimonials', count(*) from testimonials
union all select 'collaborations', count(*) from collaborations;