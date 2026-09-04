-- ============================================================================
-- Kaye Joëlle Creator — sécurisation du formulaire de contact
-- ============================================================================
-- À exécuter une seule fois dans Supabase (SQL Editor), APRÈS schema.sql.
--
-- Pourquoi : la policy RLS "public insert contact_messages" permettait à
-- N'IMPORTE QUI d'insérer des lignes directement via l'API Supabase (avec
-- la clé publique, visible dans le code du site), en contournant totalement
-- le formulaire et le site. Un bot pouvait donc spammer la table sans même
-- visiter la page. Cette migration ferme cet accès : seule la fonction
-- serveur /api/contact (qui utilise la clé secrète "service_role", jamais
-- exposée au navigateur) peut désormais insérer un message.
-- ============================================================================

-- Colonnes utiles pour la détection de spam / la limitation de fréquence.
alter table contact_messages add column if not exists ip_address text;
alter table contact_messages add column if not exists user_agent text;

-- Ferme l'insertion publique : seul le service_role (utilisé uniquement
-- côté serveur, dans /api/contact) peut désormais écrire dans cette table.
drop policy if exists "public insert contact_messages" on contact_messages;

-- Index utilisé par la vérification anti-spam (fréquence d'envoi par IP/email).
create index if not exists idx_contact_messages_ip_created on contact_messages (ip_address, created_at desc);
create index if not exists idx_contact_messages_email_created on contact_messages (email, created_at desc);