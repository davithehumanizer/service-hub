# Données de démonstration saisies par l'interface

Inventaire des fonctionnalités manquantes ou à modifier, établi le 16/10/2026 sur
le code de `dev`, après la refonte des modèles d'appareils (PR #113, déployée le
13/10). **Rien n'est commencé** : aucune ligne de code, aucune migration.

Les deux docs de plan du 02/10 (claude.ai, versions FR et EN) sont introuvables
depuis le compte de Corentin le 16/10. Ce fichier les remplace.

Lire d'abord `CLAUDE.md` (pièges qui échouent en silence),
`docs/device-models-refacto.md` (§4.0, §4.0 bis, décision 9),
`docs/OPERATIONS.md` § Permissions et `docs/migrations.md`.

---

## 1. Le besoin

Des entreprises externes, rémunérées pour cela, remplissent le Service Hub de
données fictives, **par le site** et non par l'API, avec des comptes dédiés.
Le but : que le site soit utilisable et ne paraisse plus vide.

- Données visées : appareils (modèles, variantes) et réparateurs.
- Chaque donnée saisie est marquée comme fictive.
- Une fonction ou une route d'administration supprime en cascade toutes les
  données fictives.

---

## 2. Décisions prises

### Équipe, 02/10/2026

- Un rôle « contributeur », **un compte par entreprise externe**, créé par un
  administrateur.
- Est fictive toute donnée créée par un contributeur, ou liée à une donnée
  fictive (contagion).
- Un badge « Démo » les distingue. Pas de filtre pour les masquer.
- Les données fictives **comptent** dans les statistiques, la recherche et les
  compteurs jusqu'à la purge. C'est l'inverse du besoin exprimé au départ, et un
  choix volontaire : ne pas réintroduire l'exclusion.
- Un réparateur ajouté, par un contributeur ou un vrai utilisateur, n'apparaît
  sur la carte qu'après confirmation d'un administrateur. **Chaque
  modification** repasse par cette confirmation, l'ancienne version restant
  affichée en attendant. Le reste se fait sans confirmation.
- Les champs État fonctionnel, État visuel et Âge sortent du formulaire de
  création d'appareil. **Fait** par la refonte : ils vivent sur l'appareil
  personnel.
- Un appareil et un réparateur sont modifiables par leur créateur et par
  l'administrateur.
- Une seule purge, manuelle, de toutes les données fictives. Les comptes
  contributeurs sont supprimés avec elle.
- Volume : le plus possible. Les entreprises restent à trouver.

### Corentin, 05/10/2026 (décision 9 de la refonte)

- Un modèle créé par un contributeur est fictif tant qu'il n'a aucune vraie
  variante. Il **devient réel** dès qu'une vraie variante s'y rattache, par un
  import Icecat par exemple.
- La purge supprime les variantes fictives, puis les modèles fictifs restés sans
  vraie variante. Une vraie variante n'est jamais emportée.

### Corentin, 16/10/2026

- **Caractéristiques** : clé-valeur libre, avec des clés proposées d'avance.
  Elles sont stockées **sur la variante**, dans la table existante. Un
  contributeur qui veut en saisir crée donc au moins une variante.
- Un contributeur peut ajouter **des variantes et des photos à un modèle réel**.
- L'EAN saisi par un contributeur **commence par 2**, et c'est imposé par le
  serveur. Les préfixes GS1 200 à 299 sont réservés à la circulation interne.
- **Contagion stricte** : l'appareil personnel ou le parcours d'un vrai
  utilisateur qui pointe vers une variante fictive d'un modèle réel est
  supprimé à la purge, pas détaché.

---

## 3. État actuel en bref

Un utilisateur connecté peut aujourd'hui créer un **modèle** : marque, nom,
catégories, EAN ou référence, photos. C'est tout ce qu'il peut créer de visible
par les autres.

Il n'existe ni rôle contributeur, ni création de compte par un administrateur,
ni moyen d'ajouter un réparateur par le site, ni marquage, ni purge. Aucune table
du catalogue (`device_models`, `devices`, `device_photos`,
`device_model_photos`) ni des réparateurs (`repairers`) n'enregistre qui a créé
une ligne.

---

## 4. Liste des travaux

État : **manque**, **partiel** (existe en partie), **à modifier** (existe mais
ne convient pas), **cassé** (existe mais échoue), **existe**.

### 4.1 Comptes et rôle contributeur

| Fonction | État | Ce qu'il faut faire |
|---|---|---|
| Rôle `contributor` | manque | Une entrée dans `ROLES` (`backend/user-management/src/roles/role-seeder.service.ts:67`). Ne **pas** construire sa liste à partir de celle de `user`, qui contient `user.get_all` (lister tous les comptes). |
| L'admin crée un compte avec un rôle | manque | `create_user` existe dans user-management mais n'est appelé que par la connexion sociale, force le rôle `user` et n'est pas exposé par la passerelle. Il faut une route admin, une permission nouvelle et un écran. |
| L'admin change le rôle d'un compte | manque | Possible seulement en SQL sur `users."roleId"`. Un changement ne vaut qu'après reconnexion : les permissions voyagent dans le JWT. |
| Liste des comptes pour l'admin | partiel | `GET /v1/users` existe (`user.get_all`). Le front ne l'appelle nulle part. |
| Supprimer un compte | manque | Aucune route, aucun événement entre services. Nécessaire à la purge. `RefreshTokenService.revokeAllForUser` existe. `repairer_profiles` suit en cascade, `user_profiles` resterait orpheline (la clé étrangère est côté `users`). |
| Le front reconnaît le rôle | à modifier | `selectUserType` (`frontend/src/stores/authSlice.ts:270`) renvoie `null` pour un rôle inconnu : le menu se réduit aux entrées `all`. Il faut étendre `UserRole`, `selectUserType` et `frontend/src/routes/sidebar.tsx`. |
| Onboarding | à modifier | `frontend/src/containers/Layout.tsx:34` redirige vers l'onboarding client tant que `onboardingCompleted` est faux. À sauter pour un contributeur. |

### 4.2 Modèles et variantes

| Fonction | État | Ce qu'il faut faire |
|---|---|---|
| Créer un modèle | à modifier | `frontend/src/pages/CreateDevice.tsx` → `POST /v2/device-models` (`device.create`). Le service ne reçoit pas l'utilisateur : enregistrer l'auteur et le marqueur fictif. Pour un contributeur : EAN commençant par 2, et refus d'un code déjà au catalogue (voir §6). |
| Second chemin de création de modèle | à modifier | « Ajouter à mes appareils » à la fin d'un parcours saisi à la main crée un modèle (`backend/api-gateway/src/repair-monitor/repair-monitor.controller.ts`, route `POST /journeys/:id/personal-device`, gardée par `ownership.assign_device` seul). Il doit aussi enregistrer l'auteur et le marqueur. |
| Ajouter une variante depuis la fiche d'un modèle, réel ou fictif | manque | Aujourd'hui, seul moyen : retaper exactement la marque et le nom avec un nouvel EAN. Il faut un bouton sur `ModelDetails.tsx` et un formulaire : EAN, référence, caractéristiques, photos. |
| Saisir les caractéristiques | manque | Formulaire clé-valeur : des clés proposées selon la catégorie, plus une ligne « autre » libre. Les clés proposées sont stockées sous leur nom Icecat (anglais) dans `device_technical_properties` et affichées traduites dans le formulaire (4 langues). Elles se rangent ainsi dans les groupes de `PropertyAccordion`, et le libellé de variante (« 256 GB · Noir ») se calcule tout seul : il est fait des 13 propriétés de `LABEL_PROPERTIES` (`backend/devices-service/src/device-models/variant-label.ts`). Les clés libres sont stockées telles que tapées. |
| Modifier un modèle (créateur ou admin) | manque | Ni route ni écran : marque, nom et catégories sont figés après la création. Changer le nom change la clé normalisée : un nom qui tombe sur un modèle existant est refusé, avec un lien vers lui (§8). |
| Modifier une variante (créateur ou admin) | à modifier | `PATCH /v1/devices/:id` existe mais n'a pas d'écran, exige un `CreateDeviceDto` complet, ne vérifie pas le propriétaire, et `device.update` n'est pas semé. Il faut une mise à jour partielle, un contrôle du créateur, un écran, et le recalcul du libellé. |
| Photos de modèle | partiel | Ajout seulement depuis le formulaire de création. La fiche n'affiche qu'une vignette, et une photo de modèle n'est que le troisième choix après les images de la variante représentative. Il faut ajouter des photos depuis la fiche et afficher la galerie. |
| Photos de variante | partiel | `POST /v1/devices/:id/photos` existe, sans écran. Il ne vérifie pas que l'appareil existe. |
| Supprimer une photo | partiel | Admin seulement (`device.photos.admin`), sans écran. Le créateur devrait pouvoir supprimer les siennes. |
| Supprimer un modèle ou une variante | manque | Aucune route. La purge en a besoin (§4.4). |
| Badge « Démo » | manque | Carte et fiche de modèle, résultats de recherche, **sélecteur de variantes**. Avec la contagion stricte, un vrai utilisateur qui choisit une variante fictive perdra son appareil à la purge : le badge est sa seule alerte. L'index Elasticsearch des modèles doit porter le marqueur. |

L'appareil personnel (`ownerships`) n'est pas à saisir : il n'est visible que de
son propriétaire. Il existe déjà, avec création, modification et suppression
limitées au propriétaire.

### 4.3 Réparateurs

Tout est à faire.

| Fonction | État | Ce qu'il faut faire |
|---|---|---|
| Proposer un réparateur par le site | manque | `POST /v1/repairers` est réservé à l'admin (`repairer.create`), sans auteur ni géocodage, et le front n'a aucun formulaire. « Mon atelier » (`RepairerProfilePage.tsx`) écrit dans `repairer_profiles` (user-management), une autre table sans coordonnées qui n'atteint jamais la carte. Il faut un formulaire et une permission nouvelle donnée au contributeur **et** à `user`. |
| Géocodage | manque | Le serveur ne géocode rien : latitude et longitude doivent être fournies, sinon le réparateur n'est jamais sur la carte. Réutiliser `POST /v1/fast-plan-eco/geocode-address` (Nominatim) ou l'autocomplétion Photon de `components/RepairMap/LocationAutocomplete.tsx`. |
| Colonnes manquantes | manque | `repairers` n'a ni auteur, ni statut (en attente / publié / refusé), ni `created_at` / `updated_at`. |
| Colonnes NOT NULL | à modifier | `description`, `address`, `city`, `postal_code` et `country` sont NOT NULL en base alors que le DTO les déclare facultatives : un formulaire incomplet finit en erreur 500. |
| File de validation admin | manque | Aucun écran. `AdminApiCatalogPage.tsx` (en attente → approuver / rejeter) est le modèle à suivre. |
| N'afficher que les réparateurs publiés | manque | Filtre à poser sur chaque lecture : `findMarkers` (carte), `findAll`, `findPaginated` et sa branche Elasticsearch, `findOne` (le créateur voit sa proposition en attente), `getFilters`, `searchRepairers` (wizard, `Dispatch.tsx`), `findNearestRepairer`, la recherche globale de la passerelle (`search/search.service.ts`) et le compteur de l'accueil (`totalRepairers`). L'index `repairers` doit porter le statut. |
| Modification soumise à validation, ancienne version affichée | manque | Une mise à jour écrase la ligne. Il faut une table des révisions en attente (valeurs proposées, auteur, statut) que l'admin applique ou rejette, en voyant l'écart. |
| Modifier (créateur ou admin) | cassé | `POST /v1/repairers/:id` : la passerelle envoie `{ id, ...body }` et le service lit `data.repairer_id` (`backend/repairers-service/src/repairers/repairers.controller.ts:92`), donc `undefined`. La route valide avec `CreateRepairerDto` au lieu de `UpdateRepairerDto`, et `repository.update` n'écrit pas `repairerDevices`. Les tests unitaires mockent les deux côtés et ne le voient pas. Aucun contrôle du créateur (il n'y a pas de colonne). |
| Supprimer | cassé | `POST /v1/repairers/:id/delete` : la passerelle envoie `{ id }`, que le service passe tel quel comme critère. Le document Elasticsearch n'est jamais retiré (`removeRepairer` n'est appelé nulle part). La base supprime en cascade `repairer_devices` et `repairer_reports`. |
| Page « Mes réparateurs » | manque | Pour qu'un créateur suive ses propositions et leur statut, et les modifie. |
| Badge « Démo » | manque | Marqueur et popup de la carte, fiche réparateur. |

Les avis et notes n'existent pas (aucune entité). Ils ne sont pas demandés.

### 4.4 Marquage et purge

| Fonction | État | Ce qu'il faut faire |
|---|---|---|
| Marqueur fictif | manque partout | Sur les données publiques : `device_models`, `devices`, `device_photos`, `device_model_photos`, `repairers` et ses révisions. Posé par le serveur d'après le rôle de l'appelant, jamais envoyé par le client. |
| Auteur | manque | Sur les mêmes tables. Requis pour « modifiable par son créateur ». Déjà présent ailleurs : `ownerships."userId"`, `repair_journeys."userId"`, `repair_records."submittedByUserId"`, `api_tools."submitterUserId"`. |
| Modèle fictif qui devient réel (décision 9) | manque | Un modèle fictif auquel une vraie variante se rattache n'est plus fictif. Se calcule à la purge : « modèle fictif sans vraie variante ». |
| Contagion | manque | **Calculée au moment de la purge**, pas propagée à chaque lien : seules les données publiques ont besoin du marqueur, pour le badge. Les appareils personnels, parcours, relevés et abonnements sont retrouvés par ce vers quoi ils pointent. |
| Route de purge | manque | Une route admin et une permission nouvelle, à semer pour `admin`. Aucune suppression en masse n'existe, ni de suppression douce. |

**Ce que la purge supprime** : les lignes marquées, plus tout ce qui y pointe,
vrais utilisateurs compris (contagion stricte, §2).

**Ordre.** Toutes les tables sont dans la même base `servicehub`, mais aucune
clé étrangère ne relie deux services : l'ordre est à coder. devices-service
refuse de supprimer un modèle encore nommé par un parcours ou un abonnement.

1. Relevés `repair_records` issus des parcours à supprimer, et ceux des
   contributeurs (`submittedByUserId`).
2. Parcours `repair_journeys` : ceux des contributeurs, et ceux qui pointent vers
   un modèle ou une variante fictifs.
3. Abonnements `tutorial_subscriptions` à un modèle ou une variante fictifs (leur
   `userId` n'est jamais rempli).
4. Appareils personnels `ownerships` : ceux des contributeurs, et ceux qui pointent
   vers un modèle ou une variante fictifs.
5. Photos fictives, **fichiers compris** : la cascade de la base ne touche pas au
   stockage.
6. Variantes fictives. Leurs photos et propriétés informatives suivent en
   cascade (migrations). `device_technical_properties` et
   `device_category_device_link` viennent de l'ancien `synchronize` : l'entité
   déclare `CASCADE`, à vérifier en base avec `schema:log` avant de s'y fier.
7. Modèles fictifs restés sans vraie variante.
8. Réparateurs fictifs et leurs révisions, **et leurs documents Elasticsearch**.
9. `refreshModels` sur les modèles réels touchés : variante représentative,
   nombre de variantes, couleurs, catégories. Trou à boucher : il ne retire pas
   les catégories d'un modèle **créé à la main**
   (`backend/devices-service/src/device-models/model-assignment.service.ts:373`).
   Si une variante fictive en a ajouté une à un tel modèle réel, la purge doit
   la retirer elle-même.
10. Réindexation des modèles touchés.
11. Comptes contributeurs (§4.1).

Ce que la purge ne retire pas : les journaux Kibana (chaque parcours,
déclaration ou relevé y est tracé avec l'id de l'utilisateur).

### 4.5 Défauts trouvés en chemin

- **`user.get_all` accordé au rôle `user`** : tout compte pouvait lister tous
  les comptes. Corrigé le 05/11/2026 : seul `admin` la garde (migration
  `RevokeUserGetAllFromNonAdmins`).
- **`device.update` absent du seed**, mais peut-être accordé à `user` en
  production par l'ancien script `deployment/01.URN and import/04_add_permissions.sql`.
  Si c'est le cas, tout utilisateur peut réécrire n'importe quelle fiche Icecat
  par l'API. À vérifier en production, en lecture seule, avec accord.
- N'importe quel utilisateur peut ajouter des photos à n'importe quel modèle,
  sans trace de l'auteur.
- La suppression d'une photo de variante ne vérifie pas que la photo appartient
  à l'appareil de l'URL.
- `POST /v1/repairers/nearest` est capté par `POST /v1/repairers/:id`, déclaré
  avant lui dans la passerelle.
- Un relevé saisi par l'onglet « Submit » du Repair Monitor prend
  `source = ImportedDataset` : il ne se distingue d'un relevé importé que par
  `submittedByUserId`.
- `POST /surveys/:key/response` lit `req.user?.userId` sur une route sans garde :
  l'id vient du client ou reste vide.
- `docs/OPERATIONS.md` dit encore que le seed ne tourne pas au démarrage : il
  tourne à chaque démarrage de user-management, en ajout seulement.

---

## 5. Ce qui n'a pas besoin de saisie

| Donnée | Pourquoi |
|---|---|
| Appareils personnels, parcours | Visibles seulement par leur propriétaire. |
| Repair Monitor | Environ 195 000 relevés importés ; quelques saisies ne bougent pas les graphiques. |
| Fixometer | Facteurs écrits dans le code. |
| Tutoriels iFixit et YouTube, recyclage, assistant | Appels externes ou textes statiques. |
| Pièces détachées | Application externe (MariaDB, Meilisearch), sans saisie depuis le Service Hub. |
| Catalogue d'API | Saisie déjà possible (`SubmitToolPage`), visible après validation admin. |

Ces données n'ont besoin que d'être retrouvées par la purge si un contributeur
en crée (§4.4).

---

## 6. Pièges

- **La saisie fictive se fond dans les vrais modèles.** `createModel`
  (`backend/devices-service/src/device-models/models.service.ts:409`) cherche
  d'abord l'EAN puis la référence, puis insère avec `ON CONFLICT (key)` : un nom
  déjà connu (même clé normalisée) ou un code existant **renvoie le modèle
  réel** au lieu d'en créer un. `CreateDevice.tsx` téléverse alors ses photos
  sur ce modèle réel. Avec la décision du 16/10 (variantes et photos permises
  sur un modèle réel), c'est acceptable à condition que chaque photo et chaque
  variante porte son propre marqueur.
- **EAN commençant par 2.** La copie locale du catalogue de production
  (`servicehub_catalogue`, 1 119 410 entrées) en compte déjà 234, dont 185 en
  `200`. Une collision est improbable mais possible : le serveur doit refuser à
  un contributeur un code déjà présent, plutôt que de renvoyer le modèle réel
  sans rien créer. Même risque, moindre, sur la référence fabricant.
- **Le marquage doit précéder la première saisie.** Une donnée créée avant ne se
  distingue plus ensuite.
- **Permissions : semées en ajout seulement, et lues dans le JWT.** Une
  permission ajoutée au code n'existe en base qu'après redémarrage de
  user-management, et un utilisateur ne la reçoit qu'à sa reconnexion. Retirer
  une permission à un rôle demande une migration ou du SQL.
- **Les contributeurs doivent rester connectés.** Un parcours fait en invité a un
  `userId` vide, et le relevé qui en découle aussi.
- **Les abonnements aux tutoriels envoient de vrais e-mails.** Les contributeurs
  doivent utiliser des boîtes qu'ils contrôlent.
- **Limites de débit** : création de parcours et déclaration d'issue limitées à
  10 par minute et par client, 300 par minute au total.
- **Chantier sur les réparateurs** : les types `reuse` (PBI 13851), non
  commités le 16/10, sont sur `dev` depuis. Le §4.3 touche les mêmes fichiers.

---

## 7. Ordre proposé

1. **Prérequis, avant toute saisie** : rôle contributeur et sa prise en compte
   dans le front, création de compte par l'admin, auteur et marqueur sur les
   tables du catalogue et des réparateurs, règle EAN.
2. **Modèles et variantes** (§4.2).
3. **Réparateurs** (§4.3).
4. **Purge et suppression de compte** (§4.4). Doit exister avant la fin de la
   campagne, pas avant la première saisie.

Les étapes 2 et 3 sont indépendantes une fois la première faite.

---

## 8. Questions ouvertes

Aucune au 26/10. Tranchées par Corentin ce jour-là :

- **Renommer un modèle** vers un nom dont la clé existe déjà : refusé, avec un
  lien vers le modèle existant. Une fusion déplacerait variantes, possessions
  et parcours, et pourrait mêler un modèle fictif à un modèle réel, que la
  purge doit séparer.
- **Clés proposées par catégorie** : la liste de `docs/demo-data-keys.md`,
  calculée sur le dump de production. Une clé portée par la moitié des
  entrées d'une catégorie, 15 au plus ; un socle de 5 clés pour toutes ; les
  catégories sans données n'ont que le socle, sauf la machine à pain. Les
  unités des clés numériques sont établies au début du lot 2, depuis Icecat.
- **Remise des identifiants** : le compte est créé vérifié, avec un mot de passe
  que personne ne connaît, et un e-mail « choisissez votre mot de passe »
  réutilise le parcours de réinitialisation (`/reset-password/:token`).
- **Permissions du contributeur** : celles de `guest`, plus `user.me`,
  `user.update`, `device.create`, `device.photos.upload` et les trois
  permissions de possession (`ownership.*`). Les possessions et le profil ont
  été ajoutés pour ne pas masquer « Mes appareils » et la modification du
  profil, qui répondaient 403 sinon. Ni `user.get_all`, ni `api_catalog.submit`,
  ni `repair.submit`. Les lots 2 et 3 y ajouteront leurs permissions.

---

## 9. Avancement

### Lot 1, prérequis (26/10, `e0386ac`)

- Rôle `contributor` semé au démarrage de user-management, et permission
  `contributor.admin` pour l'admin.
- `POST` et `GET /v1/users/contributors`, page `/app/admin/contributors` (menu
  Admin) : création du compte et e-mail d'invitation en 4 langues.
- Colonnes `created_by` et `is_demo` sur `device_models`, `devices`,
  `device_photos`, `device_model_photos` et `repairers` (deux migrations). La
  passerelle les remplit après validation, d'après la session
  (`src/auth/author.ts`) : un client ne peut pas les envoyer lui-même.
- Règle EAN : pour un contributeur, un EAN commence par 2 (400 sinon), et un
  EAN ou une référence déjà au catalogue est refusé (409) au lieu de renvoyer
  le modèle réel. Le formulaire d'appareil l'indique et le traduit.
- `selectUserType` reste inchangé : il renvoie `null` pour un contributeur, ce
  qui lui donne les entrées « tous » du menu et masque l'onglet de saisie du
  Repair Monitor, auquel il n'a pas droit. À étendre au lot 3, quand des menus
  propres aux contributeurs apparaîtront.
- Vérifié : tests unitaires et couverture des 4 services ; migrations sur la
  base locale (idempotentes, `schema:log` sans écart dû au lot) ; dans le
  navigateur, création d'un compte par l'admin, choix du mot de passe par le
  lien, connexion du contributeur, création d'un modèle marqué (modèle,
  variante et photo avec auteur et `is_demo`), refus d'un EAN hors 2 et d'un
  code connu. Données de test supprimées ensuite.
- Non vérifié : la réception réelle de l'e-mail (pas de relais SMTP en local).
- Relecture indépendante, trois correctifs :
  - `POST /v1/devices` refuse un contributeur (403). Cette route ne vérifiait
    pas l'EAN, et le modèle créé par l'affectation n'était pas marqué. Le
    formulaire passe par `POST /v2/device-models`.
  - `created_by` n'est plus renvoyé par les lectures publiques
    (`select: false`). Croisé avec `user.get_all`, il donnait l'e-mail de
    l'auteur de chaque fiche.
  - Le lien de réinitialisation, donc l'invitation, est vidé une fois le mot de
    passe choisi. Avant, il restait valable indéfiniment.
- Limites connues, laissées en l'état :
  - Un jeton OAuth2 utilisateur d'une application tierce passe par
    `validate_token`, qui ne renseigne pas `req.user` : ce qu'il crée n'a ni
    auteur ni marqueur. Les contributeurs se connectent par le site, pas par une
    application tierce.
  - Si deux envois simultanés portent le même code nouveau, le second reçoit le
    modèle du premier au lieu d'un 409.
  - notifications-service écrit le contenu des e-mails, liens compris, dans
    ses journaux. C'est antérieur au lot.

### Lot 2, modèles et variantes (27/10, `994166f`)

- **Ajouter une variante** depuis la fiche de n'importe quel modèle, réel ou
  fictif (`POST /v2/device-models/:id/variants`, `device.create`) : code-barres
  ou référence, caractéristiques, photos. Pour un contributeur, mêmes règles
  d'EAN qu'au lot 1 ; pour tous, un code déjà au catalogue est refusé (409) avec
  un lien vers son modèle.
- **Caractéristiques** : le formulaire propose les clés de
  `docs/demo-data-keys.md` (socle + catégorie), chacune saisie comme Icecat la
  stocke (nombre dans l'unité de la clé, oui/non en `Y`/`N`, listes de valeurs
  d'Icecat), plus des lignes libres. Le libellé de variante se calcule tout seul.
- **Modifier** un modèle (marque, nom, catégories) ou une variante (codes,
  caractéristiques) : son auteur ou un administrateur, et **seulement ce qui a
  été créé à la main**. Les fiches d'Icecat suivent ses imports : renommer un
  modèle importé le scinderait, ses variantes portant encore l'ancien nom.
  Renommer vers un nom existant est refusé avec un lien vers ce modèle.
- **Photos** : un seul endroit, l'onglet « Photos » de chaque variante. On y
  voit l'image d'Icecat une seule fois (elle existe en quatre tailles, la
  suivante prend le relais si une ne charge pas) ; le titre et la vignette
  disent combien de définitions distinctes elle a, et l'agrandissement permet
  de passer de l'une à l'autre. Puis les photos ajoutées, de
  la variante et du modèle. Tout utilisateur connecté en ajoute depuis cet
  onglet, au modèle : elles apparaissent sous toutes ses variantes. Suppression
  par son auteur ou un administrateur, après confirmation ; même règle pour les
  photos de variante, dont l'appartenance à l'appareil de l'URL est désormais
  vérifiée. L'image d'en-tête se rabat sur les photos du modèle quand celle
  d'Icecat ne charge pas.
- **Badge « Démo »** : cartes de modèle (résultats de recherche), fiche
  modèle, liste et fiche des variantes, photos.
- Une variante saisie à la main reste sous le modèle où elle a été mise :
  l'affectation automatique ne la déplace plus d'après son nom.
- Vérifié : tests unitaires et couverture de devices-service et api-gateway ;
  dans le navigateur, création d'un modèle et de deux variantes par un
  contributeur (caractéristiques stockées au format Icecat, libellés « Black » /
  « White »), modification de la variante, refus d'un nombre invalide, d'un
  code connu et d'un nom pris (avec lien), renommage, ajout et suppression de
  photo, et refus (403) des mêmes modifications pour un autre utilisateur.
  Données de test supprimées ensuite.
- Relecture indépendante : sept défauts trouvés et corrigés, dont la variante
  ajoutée à un modèle importé qui en repartait, le renommage d'un modèle
  importé, et des catégories modifiées que l'affectation rétablissait.

### Lot 3, réparateurs (28/10, `1030882`)

- **Proposer un réparateur** depuis le site (`POST /v1/repairers/proposals`,
  permission `repairer.propose`, donnée à `user`, `repairer`, `contributor` et
  `admin`) : bouton sur la carte et page « Mes réparateurs ». L'adresse se
  cherche avec Photon, comme sur la carte, et place une épingle déplaçable ; on
  peut aussi cliquer sur la carte. La route de géocodage du serveur
  (`/v1/fast-plan-eco/geocode-address`) ne marche pas de bout en bout et n'est
  pas utilisée.
- **Statut** sur `repairers` (`published` par défaut : les imports et les
  54 519 réparateurs existants restent publiés). Une proposition arrive en
  `pending`, sauf celle d'un administrateur, publiée aussitôt. Elle n'entre dans
  Elasticsearch qu'à sa publication. Toutes les lectures publiques ne
  renvoient que les publiés : carte, liste, filtres, wizard, réparateur le plus
  proche, compteur de l'accueil (et la recherche globale, qui ne lit que
  l'index). Une proposition non publiée n'est vue que de son auteur et des
  administrateurs (404 pour les autres).
- **Modification** par son auteur : directe tant que la proposition n'est pas
  publiée (une proposition refusée repart en attente, motif effacé) ; une fois
  publiée, elle devient une révision en attente (`repairer_revisions`, une seule
  par réparateur, la nouvelle remplace l'ancienne) et le public garde
  l'ancienne version. Seuls les champs qui changent sont gardés. Un
  administrateur modifie directement.
- **File de validation** `/app/admin/repairer-proposals` (permission
  `repairer.proposals.admin`) : nouveaux lieux avec lien vers OpenStreetMap,
  modifications en avant / après ; publier ou appliquer, refuser avec un motif
  facultatif montré à l'auteur.
- **Retrait** par l'auteur tant que la proposition n'est pas publiée ; un
  réparateur publié ne se supprime que par un administrateur.
- **Badge « Démo »** : liste et popup de la carte, fiche réparateur, « Mes
  réparateurs », file d'administration. Le menu a désormais des entrées propres
  aux contributeurs (`selectUserType` renvoie `contributor`) ; le Repair Monitor
  leur reste fermé comme avant.
- Réparés en chemin : la suppression (`POST /v1/repairers/:id/delete`) recevait
  `{ id }` comme critère et laissait le document dans Elasticsearch ; la mise à
  jour n'écrivait pas les types d'appareils ; `description` et `postal_code`
  étaient NOT NULL en base ; la recherche libre de `POST /v1/repairers/search`
  échouait depuis le lot 1 (`LOWER()` sur la colonne entière `created_by`).
- Migration `1793193324281-AddRepairerProposals` (repairers-service) ; à
  déployer comme les autres permissions : redémarrer user-management puis la
  passerelle, et les utilisateurs se reconnectent pour recevoir
  `repairer.propose`.
- Vérifié : tests unitaires et couverture de repairers-service, api-gateway et
  user-management ; migration sur la base locale, `schema:log` sans écart ; dans
  le navigateur, un contributeur propose (adresse cherchée, puis épingle posée
  à la main), la proposition est invisible du public (404, absente de la carte
  et de la liste), l'administrateur la publie, elle apparaît sur la carte avec
  le badge ; le contributeur la modifie, l'administrateur voit l'avant / après
  et l'applique ; une seconde proposition est refusée avec un motif, que le
  contributeur voit, puis retire. Ordinateur et mobile. Données de test
  supprimées ensuite.
- Relecture indépendante : aucune fuite d'une proposition non publiée, aucun
  droit de trop ; corrigés ensuite :
  - un administrateur pouvait publier un texte modifié par l'auteur après
    l'ouverture de la file : la file donne une `version` de chaque
    proposition, que la décision doit nommer (409 sinon, et la file se
    recharge) ;
  - revenir à la version publiée laissait la modification précédente en
    attente : elle est maintenant annulée ;
  - deux administrateurs pouvaient décider en même temps : la décision ne
    s'écrit que si la proposition ou la modification est encore en attente, et
    une modification qui échoue à s'appliquer revient dans la file ;
  - formulaire : la carte se recentrait à chaque frappe, des suggestions
    revenaient après un choix, une adresse choisie gardait la ville de la
    précédente ; un site web sans `https://` devenait un lien vers une page du
    Service Hub (le serveur exige maintenant le schéma, le formulaire
    l'ajoute).
- Limites connues, laissées en l'état : `POST /v1/repairers/nearest` reste capté
  par `POST /v1/repairers/:id` et `repairer.find_nearest` n'est semé pour aucun
  rôle (aucun écran ne l'appelle) ; l'importeur n'indexe pas ce qu'il crée ;
  la file d'administration ne nomme pas l'entreprise qui propose, seulement le
  badge « Démo » ; un refus par erreur ne se rattrape pas côté administrateur
  (l'auteur doit modifier pour reproposer) ; aucune limite au nombre de
  propositions par compte.

### Lot 4, purge (29/10, `8dc52c5`)

- **Page** `/app/admin/demo-data` (menu Admin, permission `demo_data.purge`) :
  ce que la purge supprimerait, compté par sorte, avec à part les appareils
  personnels, parcours et relevés de vrais utilisateurs atteints par
  contagion ; puis la purge, confirmée en tapant `PURGE`. Routes
  `GET /v1/admin/demo-data` et `POST /v1/admin/demo-data/purge`.
- **Fiche d'un contributeur** `/app/admin/contributors/:id` (chaque ligne de
  la liste y mène, permission `contributor.admin`) : sa part de ce que la
  purge supprimerait, comptée par les mêmes requêtes restreintes à ce qu'il a
  saisi (`created_by`), plus ses réparateurs par statut et ses modifications
  en attente. Route `GET /v1/admin/demo-data/contributors/:id`. Une ligne qui
  renvoie à deux contributeurs compte dans les deux parts.
- **Questionnaire de satisfaction** : plus posé aux contributeurs
  (`SurveyContext`). Les réponses sont enregistrées sans auteur (défaut du
  §4.5), la purge ne pourrait pas retrouver les leurs.
- **Ordre** (§4.4) : la passerelle demande à user-management les comptes
  contributeurs (identifiants et e-mails), puis :
  1. user-management révoque leurs sessions : ils ne peuvent plus en ouvrir
     pendant la purge (un jeton d'accès déjà émis vit encore au plus une
     heure) ;
  2. devices-service, **en une transaction** : relevés, parcours, abonnements
     (y compris ceux des e-mails des contributeurs) et appareils personnels
     qui renvoient aux contributeurs ou à ce qui part, photos, variantes,
     modèles de démo sans vraie variante ; un modèle de démo qu'une vraie
     variante a rejoint est gardé et devient réel ; les vrais modèles touchés
     sont recalculés (`refreshModels` dans la même transaction). Les tables des
     parcours, relevés, abonnements et possessions sont à d'autres services,
     dans la même base : la transaction les vide toutes, ou aucune. Index des
     modèles et des appareils mis à jour ensuite ;
  3. la passerelle supprime aussitôt les fichiers des photos : les lignes sont
     parties, une seconde purge ne les nommerait plus. Un fichier qui résiste
     est compté, pas bloquant ;
  4. repairers-service : réparateurs de démo (révisions, types et
     signalements suivent en cascade) et leurs documents Elasticsearch ;
  5. user-management : les comptes trouvés au début, pas un de plus, avec leurs
     profils (pas de cascade, la clé est côté `users`) et jetons OAuth.
  Une purge arrêtée sur une erreur (le message nomme l'étape, la page le
  garde affiché) se termine en la relançant.
- **Catégories d'un modèle créé à la main.** Le « trou à boucher » de l'étape 9
  du §4.4 est fermé à la source plutôt que dans la purge : une variante qu'un
  contributeur ajoute à un modèle existant prend les catégories du modèle, que
  ce soit depuis sa fiche ou en retapant son nom (`createModel`). Les retirer à
  la purge aurait enlevé ses propres catégories à un modèle dont les seules
  variantes étaient de démo.
- **Déploiement** : redémarrer user-management (qui sème `demo_data.purge`)
  puis la passerelle ; l'administrateur se reconnecte, sinon la page répond
  403.
- **En production** :
  1. faire une sauvegarde : `docker exec service-hub-db-1 pg_dump -U postgres
     -Fc servicehub > servicehub-avant-purge.dump` (sans `-t`, qui corrompt un
     dump binaire) ;
  2. prévenir les contributeurs que la campagne est close ;
  3. ouvrir la page, relire les nombres, surtout ceux des vrais utilisateurs ;
  4. purger ; la page affiche ce qui a été supprimé.
- Vérifié : tests unitaires et couverture de devices-service, repairers-service,
  user-management et api-gateway ; répétition sur la base locale (copie de la
  production, sauvegardée avant) avec un contributeur, un modèle de démo, une
  variante de démo sur un vrai modèle, un modèle de démo rejoint par une vraie
  variante, des photos, un réparateur, et les possessions, parcours, relevés et
  abonnements d'un vrai utilisateur, d'un invité et du contributeur : aperçu
  exact, puis purge conforme ligne à ligne (le vrai modèle recalculé, le modèle
  adopté devenu réel, les fichiers supprimés, le reste de la base intact).
- Relecture indépendante : aucune suppression de trop ; corrigés ensuite :
  - une erreur après la transaction du catalogue perdait les fichiers des
    photos (et la page n'affichait pas l'erreur) ;
  - le chemin `createModel` laissait une variante de contributeur apporter ses
    catégories à un vrai modèle créé à la main ;
  - les comptes supprimés à la fin étaient relus au lieu d'être ceux du début,
    les sessions restaient ouvertes pendant la purge, et les abonnements d'un
    contributeur à de vrais modèles restaient ;
  - une photo ajoutée pendant la purge perdait sa ligne mais pas son fichier,
    et une vraie variante rattachée pendant la purge aurait perdu son modèle.
- Corrigé pendant les tests, autour de la fiche d'un modèle :
  - ses actions sont regroupées par intention (contribuer, modifier), et le
    bouton « Modifier » n'avait pas de contour ;
  - une erreur du formulaire de variante (EAN manquant) restait hors de
    l'écran : la page remonte au champ ;
  - après « Annuler », le « Retour » suivant ramenait au formulaire : on
    revient d'où on l'avait ouvert ;
  - l'entrée « Données de démonstration » était coupée dans le menu, la
    hauteur du groupe étant figée à son ouverture.
- Limites connues, laissées en l'état :
  - un contributeur au jeton encore valide qui écrit pendant la purge : ses
    lignes de catalogue partent à la purge suivante (repérées par `is_demo`),
    pas ses possessions ou parcours sur de vrais modèles, son compte n'existant
    plus ;
  - un document Elasticsearch que la purge n'a pas pu retirer y reste : la
    synchronisation des réparateurs et des appareils n'en retire jamais ;
  - ce que la purge ne retire pas : les journaux Kibana, et la table
    `device_embeddings` (héritée, sans code), où une variante de démo n'entre
    jamais.

### Lot 5, confort de saisie et suivi (29/10)

Points 1 à 7 de la relecture du 29/10 (le 8, une limite de propositions par
compte, écarté : l'équipe sait à qui elle donne les accès).

- **Mes contributions** `/app/my-contributions`, pour tout utilisateur connecté
  (menu Outils) : les modèles et les variantes qu'il a saisis, les plus récents
  d'abord, 20 par 20 (`GET /v1/contributions/mine`, permission `user.me`). Les
  réparateurs restent dans « Mes réparateurs ».
- **Fiche d'un contributeur** : ses saisies, modèles, variantes et réparateurs
  avec leur statut (`GET /v1/admin/demo-data/contributors/:id/entries`), et la
  langue de ses e-mails.
- **Guide du contributeur** en tête de son accueil : ce qu'on attend, l'EAN en 2,
  les photos (les siennes ou sous licence libre : tout est public jusqu'à la
  purge), les e-mails réels des abonnements, la purge en fin de campagne.
- **Générer un EAN** : bouton du champ code-barres, contributeurs seulement
  (création et variante) ; un EAN-13 en 2 avec sa clé de contrôle. Déjà au
  catalogue, le serveur le refuse comme avant (409).
- **File des propositions** : l'auteur de chaque élément (lien vers sa fiche
  pour un contributeur), sélection et publication groupée (une décision par
  élément, chacune avec sa version : un élément modifié entre-temps est écarté
  et la file se recharge), et le nombre en attente dans le menu Admin.
- **Rattraper un refus** : les 50 derniers refus restent dans la file,
  « Publier quand même » ou « Appliquer quand même », après confirmation. Une modification refusée
  ne s'applique plus si son auteur en a envoyé une depuis (409).
- **E-mail à l'auteur** à chaque décision (publié, refusé avec le motif,
  modification appliquée ou refusée), envoyé par user-management dans la langue
  du compte. Elle est désormais enregistrée (`user_profiles.language`) : choisie
  à la création d'un contributeur (le sélecteur existant, renommé « Langue de
  ses e-mails »), prise du navigateur à l'inscription pour les autres comptes ;
  anglais sinon, dont les comptes déjà là. Un administrateur n'est pas prévenu
  de ses propres décisions ; un e-mail qui échoue n'annule pas la décision.
- **Migrations** : `AddProfileLanguage` (user-management), et
  `AddAuthorIndexes` (devices-service), index partiels sur `created_by` de
  `devices` et `device_models` : sans eux, chaque page de contributions lirait
  les 1,1 M variantes. Leur construction lit la table une fois, quelques
  secondes pendant lesquelles les écritures attendent.
- **Déploiement** : les deux migrations (le workflow les applique), puis
  redémarrer user-management et la passerelle comme d'habitude. Aucune
  permission nouvelle.
- Vérifié : tests unitaires et couverture de user-management, repairers-service,
  devices-service et api-gateway ; les deux migrations sur la base locale
  (relancées sans effet, `schema:log` sans écart dû au lot) ; dans le
  navigateur, avec un contributeur jetable en français et un administrateur
  jetable : guide sur l'accueil du seul contributeur, « Générer » dans les deux
  formulaires, modèle et variante retrouvés dans « Mes contributions » (vide
  pour l'administrateur) ; trois propositions, le compteur du menu, l'auteur
  dans la file, un refus puis « Publier quand même », deux publications
  groupées sans toucher aux propositions des autres, une modification refusée
  puis « Appliquer quand même » ; chaque e-mail en français dans les journaux
  de notifications-service, motif échappé ; fiche du contributeur et ses trois
  listes ; ordinateur et mobile, clair et sombre. Données de test supprimées
  ensuite. Non vérifié : la réception réelle des e-mails (pas de relais SMTP
  en local).
- Relecture indépendante : aucune fuite (auteurs et e-mails réservés aux routes
  d'administration, e-mails échappés), destinataire et type de chaque e-mail
  justes ; corrigés ensuite :
  - « Appliquer quand même » répondait presque toujours 409 : la date de la
    modification, relue en JavaScript sans ses microsecondes, la faisait plus
    récente qu'elle-même ; comparé désormais dans la base ;
  - un auteur qui corrigeait sa proposition pendant qu'un administrateur la
    publiait quand même la remettait en attente en la laissant sur la carte ;
    la remise en attente n'a lieu que si elle est encore refusée (409 sinon) ;
  - un `$` dans le nom d'un réparateur brouillait l'e-mail ; une variante sans
    modèle menait au mauvais modèle ; « Afficher plus » pouvait répéter une
    ligne ; une publication groupée qui échouait vidait la sélection.
- Retouches après test : les badges « Démo » et d'activité alignés sur la
  fiche d'un réparateur ; le formulaire de proposition marque en rouge les
  champs obligatoires manquants, et la carte sans épingle, à l'envoi, et
  remonte au premier ; « Une modification attend d'être validée » ne parle
  plus de la carte.
- Limites connues, laissées en l'état : après un « Appliquer quand même » qui
  échoue, la modification redevient refusée mais au nom du dernier
  administrateur ; une modification refusée redevient applicable si son auteur
  en a envoyé une autre puis est revenu à la version publiée.
