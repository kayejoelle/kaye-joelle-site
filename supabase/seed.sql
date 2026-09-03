-- ============================================================================
-- Kaye Joëlle Creator — données initiales (contenu réel récupéré de l'ancien
-- site avant migration). À exécuter une seule fois, APRÈS schema.sql.
-- ============================================================================
-- Note sur les images : les URLs Cloudinary ci-dessous ont été reconstruites
-- à partir des noms de fichiers visibles dans votre export HTML (cloud name
-- "jkaye"). Vérifiez-les une fois le site en ligne ; si une image ne
-- s'affiche pas, ouvrez votre médiathèque Cloudinary, copiez l'URL exacte et
-- remplacez-la depuis le nouveau dashboard (elle sera alors sauvegardée en
-- base pour de bon).
--
-- Note sur les vidéos verticales (table reel_videos) : le fichier HTML
-- fourni ne contenait pas les URLs vidéo réelles (seules les images de
-- couverture étaient visibles côté site public), elles étaient stockées
-- dans le navigateur local et n'ont pas pu être récupérées. Les 8 entrées
-- sont recréées avec leur couverture d'origine mais sans fichier vidéo —
-- à réassocier depuis l'onglet "Vidéos" du dashboard.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- site_content
-- ----------------------------------------------------------------------------
insert into site_content (key, value) values
  ('heroEyebrow', 'UGC Creator Hotels | Spa & Wellness | Lifestyle'),
  ('heroName', 'Kaye Joëlle Creator'),
  ('heroTagline', 'L''art de créer du contenu impactant'),

  ('introEyebrow', 'Positionnement'),
  ('introHeading', 'Créatrice UGC spécialisée dans l''hôtellerie de luxe, le spa et les expériences premium. Je crée pour vous des contenus visuels alignés avec l''identité de votre marque et l''univers de vos lieux afin de renforcer votre image et votre visibilité.'),
  ('introBody', 'Je conçois chaque projet comme un récit visuel pensé pour traduire votre identité : lumière, matière et détails au service d''une expérience capturée avec la même exigence que celle que vous offrez à vos clients.'),
  ('introImageUrl', 'https://res.cloudinary.com/jkaye/image/upload/v1788177405/Profil_3_kvrkxe.png'),
  ('introVideoUrl', ''),
  ('introTall', 'false'),

  ('videosEyebrow', 'N°02 — Formats verticaux'),
  ('videosHeading', 'Contenus UGC 9:16'),

  ('statEnabled', 'true'),
  ('statHeadline', 'Un contenu authentique et engageant captivera votre public, augmentant ainsi vos conversions.'),
  ('statBody', '85 % des consommateurs considèrent que les contenus UGC sont plus influents que les photos et les vidéos des marques.'),
  ('statRole', ''),

  ('aboutQuote', 'Chaque détail compte.'),
  ('aboutBody1', 'Je suis Kaye Joëlle, créatrice de contenu UGC spécialisée dans l''univers haut de gamme. J''aide les hôtels, spas, restaurants et marques de voyage à créer des contenus authentiques et soignés, en accord avec leur image et leurs standards.'),
  ('aboutBody2', 'Je transforme chaque détail en une image qui attire le regard, raconte votre univers et donne envie de vivre l''expérience.'),
  ('aboutImageUrl', ''),
  ('aboutVideoUrl', 'https://res.cloudinary.com/jkaye/video/upload/v1788176976/5D52D_qtmgjy.mov'),

  ('stat2Enabled', 'true'),
  ('stat2Headline', '100 % des entreprises avec lesquelles j''ai collaboré se déclarent satisfaites de mon travail et de mon professionnalisme.'),
  ('stat2Body', ''),
  ('stat2Role', ''),

  ('collabsEnabled', 'false'),

  ('contactHeadline', 'Votre vision. Mon contenu. Notre collaboration.'),
  ('contactEmail', 'kayejoelle.pro@gmail.com'),
  ('contactInstagram', ''),

  ('footerName', 'Kaye Joëlle Creator'),
  ('footerCopyright', '© 2026 — Tous droits réservés')
on conflict (key) do update set value = excluded.value;

-- ----------------------------------------------------------------------------
-- projects (24) — ordre = ordre d'affichage sur le site
-- ----------------------------------------------------------------------------
insert into projects (title, category, description, image_url, image_public_id, tall, sort_order) values
  ('Espace de bains',        'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/234_cy9xa7.jpg', '234_cy9xa7', true,  0),
  ('Espace détente',         'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/5804_hemo0g.jpg', '5804_hemo0g', false, 1),
  ('Suite Panoramique',      'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8237_iy0azx.jpg', '8237_iy0azx', true,  2),
  ('Espace coworking',       'Spas & Wellness',            '', 'https://res.cloudinary.com/jkaye/image/upload/5813_om4wjp.jpg', '5813_om4wjp', true,  3),
  ('Extérieur',              'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8238_btsmzo.jpg', '8238_btsmzo', true,  4),
  ('Dji osmo pocket 3',      'Lifestyle',                  '', 'https://res.cloudinary.com/jkaye/image/upload/3104_yhcxgk.jpg', '3104_yhcxgk', false, 5),
  ('Golden Hour, Côte Bleue','Travel & Experiences',       '', 'https://res.cloudinary.com/jkaye/image/upload/8230_yunanc.jpg', '8230_yunanc', true,  6),
  ('Espace de bains',        'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/IMG_8236_inc1rv.jpg', 'IMG_8236_inc1rv', true, 7),
  ('Chambre',                'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8228_arnc4l.jpg', '8228_arnc4l', true,  8),
  ('Kaye Joëlle',            'Lifestyle',                  '', 'https://res.cloudinary.com/jkaye/image/upload/IMG_3248_oqeapc.jpg', 'IMG_3248_oqeapc', true, 9),
  ('Salle de sport',         'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/3370_pklq7w.jpg', '3370_pklq7w', true,  10),
  ('Kaye Joëlle',            'Lifestyle',                  '', 'https://res.cloudinary.com/jkaye/image/upload/3439_ye8gpy.jpg', '3439_ye8gpy', true,  11),
  ('Salle de sport',         'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/3360_vujvm1.jpg', '3360_vujvm1', true,  12),
  ('Extérieur',              'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8235_lmsiki.jpg', '8235_lmsiki', false, 13),
  ('Chambre',                'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8227_zurclr.jpg', '8227_zurclr', true,  14),
  ('Espace d''eau',          'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8161_pmp2qt.jpg', '8161_pmp2qt', false, 15),
  ('Espace de bains',        'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8229_t7iloq.jpg', '8229_t7iloq', true,  16),
  ('Accueil',                'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/5773_ddijad.jpg', '5773_ddijad', false, 17),
  ('Spa',                    'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/870d9e4a47e9d997c6c91638ee087c4c_rwzr5t.jpg', '870d9e4a47e9d997c6c91638ee087c4c_rwzr5t', false, 18),
  ('Espace détente',         'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8154_g7zyl1.jpg', '8154_g7zyl1', true, 19),
  ('Hôtel',                  'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8233_pnj7yi.jpg', '8233_pnj7yi', false, 20),
  ('Camera',                 'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/1b0d8b7164c7aa4004bd011836a5dc7c_lc3pbn.jpg', '1b0d8b7164c7aa4004bd011836a5dc7c_lc3pbn', true, 21),
  ('Kaye Joëlle',            'Lifestyle',                  '', 'https://res.cloudinary.com/jkaye/image/upload/5860_d434bu.jpg', '5860_d434bu', true, 22),
  ('Pack camera',            'Hôtels & Resorts',           '', 'https://res.cloudinary.com/jkaye/image/upload/8a187a85f77ff35517ab437c50300814_sohout.jpg', '8a187a85f77ff35517ab437c50300814_sohout', true, 23);

-- ----------------------------------------------------------------------------
-- reel_videos (8) — couvertures récupérées, fichier vidéo à réassocier
-- ----------------------------------------------------------------------------
insert into reel_videos (title, poster_url, poster_public_id, video_url, sort_order) values
  ('', 'https://res.cloudinary.com/jkaye/image/upload/ad7936aa6fc832a86fdfb86fc8424f7f_qyp1ei.jpg', 'ad7936aa6fc832a86fdfb86fc8424f7f_qyp1ei', '', 0),
  ('', 'https://res.cloudinary.com/jkaye/image/upload/d56243154bd6ce2e2a75a6f77a3c60ac_lgib7e.jpg', 'd56243154bd6ce2e2a75a6f77a3c60ac_lgib7e', '', 1),
  ('', 'https://res.cloudinary.com/jkaye/image/upload/e107531cffd57bcbdd61c6da2fd544a8_myjtc2.jpg', 'e107531cffd57bcbdd61c6da2fd544a8_myjtc2', '', 2),
  ('', 'https://res.cloudinary.com/jkaye/image/upload/8dbded6b2ff727db3bf41cbb553cc1a7_iq1cy9.jpg', '8dbded6b2ff727db3bf41cbb553cc1a7_iq1cy9', '', 3),
  ('', 'https://res.cloudinary.com/jkaye/image/upload/5d6b0c50b4b2617625aa8d4e80fba3ba_dbsctg.jpg', '5d6b0c50b4b2617625aa8d4e80fba3ba_dbsctg', '', 4),
  ('', 'https://res.cloudinary.com/jkaye/image/upload/7ca8d6e5344d431b18a6e422666fa592_bpey0o.jpg', '7ca8d6e5344d431b18a6e422666fa592_bpey0o', '', 5),
  ('', 'https://res.cloudinary.com/jkaye/image/upload/0a0a099df26def779b0b2f793bc5e1fc_jp6xzo.jpg', '0a0a099df26def779b0b2f793bc5e1fc_jp6xzo', '', 6),
  ('', 'https://res.cloudinary.com/jkaye/image/upload/e9db717342aa0fce9d94715a73386cbf_a4my1o.jpg', 'e9db717342aa0fce9d94715a73386cbf_a4my1o', '', 7);

-- ----------------------------------------------------------------------------
-- testimonials (7)
-- ----------------------------------------------------------------------------
insert into testimonials (quote, name, org, sort_order) values
  ('Nous sommes ravis du résultat. Les vidéos sont très naturelles, élégantes et parfaitement alignées avec notre image de marque.', 'Camille R.', '', 0),
  ('Une très belle collaboration du début à la fin. Kaye Joëlle a parfaitement compris notre univers et a su le retranscrire avec beaucoup de finesse.', 'Laura M.', '', 1),
  ('Le rendu est vraiment superbe, avec une attention particulière portée aux détails. Les contenus ont immédiatement trouvé leur place dans notre communication.', 'Stephane D.', '', 2),
  ('Très professionnelle et surtout très réactive. Les contenus ont été livrés rapidement et correspondaient parfaitement au brief.', 'Thomas B.', '', 3),
  ('Nous avons particulièrement apprécié son regard créatif. Elle a su mettre en valeur notre établissement tout en respectant notre identité.', 'Clara L.', '', 4),
  ('Les photos sont superbes et très qualitatives. La lumière, les cadrages et les détails sont parfaitement maîtrisés.', 'Paul C.', '', 5),
  ('Une créatrice très à l''écoute et force de proposition. Le résultat est à la fois authentique, élégant et professionnel.', 'Marine C.', '', 6);

-- ----------------------------------------------------------------------------
-- collaborations (8) — section actuellement désactivée sur le site
-- (voir site_content.collabsEnabled = 'false'), réactivable en un clic.
-- ----------------------------------------------------------------------------
insert into collaborations (name, sort_order) values
  ('Villa Aurelia', 0),
  ('Spa Ondine', 1),
  ('Le Comptoir Doré', 2),
  ('The Ilaria Resort', 3),
  ('Château de la Baie', 4),
  ('Auberge du Lac Bleu', 5),
  ('Riva Bianca Hotel', 6),
  ('Maison Cléo', 7);
