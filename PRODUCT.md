# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Deux audiences de **poids égal** (arbitrage confirmé par l'équipe) :

- **Le citoyen** dont un appareil électrique ou électronique est en panne. Il arrive sans savoir si son appareil est couvert, ni s'il doit le réparer lui-même, le faire réparer ou le recycler. Il n'est pas expert et n'a aucune raison a priori de créer un compte.
- **Le réparateur professionnel**, qui dispose de son propre parcours d'inscription (`RepairerOnboarding`), d'une fiche publique (`RepairerProfilePage`) et d'un espace « Mon atelier ».

Deux autres rôles existent dans le code sans être des audiences de conception : **invité** (navigation sans compte, mode par défaut) et **administrateur** (modération du catalogue d'outils communautaires et des signalements de réparateurs).

Conséquence : citoyen et réparateur ont des parcours distincts. Aucune surface ne doit fondre les deux en une interface indifférenciée.

## Product Purpose

care2repair.eu (le **E6 Service Hub**) est un point d'entrée unique pour prolonger la durée de vie des équipements électriques et électroniques (EEE), en orientant vers la réparation et la réutilisation plutôt que le remplacement.

Le produit permet d'identifier un appareil, de suivre un parcours de réparation guidé, d'accéder à des tutoriels, de localiser des professionnels, de trouver des pièces détachées et de mesurer l'impact environnemental évité.

**Définition du succès : non arbitrée à ce jour.** Trois finalités coexistent sans hiérarchie formelle — adoption par le grand public, démonstrateur pour les partenaires du projet, et socle réutilisable déployable par pays. Tant que cet arbitrage n'est pas rendu, éviter les décisions qui optimisent fortement l'une au détriment des autres.

## Positioning

Un écosystème **modulaire** : chaque capacité est un service indépendant (13 microservices backend, 2 services ML) agrégé derrière une passerelle unique, et le catalogue d'outils communautaires permet à des partenaires tiers de proposer leurs propres outils.

Ce qu'un produit voisin ne peut pas copier tel quel : la combinaison d'un catalogue d'appareils à l'échelle industrielle (~1,1 million de modèles), de données réparateurs issues d'accords nationaux (ADEME/Longue Vie Aux Objets, RepairConnects, Reparatiekaart) et d'un parcours qui va de l'identification jusqu'au recyclage sans rupture.

## Operating Context

- Projet **INTERREG North-West Europe (E6)**, porté par un consortium de 19 partenaires répartis sur 6 pays européens.
- Naissance du projet en octobre 2023 ; conception de la base de données d'octobre 2023 à février 2025 ; développement applicatif suivi dans Git de mars 2025 à avril 2026. La plateforme est en production et poursuit son intégration.
- Feuille de route arrêtée à **horizon fin 2027** (suivi dans Azure DevOps) : suivi des réparations, estimation du coût de réparation, points de recyclage, entretien préventif, agent conversationnel, outils partenaires (Repair Guidance, Decision Support), identités numériques nationales.
- Déploiement continu : **pousser sur `main` déclenche la mise en production**.

## Capabilities and Constraints

**Outils utilisateur intégrés (9)** — Device Catalog, Repair Journey, Repair Map, iFixit Tutorials, Fixometer, Fast Plan Eco (itinéraires écologiques, export GPX), Device Identification (par photo, ML), Device Issue Tag (classification de panne, ML), API Catalog / Outils communautaires.

**Vocabulaire produit à respecter** — « Parcours de réparation » (Repair Journey), « Fixomètre » (calculateur d'impact), « Bibliothèque d'appareils », « Outils communautaires » (renommage assumé d'« API Catalog », jugé opaque pour le grand public). Chaque appareil et catégorie porte une URN (`urn:care2repair:device:<id>`).

**Langues** — FR, EN, DE, NL présentes dans le frontend. L'internationalisation complète (frontend + emails) reste un chantier ouvert.

**Contraintes techniques durables :**

- **Tailwind CSS 2.2.19.** La syntaxe Tailwind v3 (`shrink-0`, `grow`, `size-full`, modificateurs d'opacité `bg-x/20`) ne génère **aucune règle** et échoue silencieusement. Du code v3 est déjà présent dans le dépôt. Toute nouvelle UI doit s'écrire en syntaxe v2.
- Le thème clair/sombre est piloté par **Windmill React UI**, qui réécrit entièrement `class` sur `<html>`. **Mantine** est également monté et gère son propre `data-mantine-color-scheme`. Le `ThemeContext` maison présent dans le code n'est monté nulle part.
- Clair et sombre sont à **parité** : aucun des deux n'est le thème de référence.
- La recherche d'appareils passe par Elasticsearch avec repli PostgreSQL ; le repli ne fournit pas les mêmes agrégations.

**Périmètre géographique — à ne pas surestimer :** les données réparateurs ne couvrent que **3 pays** (Belgique, France, Pays-Bas), alors que le projet en réunit 6. Aucune surface ne doit laisser croire à une couverture réparateurs européenne complète.

## Brand Commitments

- Nom et domaine : **care2repair.eu**, sous l'identité **E6 Service Hub**.
- Logos **Interreg North-West Europe** et **E6** présents dans l'en-tête (obligation de visibilité du financement européen).
- Couleur de marque : `customgreen` **#6e9922** (vert olive). Rampe complète définie dans `frontend/tailwind.config.js`, dupliquée dans `frontend/src/styles/sidebar-colors.css` et dans la palette Mantine de `frontend/src/index.tsx` — les trois doivent rester cohérentes.
- Polices chargées : Montserrat, Inter, Noto Sans, Spline Sans, Material Symbols Outlined.

## Evidence on Hand

**Données réelles en production :**

- **1 111 697 appareils** indexés (source Icecat, import novembre 2025). Le catalogue est très orienté informatique : ordinateurs portables et de bureau représentent ~86 % du volume.
- **≈33 700 réparateurs** importés — France ~30 125 (Longue Vie Aux Objets / ADEME), Belgique ~3 550 (RepairConnects), Pays-Bas ~70 (Reparatiekaart). *Les deux tableaux de `docs/RETROSPECTIVE.md` divergent légèrement sur la répartition.*
- ~195 500 réparations enregistrées (données Repair Monitor).

**Documents de référence dans le dépôt :** `docs/RETROSPECTIVE.md` (synthèse projet, chiffres, chronologie, feuille de route), `docs/OPERATIONS.md`, `docs/migrations.md`, `docs/tutorial-search.md`, `uml_servicehub.md`.

**Référence UX externe :** « Recommandations UX RRR », v1.0 du 16/06/2026, produite par la designer UX de l'équipe. Onze problèmes documentés avec impact et solutions. Non versionnée dans le dépôt.

**À ne pas fabriquer :** aucun témoignage client, aucune étude de cas, aucune donnée de trafic, aucun chiffre d'adoption, aucune revue de presse et aucun prix n'existent à ce jour. Le nombre d'utilisateurs réels n'est pas établi.

## Product Principles

1. **Répondre d'abord à « mon appareil est-il couvert ? »** C'est l'anxiété d'entrée du citoyen et la principale cause d'abandon documentée. L'échelle du catalogue est l'argument le plus fort du produit ; elle doit être lisible immédiatement.
2. **Ne jamais terminer un parcours sur une impasse.** Absence de tutoriel, zéro résultat de recherche, catégorie vide : chaque cul-de-sac doit proposer une sortie (réparateur, pièce, alternative, notification).
3. **Les affirmations ne dépassent jamais les données.** Trois pays de réparateurs, pas six. Un catalogue orienté informatique, pas une couverture EEE uniforme. Pas de chiffre d'adoption tant qu'il n'est pas mesuré.
4. **Deux audiences, deux parcours.** Citoyen et réparateur ont un poids égal mais des besoins disjoints ; chaque surface déclare qui elle sert.
5. **La confiance se perd sur un détail.** Une catégorie hors périmètre, un réparateur non pertinent, un chiffre invraisemblable suffisent à décrédibiliser l'ensemble — le soin porté aux données affichées fait partie du design.

## Accessibility & Inclusion

Niveau **WCAG 2.1 AA visé, sans caractère contractuel** à ce jour : objectif de principe, sans audit ni obligation formelle établie.

Un « Inclusion Tool » figure à la feuille de route (#13231, horizon fin 2027) sans périmètre arrêté.

Contraintes concrètes déjà connues : parité stricte clair/sombre, et une interface multilingue (FR/EN/DE/NL) dont les libellés varient fortement en longueur.
