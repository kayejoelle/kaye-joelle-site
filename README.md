# Kaye Joëlle Creator — site + dashboard (refonte)

Ce dossier contient la version reconstruite de votre site : le design, les
animations et le contenu sont identiques à l'original, mais tout ce qui est
modifié depuis le dashboard (photos, vidéos, textes) est maintenant
**enregistré pour de bon**, dans une vraie base de données, visible par
**tous vos visiteurs**, sur **tous les navigateurs et appareils**.

## Ce qui a changé, et pourquoi

L'ancien site enregistrait tout dans le navigateur (IndexedDB/localStorage).
Résultat : vos modifications n'étaient visibles que sur votre propre
navigateur, jamais pour vos visiteurs, et disparaissaient si vous changiez
d'appareil ou videz votre cache.

La nouvelle architecture :

| Avant | Maintenant |
|---|---|
| Stockage dans le navigateur (IndexedDB) | Base de données **Supabase** (Postgres), partagée par tous |
| Photos/vidéos en `blob:` locaux ou base64 | Fichiers hébergés sur **Cloudinary**, l'URL est enregistrée en base |
| Dashboard accessible à tout le monde, sans mot de passe | Dashboard protégé par une **connexion (email + mot de passe)** |
| Réorganisation par boutons ▲▼ | **Glisser-déposer** réel pour réordonner |

Le site reste un site 100% statique (HTML/CSS/JS), hébergé sur **Vercel**.
Il n'y a pas de serveur à maintenir : le navigateur communique directement
avec Supabase (base de données + authentification) et Cloudinary (photos/
vidéos), tous deux protégés par des règles de sécurité strictes (voir plus
bas).

---

## 1. Créer le projet Supabase (base de données + connexion admin)

1. Allez sur [supabase.com](https://supabase.com) → **New project** (le
   plan gratuit suffit largement).
2. Une fois le projet créé, ouvrez **SQL Editor** (menu de gauche) →
   **New query**.
3. Copiez-collez tout le contenu de [`supabase/schema.sql`](supabase/schema.sql),
   puis cliquez **Run**. Cela crée les tables et les règles de sécurité.
4. Toujours dans le SQL Editor, ouvrez une nouvelle requête, copiez-collez
   [`supabase/seed.sql`](supabase/seed.sql), puis **Run**. Cela réinjecte
   tout votre contenu actuel (24 projets, 8 vidéos, 7 témoignages, 8
   collaborations, tous les textes) — voir les notes en tête de ce fichier
   pour les quelques éléments qui n'ont pas pu être récupérés automatiquement
   (les vidéos verticales n'avaient pas d'URL récupérable, à réassocier
   depuis le dashboard).
5. Créez votre compte administrateur : **Authentication** → **Users** →
   **Add user** → renseignez votre email et un mot de passe, cochez
   **Auto Confirm User**. C'est cet email/mot de passe qui ouvrira le
   dashboard du site.
6. Récupérez vos clés : **Project Settings** → **API** → notez :
   - **Project URL**
   - **anon / public key**

   (Ne prenez jamais la clé `service_role` pour ce projet — elle ne doit
   jamais être exposée dans du code qui tourne dans le navigateur.)

## 2. Créer le compte Cloudinary (upload des photos/vidéos)

Vous utilisez déjà Cloudinary (cloud name `jkaye`), donc si vous avez
toujours accès à ce compte, passez directement à l'étape 2 ci-dessous.

1. [cloudinary.com](https://cloudinary.com) → connectez-vous à votre compte
   existant (ou créez-en un si besoin).
2. **Settings** (roue crantée) → **Upload** → section **Upload presets** →
   **Add upload preset**.
3. Configurez :
   - **Signing Mode : Unsigned** (indispensable — c'est ce qui permet
     l'upload direct depuis le dashboard sans exposer votre clé secrète)
   - **Folder** : `kaye-joelle-site` (optionnel, garde tout bien rangé)
   - Vous pouvez limiter les formats/poids autorisés dans les options
     avancées du preset si vous le souhaitez.
4. Enregistrez, puis notez le **nom du preset** (ex. `kaye_joelle_unsigned`).
5. Notez aussi votre **Cloud name** (visible en haut du Dashboard
   Cloudinary — normalement `jkaye`).

## 3. Configurer le projet

Ouvrez [`public/js/config.js`](public/js/config.js) et remplacez les
valeurs par les vôtres :

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJ...",
  CLOUDINARY_CLOUD_NAME: "jkaye",
  CLOUDINARY_UPLOAD_PRESET: "kaye_joelle_unsigned",
};
```

Ces valeurs sont conçues pour être publiques (visibles dans le code source
du navigateur) — voir les commentaires dans le fichier pour le détail.

## 4. Tester en local (optionnel mais recommandé)

Depuis le dossier `public/`, n'importe quel petit serveur statique
fonctionne, par exemple :

```bash
cd public
npx serve .
# ou : python3 -m http.server 8080
```

Ouvrez `http://localhost:8080`, vérifiez que le site s'affiche avec votre
contenu, puis cliquez sur ⚙️ en bas à droite pour tester la connexion au
dashboard avec le compte créé à l'étape 1.

## 5. Déployer sur Vercel

1. Créez un dépôt Git (GitHub, GitLab…) et poussez-y ce dossier.
2. Sur [vercel.com](https://vercel.com) → **Add New** → **Project** →
   importez ce dépôt.
3. **Framework Preset : Other** (site 100% statique, aucune commande de
   build nécessaire).
4. **Root Directory** : laissez tel quel si `public/` est à la racine du
   dépôt, ou indiquez `public` comme dossier de sortie selon votre
   organisation — le plus simple est de définir **Output Directory** sur
   `public`.
5. Déployez. Vercel vous donne une URL en `.vercel.app` immédiatement ; vous
   pourrez brancher votre nom de domaine ensuite dans **Settings → Domains**.

Comme il n'y a aucune fonction serverless ni variable d'environnement
secrète à gérer côté serveur, il n'y a rien d'autre à configurer côté
Vercel : `public/js/config.js` contient déjà tout ce qu'il faut.

## 6. Vérifications après mise en ligne

- Ouvrez le site en navigation privée (pour être sûr de ne rien voir de
  mis en cache localement) : le contenu doit s'afficher normalement.
- Cliquez sur ⚙️, connectez-vous, modifiez un texte, cliquez sur
  **Enregistrer** : rechargez la page en navigation privée sur un autre
  appareil si possible → le changement doit être visible.
- Ajoutez une photo dans un projet, glissez-la pour la réordonner,
  supprimez un élément : à chaque fois, rechargez la page pour confirmer
  que le changement a bien persisté.
- Dans l'onglet **Vidéos**, réassociez un vrai fichier vidéo à chacune des
  8 entrées existantes (voir la note dans `supabase/seed.sql` : les fichiers
  vidéo d'origine n'ont pas pu être récupérés depuis l'export HTML fourni,
  seules les images de couverture l'ont été).
- Vérifiez les URLs d'images du portfolio : elles ont été reconstruites à
  partir des noms de fichiers Cloudinary visibles dans votre ancien export.
  Si une image ne s'affiche pas, ouvrez votre médiathèque sur
  cloudinary.com, copiez l'URL exacte, et remplacez-la depuis l'onglet
  Portfolio du dashboard (bouton ✎ sur l'élément concerné).

## Sécurité — comment c'est protégé

- **Lecture** : tout le monde peut lire le contenu du site (normal, c'est
  un site public).
- **Écriture** : seules les requêtes envoyées par un compte connecté via
  Supabase Auth peuvent créer, modifier ou supprimer quoi que ce soit. Ces
  règles sont appliquées **côté base de données** (Row Level Security dans
  `schema.sql`), donc même si quelqu'un lit le code source du site et
  récupère la clé publique, il ne peut rien modifier sans se connecter.
- **Uploads Cloudinary** : le preset non signé permet uniquement d'ajouter
  des fichiers, jamais d'en supprimer ni de lire votre compte. Combiné au
  fait que seule une personne connectée au dashboard peut déclencher un
  upload, c'est un compromis sûr pour ce site.
- **Mot de passe admin** : géré entièrement par Supabase Auth (hashage,
  sessions, expiration) — vous n'avez rien à développer ni maintenir
  vous-même sur ce point.

Si un jour vous voulez passer à des uploads *signés* (encore plus strict,
via une fonction serverless Vercel qui signe la requête avec la clé secrète
Cloudinary côté serveur), la structure du projet le permet facilement :
il suffirait d'ajouter un dossier `api/` avec une fonction Vercel et de
remplacer l'appel direct dans `public/js/cloudinary.js` par un appel à
cette fonction. Ce n'était pas nécessaire pour la mise en place actuelle.

## Structure du projet

```
public/
  index.html              → page du site + gabarit du dashboard
  css/style.css            → design original + styles ajoutés (auth, upload, drag & drop)
  js/config.js              → vos identifiants Supabase / Cloudinary (à remplir)
  js/supabaseClient.js       → connexion à Supabase
  js/db.js                   → toutes les opérations base de données (lecture/écriture)
  js/auth.js                  → connexion / déconnexion du dashboard
  js/cloudinary.js             → upload des photos / vidéos
  js/site.js                    → affichage public du site
  js/admin.js                    → logique du tableau de bord
supabase/
  schema.sql                → tables + règles de sécurité (à exécuter une fois)
  seed.sql                  → votre contenu actuel réinjecté (à exécuter une fois)
```

## Limites connues / points d'attention

- Les 8 entrées de la table `reel_videos` sont recréées avec leur image de
  couverture d'origine mais **sans fichier vidéo** — l'export HTML fourni
  ne contenait pas ces URLs (elles étaient stockées uniquement dans le
  navigateur local au moment de l'export). À réassocier une fois.
- Les URLs d'images du portfolio ont été **reconstruites** à partir des
  noms de fichiers visibles dans l'export (même cloud Cloudinary `jkaye`) ;
  à vérifier une fois en ligne, au cas où l'un des fichiers aurait depuis
  été renommé ou supprimé côté Cloudinary.
- La section **Services** (les 7 prestations) reste un contenu fixe dans
  `public/js/site.js` (`SERVICES`) : elle ne faisait pas partie des
  onglets du dashboard dans la version d'origine. Si vous voulez pouvoir
  l'éditer aussi depuis le dashboard, dites-le-moi — c'est une extension
  simple à ajouter (même schéma que les autres listes).
