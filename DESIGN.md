---
name: care2repair.eu — E6 Service Hub
description: "Le guichet européen de la réparation : un service public numérique, dense en données, également lisible en thème clair et sombre."
colors:
  olive-atelier: "#6e9922"
  olive-atelier-press: "#5e821c"
  olive-atelier-deep: "#4f6c18"
  olive-atelier-ink: "#2f3f0e"
  olive-atelier-wash: "#f5fbef"
  olive-atelier-tint: "#e6f4d7"
  olive-atelier-glow: "#99d45f"
  paper: "#ffffff"
  paper-recessed: "#f4f5f7"
  ink: "#24262d"
  ink-muted: "#707275"
  ink-faint: "#9e9e9e"
  rule: "#e5e7eb"
  surface-night: "#1a1c23"
  surface-night-deep: "#121317"
  ink-night: "#d5d6d7"
  rule-night: "#24262d"
  wayfind-devices: "#1c64f2"
  wayfind-map: "#7e3af2"
  wayfind-tutorials: "#d03801"
  wayfind-impact: "#057a55"
  wayfind-data: "#047481"
typography:
  display:
    fontFamily: "Montserrat, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 3rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "normal"
  headline:
    fontFamily: "Montserrat, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Montserrat, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Montserrat, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Montserrat, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.05em"
rounded:
  control: "8px"
  field: "12px"
  surface: "16px"
  pill: "9999px"
spacing:
  hairline: "4px"
  tight: "8px"
  snug: "12px"
  base: "16px"
  block: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.olive-atelier}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "10px 20px"
    typography: "{typography.label}"
  button-primary-hover:
    backgroundColor: "{colors.olive-atelier-press}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.olive-atelier-deep}"
    rounded: "{rounded.control}"
    padding: "8px 16px"
  chip-filter:
    backgroundColor: "{colors.paper-recessed}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "6px 12px"
  chip-filter-hover:
    backgroundColor: "{colors.olive-atelier-wash}"
    textColor: "{colors.olive-atelier-deep}"
  card-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "24px"
  input-search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "16px"
    typography: "{typography.title}"
---

# Design System: care2repair.eu — E6 Service Hub

## Overview

**Creative North Star: "Le Guichet Européen"**

C'est un service public numérique, pas un produit. Un guichet : on y arrive avec un problème concret — un appareil en panne — et il doit répondre avec clarté, dans quatre langues, sans faire d'esprit. La neutralité institutionnelle n'est pas de la tiédeur : c'est ce qui rend le service crédible quand il annonce couvrir 1,1 million de modèles et qu'il est financé par des fonds publics européens.

Le système est **dense et fonctionnel**. La plateforme agrège neuf outils ; le repérage prime sur l'expression. La marque ne s'exprime pas par du décor mais par la précision : un vert unique employé avec parcimonie, une trame de bordures régulière, une échelle typographique franche. Là où le guichet a besoin de signalétique — orienter vers l'un des neuf outils — il utilise une palette de repérage sobre, jamais décorative.

Les composants sont **vifs et tactiles** : le survol répond franchement, les transitions se sentent. C'est le seul endroit où le système s'autorise de la vivacité, et c'est délibéré — un guichet qui ne réagit pas donne l'impression d'être en panne.

Clair et sombre sont à parité stricte. Aucun des deux n'est le thème de référence, aucune décision ne se prend en regardant un seul des deux.

**Key Characteristics:**
- Un accent unique (Olive d'Atelier) porté par les actions, jamais par le décor
- Une palette de repérage à cinq teintes, réservée à la signalétique des outils
- Surfaces plates au repos, délimitées par un trait ; l'ombre signale un état
- Densité assumée : compteurs, volumes et chiffres réels affichés plutôt que suggérés
- Parité clair/sombre absolue
- Quatre langues (FR/EN/DE/NL) aux longueurs de libellés très variables

## Colors

Un vert olive terrien pour agir, une échelle de gris neutre pour tout le reste, et cinq teintes de repérage cantonnées à la signalétique.

### Primary

- **Olive d'Atelier** (`#6e9922`) : l'unique couleur d'action. Boutons primaires, icônes actives, anneaux de focus, accents de valeur. Un vert olive jaune (T 82°, S 64 %, L 37 %), sourd et terrien — il évoque l'outil et la matière, pas l'écologie décorative.
- **Olive Pressé** (`#5e821c`) : l'état survolé et pressé des surfaces olive. Il n'existait pas jusqu'à récemment — le 500 et le 600 étaient identiques, et aucun bouton de la plateforme ne réagissait au survol.
- **Olive Profond** (`#4f6c18`) : texte olive sur fond clair, quand le 500 manque de contraste.
- **Encre Olive** (`#2f3f0e`) : fond olive en thème sombre, base des dégradés de héros.
- **Lavis Olive** (`#f5fbef`) et **Teinte Olive** (`#e6f4d7`) : fonds de survol et champs colorés en thème clair.
- **Lueur Olive** (`#99d45f`) : la seule teinte olive lisible sur fond sombre. Réservée au texte et aux icônes olive en thème sombre.

### Tertiary — la signalétique des outils

Cinq teintes qui identifient chacune un outil de la plateforme, comme un panneau de direction identifie une aile d'un bâtiment public. Elles ne sont **pas** des couleurs de marque.

- **Bleu Appareils** (`#1c64f2`) : bibliothèque d'appareils.
- **Violet Carte** (`#7e3af2`) : carte des réparateurs.
- **Orange Tutoriels** (`#d03801`) : tutoriels et pièces détachées.
- **Vert Impact** (`#057a55`) : calculateur d'impact environnemental. Distinct de l'Olive d'Atelier, et cette distinction doit rester perceptible.
- **Sarcelle Données** (`#047481`) : suivi des réparations et données ouvertes.

### Neutral

- **Papier** (`#ffffff`) : surface des cartes en thème clair.
- **Papier Creusé** (`#f4f5f7`) : fond de page, champs au repos, pastilles inactives.
- **Encre** (`#24262d`) : texte principal en clair ; surface des pastilles en sombre.
- **Encre Sourde** (`#707275`) et **Encre Pâle** (`#9e9e9e`) : texte secondaire, compteurs, légendes.
- **Filet** (`#e5e7eb`) : la bordure qui délimite chaque surface en thème clair.
- **Surface Nuit** (`#1a1c23`) : surface des cartes en thème sombre.
- **Surface Nuit Profonde** (`#121317`) : fond de page en thème sombre.
- **Encre Nuit** (`#d5d6d7`) : texte principal en thème sombre.
- **Filet Nuit** (`#24262d`) : bordure en thème sombre.

### Named Rules

**La Règle de l'Accent Unique.** L'Olive d'Atelier ne porte qu'une seule action primaire par écran. Deux boutons olive côte à côte annulent la hiérarchie qu'ils sont censés créer.

**La Règle de la Signalétique.** Les cinq teintes de repérage ne s'appliquent qu'à l'identification d'un outil — pastille d'icône, filet d'accent. Elles ne touchent jamais un bouton primaire, un anneau de focus, un lien ou un état de formulaire. Un champ de saisie dans la carte des réparateurs a un focus **olive**, pas violet.

**La Règle du Faux Vert.** `frontend/src/assets/css/custom.css` déclare six variables `:root` dont `--primary-color: #38e07b`. Elles ont **zéro usage** dans tout le code. Ce n'est pas la couleur de marque. Ne jamais s'en servir, et se méfier de tout agent qui lirait ce fichier en premier.

## Typography

**Display / Body Font :** Montserrat (repli Inter, puis pile système)
**Icon Font :** Material Symbols Outlined

**Character :** Une géométrique humaniste, large et lisible, sans caractère marqué — le registre du service public plutôt que celui de l'éditorial. Elle porte bien les quatre langues et supporte la densité.

### Hierarchy

- **Display** (700, `clamp(1.875rem, 4vw, 3rem)`, 1.25) : titre de héros, une fois par page. Passe de 30 px en mobile à 48 px en desktop.
- **Headline** (700, 24 px, 1.3) : titres de section majeurs.
- **Title** (600, 16 px, 1.5) : titres de cartes, libellé du champ de recherche.
- **Body** (400, 14 px, 1.6) : texte courant, descriptions. Le sous-titre de héros monte à 18 px.
- **Label** (600, 12 px, +0.05em, capitales) : en-têtes de section secondaires (« CATÉGORIES POPULAIRES », « AUTRES SERVICES »), compteurs, métadonnées.

### Named Rules

**La Règle des Deux Polices.** Le shell applique `font-montserrat`, mais `custom.css` impose `Spline Sans` sur `body` et Tailwind déclare `Inter` en `sans` par défaut. Résultat : les pages **dans** le shell (accueil, wizard, carte) sont en Montserrat, celles **hors** shell (connexion, création de compte) en Spline Sans. C'est un défaut hérité, pas une intention. Toute nouvelle surface s'écrit en Montserrat.

**La Règle du Libellé le Plus Long.** Un libellé se vérifie en allemand avant d'être considéré comme fini. « Suivi des réparations » fait 21 caractères, son équivalent allemand en fait souvent 35.

## Layout

Deux rails : une barre latérale de navigation persistante à gauche, une colonne de contenu qui défile à droite. La colonne est centrée et bornée par le conteneur de `containers/Main.tsx` (`container mx-auto px-6`) — **c'est le seul conteneur**. Une page qui rajoute son propre `max-w-*` se bride deux fois et se retrouve étranglée sur les grands écrans.

Rythme vertical : 24 px entre les blocs d'une page, 32 px de respiration en haut et en bas. Rythme interne : 8 px entre éléments d'une même ligne, 12 px entre une icône et son libellé, 16 à 24 px de marge intérieure de carte.

Grilles : 3 colonnes au-delà de `lg` (1024 px), 2 colonnes à partir de `sm` (640 px), 1 colonne en dessous. Les pastilles de filtre s'écoulent librement en `flex-wrap`.

Un bloc peut s'étendre bord à bord en mobile via `-mx-6 px-6 sm:mx-0` — la marge négative annule exactement le padding du conteneur parent.

**La Règle de la Hauteur Réservée.** Tout bloc dont le contenu dépend d'un appel réseau réserve sa hauteur par un squelette. Sans cela, il s'insère après coup et pousse la page vers le bas au moment précis où l'utilisateur commence à lire.

## Elevation & Depth

**La bordure d'abord, l'ombre pour l'état.** Les surfaces sont plates au repos et délimitées par un trait d'un pixel (`Filet` en clair, `Filet Nuit` en sombre). C'est ce qui rend le système robuste dans les deux thèmes : un trait fonctionne dans les deux sens, un fond plus clair ne fonctionne qu'en clair.

L'ombre n'est pas un matériau, c'est un signal : elle marque ce qui flotte au-dessus du plan (menus, suggestions) ou ce qui répond à un geste (survol).

### Shadow Vocabulary

- **Repos** (`box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05)`) : cartes et surfaces au repos. Presque imperceptible, elle décolle à peine.
- **Saillie** (`box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)`) : le champ de recherche, qui doit se détacher de son fond coloré.
- **Superposition** (`box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)`) : listes de suggestions, menus, tout ce qui recouvre le contenu.

### Named Rules

**La Règle du Plat au Repos.** Aucune surface ne porte d'ombre supérieure à *Repos* tant qu'elle n'a pas été survolée ou qu'elle ne recouvre pas autre chose.

## Shapes

Trois rayons, une pastille. **8 px** pour les contrôles (boutons, petites tuiles d'icônes), **12 px** pour les champs de saisie, **16 px** pour les surfaces (cartes, blocs de page), **9999 px** pour les pastilles de filtre et les jetons de catégorie.

Les tuiles d'icônes sont des carrés à coins adoucis (36 px pour les entrées secondaires, 44 px pour les étapes de parcours), remplies d'un dégradé diagonal très pâle de leur teinte de repérage. Les étapes numérotées du parcours sont des disques bordés de 2 px, marqués d'une pastille de numéro en débord.

**La Règle des Coins Cohérents.** Un rayon se choisit par fonction, pas par goût : contrôle 8, champ 12, surface 16. Un bouton à 16 px dans une carte à 16 px efface la distinction entre le contenant et le contenu.

## Components

### Buttons

- **Shape :** coins adoucis (8 px).
- **Primary :** fond Olive d'Atelier, texte Papier, 10 px / 20 px de marge intérieure, graisse 600, 14 px. Icône Material Symbols de 16 px à gauche du libellé.
- **Hover / Focus :** fond Olive Pressé, transition `background-color 150ms cubic-bezier(0.4, 0, 0.2, 1)`. Le survol doit être **visible** : c'est un système « vif et tactile ».
- **Secondary :** contour Olive d'Atelier d'un pixel, texte Olive Profond en clair et Lueur Olive en sombre, fond transparent virant au Lavis Olive au survol.
- **Désactivé :** opacité 40 %, curseur interdit. Un bouton désactivé sans explication adjacente est un défaut, pas un état.

### Chips

- **Style :** pastille pleine (9999 px), fond Papier Creusé en clair et Encre en sombre, texte Encre / Encre Nuit, 6 px / 12 px. Icône de catégorie de 16 px en Olive d'Atelier, puis libellé, puis compteur en Encre Pâle 12 px.
- **State :** au survol, fond Lavis Olive et texte Olive Profond.
- **Le compteur fait partie du composant.** Une pastille de catégorie sans son volume ne dit pas à l'utilisateur si elle mène quelque part.

### Cards / Containers

- **Corner Style :** 16 px.
- **Background :** Papier en clair, Surface Nuit en sombre.
- **Border :** un pixel de Filet / Filet Nuit — c'est la délimitation principale.
- **Shadow Strategy :** *Repos* seulement ; voir Elevation & Depth.
- **Internal Padding :** 16 px pour les cartes compactes, 24 px pour les blocs de page.

### Inputs / Fields

- **Style :** fond Papier en clair et Encre en sombre, contour d'un pixel, rayon 12 px, 16 px de marge intérieure, texte 16 px.
- **Focus :** anneau de 2 px en Olive d'Atelier appliqué au conteneur (`focus-within`), jamais au champ seul — l'icône et les boutons d'action de la barre font partie de la cible.
- **Vide :** un champ de recherche ne rend jamais le silence. Zéro résultat affiche un message nommant la requête et une porte de sortie.

### Navigation

Barre latérale persistante, libellés en 14 px graisse 600, groupes repliables. L'entrée active porte un filet vertical de 2 px à sa teinte de repérage, collé au bord gauche. Le logo est en Lueur Olive, 24 px, graisse 700. En mobile, la barre passe en tiroir.

### Timeline de parcours (composant signature)

Les quatre étapes du parcours de réparation — Identifier, Diagnostiquer, Réparer, Recycler — forment une frise horizontale : disques de 44 px bordés de 2 px en Olive, pastille de numéro en débord haut-droit, libellé centré dessous, et un filet de 2 px qui relie les étapes en s'étirant. L'ensemble est un seul lien vers le parcours. C'est la représentation canonique du produit ; elle ne se réinvente pas d'une surface à l'autre.

## Do's and Don'ts

### Do:

- **Do** écrire toute nouvelle UI en **syntaxe Tailwind 2**. `shrink-0`, `grow`, `size-full` et les modificateurs d'opacité `bg-x/20` sont de la syntaxe v3 : ils ne génèrent aucune règle et échouent en silence. Utiliser `flex-shrink-0`, `flex-grow`, `w-full h-full`.
- **Do** vérifier chaque écran dans les **deux thèmes** avant de le considérer fini, en basculant par le bouton de l'application.
- **Do** propager toute modification de la rampe olive aux **trois** fichiers qui la déclarent : `tailwind.config.js`, `src/styles/sidebar-colors.css` et la palette Mantine de `src/index.tsx`.
- **Do** afficher les volumes réels (compteurs de catégories, nombre de modèles) : la densité chiffrée est ce qui rend le guichet crédible.
- **Do** réserver la hauteur de tout bloc alimenté par un appel réseau.
- **Do** rendre le survol franchement perceptible sur les éléments interactifs.

### Don't:

- **Don't** empiler `transition-*` et des variantes `dark:` sans le garde-fou de `body.theme-switching` : l'élément reste bloqué sur les couleurs du thème précédent.
- **Don't** ajouter un second conteneur (`max-w-*`, `mx-auto`, `px-*`) dans une page : `Main.tsx` le fournit déjà.
- **Don't** utiliser les teintes de repérage pour un bouton, un lien, un anneau de focus ou un état de formulaire.
- **Don't** ressembler à un **dashboard SaaS générique** : pas de dégradés violets décoratifs, pas de glassmorphism, pas de néons sur fond sombre.
- **Don't** ressembler à un **site marchand** : pas d'urgence commerciale, de badges promotionnels ni de comptes à rebours. La plateforme oriente, elle ne vend pas.
- **Don't** toucher aux variables `:root` de `custom.css` ni s'y référer : elles sont mortes et annoncent une fausse couleur de marque.
- **Don't** promettre plus que les données : la couverture réparateurs est de trois pays, pas six.
- **Don't** laisser un parcours se terminer sur une impasse sans alternative proposée.
