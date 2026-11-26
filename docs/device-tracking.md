# Suivi des appareils (Device Passport) — plan

Proposition rédigée le 16/10/2026 à partir du livrable **D1.5.6 Integration
device tracking** (Thomas More Mechelen-Antwerpen, période 5) et d'une lecture
du code. **Ce plan n'est pas validé** et rien n'est commencé : aucune ligne de
code, aucune migration, aucun PBI.

Les décisions déjà prises sont au §2.1. Les choix du §2.2 sont des valeurs par
défaut qui restent à confirmer.

Lire d'abord `CLAUDE.md` (conventions, pièges qui échouent en silence),
`docs/OPERATIONS.md` (permissions, déploiement) et `docs/migrations.md`.

---

## 1. Origine et périmètre

### 1.1 Ce que demande la spec

Le D1.5.6 met en œuvre le cas d'usage **UC_RPS_4 — Tracking
Devices/Parts/Tools** (D1.2.2). Il décrit un « Device Passport » inspiré du
Car-Pass belge. Il vise les centres de reconditionnement, les ateliers de
réparation et les ressourceries :

1. un module **Device Tracking** avec deux entrées, « Enregistrer un appareil »
   et « Retrouver un appareil » ;
2. **l'enregistrement** : une photo, l'IA identifie la marque et le modèle, et
   à défaut on les saisit à la main. Le système génère ensuite un
   **identifiant unique** ;
3. **l'étiquette** : identifiant, marque, modèle et QR, imprimée sur une
   imprimante Wi-Fi ;
4. **la recherche** : par scan de l'étiquette ou par recherche libre (code,
   marque, modèle) ;
5. **l'historique** : à chaque intervention, le type et la date, plus en
   option des notes, les pièces changées et leur référence, le coût, des photos
   et documents, et des remarques d'entretien ;
6. **plus tard** : le propriétaire final consulte le passeport, selon les
   droits que l'organisation lui accorde.

Le schéma « Device Tracking Workflow » de la spec ajoute plusieurs éléments :

- les **types d'événements** : Repair, Part Replaced, Maintenance, Issue,
  Inspection, Software Update, Other ;
- une **source** pour chaque entrée : *Verified* (saisie par un professionnel)
  ou *User-Reported* (saisie par le propriétaire) ;
- un **rapport d'appareil** avec les onglets Overview, Timeline, Details et
  Attachments ;
- l'export et le partage du rapport en lecture seule.

La spec précise que ce système n'est pas le passeport produit européen (DPP).

### 1.2 Écarts assumés par rapport à la spec

| Spec | Ce plan |
|---|---|
| Organisations seulement | **Particuliers et organisations** : chacun a son espace |
| Étiquette imprimée à l'enregistrement | **Pas d'impression.** L'identifiant unique est figé, pour pouvoir coller une étiquette plus tard |
| Scan de l'étiquette | Reporté avec les étiquettes |
| — | **Séparé du parcours de réparation** et des statistiques du Repair Monitor (CO₂ compris) |

### 1.3 v1 et plus tard

| v1 | Plus tard |
|---|---|
| Espace personnel et espace organisation | Étiquettes : QR, impression, scan de l'identifiant |
| Enregistrement : photo IA, catalogue ou saisie manuelle, puis identifiant | Rapport partagé en lecture seule, export PDF |
| Liste et recherche libre | Statistiques et reporting (pièces les plus remplacées, types fréquents, période au choix) |
| Fiche appareil : vue d'ensemble, timeline, détails, pièces jointes | Lien vers le catalogue de pièces détachées |
| Événements : type, date, pièces, coût, durée, notes, photos et PDF | Plusieurs organisations par utilisateur |
| Suivi du statut, timeline, tableau de bord | Seuils « à traiter » réglables |
| Organisations, invitations par e-mail, gestion des membres | |
| Transfert d'un appareil entre espaces | |

---

## 2. Décisions

### 2.1 Prises le 16/10/2026

| Sujet | Décision |
|---|---|
| Appareils personnels existants (`ownerships`, onglet « Mes appareils ») | **Fusion.** Ils deviennent des passeports. Il n'y a qu'un seul concept d'appareil physique. |
| Entrée dans une organisation | **Invitation par e-mail.** L'invité accepte depuis un lien. |
| Transfert d'un appareil | **En v1.** |
| Format de l'identifiant | **Préfixe + aléatoire** : `VITES-7K3F9Q` pour une organisation, `SH-7K3F9Q` pour un particulier |
| Temps passé | **Durée facultative en minutes** sur chaque intervention, et temps passé affiché au tableau de bord de l'organisation |

### 2.2 Choix par défaut, à confirmer

| Sujet | Proposition |
|---|---|
| Types d'événements | Liste fixe : Inspection / diagnostic, Réparation, Remplacement de pièce, Entretien / nettoyage, Mise à jour logicielle, Mise à niveau, Problème constaté, Contrôle qualité, Préparation à la revente, Autre. S'ajoutent des types système automatiques : enregistrement, changement de statut, transfert. |
| Un ou plusieurs types par événement | **Un seul.** La maquette « Actions Performed » propose une sélection multiple. Un type unique donne une icône par entrée et simplifie les filtres ; plusieurs actions se saisissent en plusieurs événements. |
| Statuts | Reçu, En service, En panne, En réparation, Prêt à la vente, Sorti (vendu ou donné hors Service Hub), Recyclé (§6.5) |
| Date d'achat | Elle reste dans `acquiredAt`, au mois près, comme aujourd'hui. Il n'y a pas d'événement « Acquisition ». |
| Notes | Les « notes » et les « remarques d'entretien » de la spec sont réunies dans un seul champ. |
| Modifier un événement | Son auteur, et le responsable de l'organisation pour les événements de l'organisation, peuvent le modifier ou le supprimer. La mention « modifié » reste visible. Les événements d'un ancien détenteur sont en lecture seule. |
| Après un transfert | **Le nouveau détenteur voit** le type, la date, la description, les pièces et les photos de tous les événements. **Les coûts, les notes, les durées et les PDF** restent visibles seulement par l'espace qui les a saisis. **L'ancien détenteur perd tout accès.** |
| Appartenance | **Une organisation par utilisateur en v1**, en plus de son espace personnel. |
| Admin Service Hub | Il crée les organisations, mais son rôle ne lui donne **aucun accès** aux appareils des particuliers ni à ceux des organisations. |
| Coûts | En euros, visibles seulement dans l'espace qui les a saisis. |
| Pièces jointes | Photos (jpeg, png, webp) et PDF, 10 Mo chacune, 10 par événement. Elles sont **privées** : servies uniquement après vérification des droits. |
| Expiration des liens | Invitation : 7 jours. Transfert : 14 jours. |
| Seuil « à traiter » | 14 jours dans le même statut, fixe en v1 |
| Suppression d'un appareil | C'est un **archivage** : l'historique est conservé. |
| Repair Monitor | Rien de ce module n'entre dans ses statistiques ni dans le CO₂. |

---

## 3. Ce qui existe et ce qu'on réutilise

| Brique | Où | Usage ici |
|---|---|---|
| Appareils personnels | `ownerships` (`backend/ownership-service/src/ownership/ownership.entity.ts`), routes `/v2/personal-devices` | La table est étendue (§4.1) ; les routes existantes restent en place |
| Identification par photo | `POST /v1/identification/analyze`, `PhotoIdentification.tsx` | Réutilisés tels quels. Le composant expose déjà `onDeviceSelected`, `onCreateNewDevice`, `onRefineSearch` et `onBack`. Il n'y a pas de score de confiance : la saisie manuelle prend le relais quand rien n'est reconnu. |
| Saisie manuelle | `ManualDeviceEntry.tsx`, `POST /v2/device-models` (modèle manuel) | Un appareil inconnu du catalogue crée un modèle manuel, comme le fait déjà le parcours de réparation |
| Recherche dans le catalogue | `GET /v2/device-models`, `SearchFilters.tsx` | Étape « Identifier » de l'enregistrement |
| Stockage de fichiers | `api-gateway/src/storage/` (local ou S3) | Il faut ajouter une lecture `getFile(key)`, car les URL actuelles sont publiques (§6.10) |
| E-mails | cmd `send_email` de `notifications-service`, modèles en 4 langues dans `user-management` (`sendConfirmationEmail`) | Invitations et transferts |
| Rôles et permissions | `user-management/src/roles/role-seeder.service.ts` | Deux nouvelles permissions (§5) |
| Graphiques | chart.js et react-chartjs-2 (`components/RepairMonitor/OutcomeDonutChart.tsx`…) | Tableau de bord |
| Timeline | `Timeline` de `@mantine/core` 7.17, déjà installé | Onglet Timeline |
| Sélecteurs mois et année | `EditPersonalDevice` dans `UserDevices.tsx` | À extraire en `MonthYearSelect` pour la date d'achat |
| Plus tard | `qrcode.react`, `BarcodeScanner.tsx` | Étiquettes. Le scanner ne lit que les codes 1D : il faudra ajouter `QRCode` à ses formats. |

Ce qui **n'existe pas** : les organisations et leurs membres, les événements
d'un appareil, l'identifiant unique, les pièces jointes privées.
`repairer_profiles` est lié à un seul utilisateur et le rôle `repairer` se
choisit librement à l'inscription. Aucun des deux ne peut servir
d'organisation.

---

## 4. Modèle de données

Les organisations sont dans `user-management`, avec les utilisateurs. Le reste
est dans `ownership-service`, qui gère déjà les appareils physiques : c'est ce
qui évite d'ajouter un 14ᵉ service (CI, compose, déploiement).

Comme ailleurs dans le projet, il n'y a pas de clé étrangère d'un service à
l'autre.

### 4.1 `ownerships` — étendue

| Colonne | Type | Note |
|---|---|---|
| `code` | varchar(16), unique, not null | **Nouvelle.** Remplie par la migration pour les lignes existantes (`SH-…`), puis générée à **chaque** création, y compris par les chemins actuels : fiche modèle, fin du parcours de réparation |
| `userId` | int, **désormais nullable** | Détenteur particulier |
| `organizationId` | uuid, nullable | **Nouvelle.** Détenteur organisation. Contrainte `CHECK` : exactement un des deux est rempli. |
| `serialNumber` | varchar(100), nullable | **Nouvelle** |
| `status` | enum, not null | **Nouvelle.** `in_use` par défaut pour un particulier, `received` pour une organisation |
| `statusChangedAt` | timestamptz, not null | **Nouvelle.** Sert à afficher « depuis X jours » sans relire l'historique |
| `registeredByUserId` | int, nullable | **Nouvelle.** Le membre qui l'a enregistré |
| `createdAt` | timestamptz, default `now()` | **Nouvelle.** Vaut la date de migration pour l'existant |
| `archivedAt` | timestamptz, nullable | **Nouvelle** |
| `modelId`, `deviceId`, `nickname`, `visualCondition`, `usageIntensity`, `acquiredAt` | — | Inchangées |

**Limite connue :** `acquiredAt` prend la date d'ajout quand l'utilisateur
n'a rien saisi. Pour les appareils existants, on ne peut donc pas distinguer
« acheté ce mois-là » de « date inconnue ».

### 4.2 Nouvelles tables de `ownership-service`

**`device_events`**

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `ownershipId` | uuid FK → `ownerships` | |
| `type` | enum | Types d'intervention (§2.2), plus les types système `registered`, `status_changed`, `transferred` |
| `occurredAt` | date | Jamais dans le futur, avec une tolérance d'un jour (« aujourd'hui » est calculé en UTC côté serveur) |
| `description` | varchar(255), nullable | Titre de l'entrée (« Écran remplacé ») |
| `notes` | text, nullable | |
| `cost` | numeric(10,2), nullable | En euros |
| `durationMinutes` | int, nullable | De 1 à 10 000 |
| `data` | jsonb, nullable | Types système uniquement : `{from, to}` pour un statut, détenteurs d'origine et d'arrivée pour un transfert |
| `source` | enum `verified` / `user_reported` / `system` | **Déduite par le serveur**, jamais envoyée par le client |
| `authorUserId` | int | |
| `authorOrganizationId` | uuid, nullable | Fixé à la création. C'est lui qui décide de la visibilité après un transfert. |
| `createdAt`, `updatedAt` | timestamptz | `updatedAt` différent de `createdAt` affiche la mention « modifié » |

Index sur `(ownershipId, occurredAt DESC, createdAt DESC)`.

**`device_event_parts`** : `id`, `eventId` (FK, suppression en cascade),
`name` (varchar(255), requis), `partNumber` (varchar(100), nullable),
`condition` (`new` / `reused` / `refurbished`, nullable).

**`device_attachments`** : `id` uuid, `ownershipId` (FK), `eventId` (FK,
nullable), `storageKey`, `mimeType`, `kind` (`photo` / `document`),
`originalName`, `sizeBytes`, `uploadedByUserId`, `authorOrganizationId`,
`createdAt`.

**`device_transfers`**

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `ownershipId` | uuid FK | Un seul transfert `pending` à la fois par appareil (index unique partiel) |
| `fromUserId`, `fromOrganizationId` | int / uuid, nullable | Le détenteur d'origine |
| `toEmail` | varchar(255) | |
| `tokenHash` | char(64) | SHA-256 du jeton envoyé par e-mail. Le jeton lui-même n'est jamais stocké. |
| `status` | enum `pending` / `accepted` / `declined` / `cancelled` | L'expiration n'est pas un statut : elle se déduit de `expiresAt` |
| `expiresAt` | timestamptz | Création + 14 jours |
| `createdByUserId`, `acceptedByUserId` | int | |
| `acceptedIntoOrganizationId` | uuid, nullable | Si l'appareil est accepté dans l'espace d'une organisation |
| `createdAt`, `resolvedAt` | timestamptz | |

### 4.3 Nouvelles tables de `user-management`

| Table | Colonnes |
|---|---|
| `organizations` | `id` uuid, `name` varchar(255), `code` varchar(6), unique, `[A-Z0-9]{2,6}`, `SH` réservé, `createdAt` |
| `organization_members` | `id`, `organizationId` (FK), `userId` (FK `users`, **unique** : une organisation par utilisateur en v1), `role` (`manager` / `member`), `createdAt` |
| `organization_invitations` | `id`, `organizationId`, `email`, `role`, `tokenHash`, `status` (`pending` / `accepted` / `declined` / `cancelled`), `expiresAt` (7 jours), `invitedByUserId`, `createdAt`, `resolvedAt` |

### 4.4 L'identifiant

- **Format** :
  - `{PRÉFIXE}-{6 caractères}`, où le préfixe est le `code` de l'organisation,
    ou `SH` pour un particulier ;
  - les caractères sont pris dans l'alphabet de Crockford (base 32, sans `I`,
    `L`, `O`, `U`), ce qui évite de confondre 0 et O, ou 1, I et L ;
  - cela donne 32⁶, soit environ un milliard de combinaisons par préfixe.
- **Génération** : par le serveur seul. En cas de collision sur l'index
  unique, on fait un nouveau tirage, jusqu'à 5 fois.
- **L'identifiant est figé à vie.** Il ne change ni après un transfert, ni
  après une correction du modèle. Le préfixe désigne **qui l'a émis**, pas le
  détenteur actuel, comme le code constructeur d'un numéro de châssis.
- **Saisie** : la recherche ignore la casse et les tirets, et lit `O` comme
  `0` et `I` ou `L` comme `1`.

### 4.5 Migrations

- Elles portent sur `ownership-service` et `user-management`. Le nom suit le
  format `<epoch-ms>-PascalCase.ts`.
- **Lancer `schema:log` avant**, parce que certaines entités sont héritées de
  `synchronize: true` et n'ont jamais eu de migration.
- Le remplissage de `code` pour les lignes existantes se fait en TypeScript
  dans la migration : on génère les codes, puis on vérifie leur unicité.

---

## 5. Règles d'accès

**Permissions** (seed `role-seeder.service.ts`) :

| Permission | Rôles | Couvre |
|---|---|---|
| `tracking.use` | `user`, donc aussi `repairer` et `admin` | Toutes les routes `tracking/*`, `organizations/*`, `invitations/*` |
| `organization.admin` | `admin` | `admin/organizations` |

Le seed ne fait qu'ajouter. Après un déploiement, il faut redémarrer
`user-management` puis la gateway, et **les utilisateurs doivent se
reconnecter** pour recevoir la nouvelle permission (`docs/OPERATIONS.md` §
Permissions).

**Droits par ligne.** `PermissionsGuard` ne vérifie pas à qui appartient une
ligne, donc les règles suivantes s'ajoutent à la permission :

- L'utilisateur est lu avec `signedInUserId(req)`, qui gère `id` pour le JWT
  de l'application et `sub` pour OAuth2. Ne lire que l'un des deux ferait
  passer tout le monde pour un invité, sans erreur.
- À chaque appel, la gateway demande à `user-management` l'organisation et le
  rôle de l'utilisateur. Elle transmet `{userId, organizationId, orgRole}` à
  `ownership-service`, qui **filtre toutes ses requêtes** avec ces valeurs.
- Un appareil inexistant et un appareil inaccessible renvoient la même 404.
  On ne révèle pas qu'un code existe.

| Qui | Peut |
|---|---|
| Particulier | Tout faire sur les appareils dont il est détenteur |
| Membre d'une organisation | Tout faire sur les appareils de l'organisation, sauf modifier ou supprimer les événements des autres |
| Responsable | Comme un membre, plus modifier ou supprimer tout événement de l'organisation, et gérer les membres et les invitations |
| Admin Service Hub | Créer des organisations et inviter leur premier responsable. **Aucun accès aux appareils** au titre de ce rôle |
| Nouveau détenteur après un transfert | Voir tout l'historique, sauf les coûts, notes, durées et PDF des autres espaces. Il ne peut pas modifier les événements d'avant le transfert |
| Ancien détenteur | Plus rien |

---

## 6. Fonctionnalités

### 6.1 Enregistrer un appareil — `/app/tracking/new`

1. **Espace** : celui du sélecteur (Personnel ou l'organisation), modifiable
   ici.
2. **Identifier l'appareil**, au choix :
   - **photo** avec `PhotoIdentification` ;
   - **recherche dans le catalogue** ;
   - **saisie manuelle** avec `ManualDeviceEntry`, qui crée un modèle manuel.

   Tous les passeports pointent ainsi vers un modèle du catalogue, et la
   marque, le modèle et la catégorie ne sont pas recopiés.
3. **Compléter** (tout est facultatif) :
   - nom ;
   - n° de série ;
   - date d'achat, mois et année ;
   - variante, s'il y en a plusieurs ;
   - état visuel et intensité d'usage.
4. **Confirmation**, comme l'étape « Device Record Created » du prototype :
   - l'identifiant s'affiche en grand, avec un bouton pour le copier ;
   - deux boutons : « Ajouter un premier événement » et « Voir la fiche » ;
   - **la photo d'identification est envoyée à nouveau** depuis le navigateur
     pour devenir la première pièce jointe (cela dépend du lot 3).

Le serveur crée l'événement système `registered`.

### 6.2 Retrouver un appareil — `/app/tracking/devices`

- **Recherche libre** : `ILIKE` sur le code, la marque, le modèle, le nom et le
  n° de série, toujours limitée à l'espace courant. Un code exact ouvre
  directement la fiche. Elasticsearch n'est pas nécessaire : la maquette
  montre 6 057 appareils pour une organisation, et une requête Postgres avec
  index suffit à ce volume.
- **Filtres** : statut, actifs ou inactifs, marque.
- **Colonnes** : Code, Appareil, Statut, Depuis, Dernière intervention, Nombre
  d'interventions.
- **Pagination** côté serveur, 10, 25 ou 50 par page, comme la liste « My
  Devices » de la maquette.
- Le **scan** de l'identifiant viendra avec les étiquettes.

### 6.3 Fiche appareil — `/app/tracking/devices/:code`

Quatre onglets, comme le « Device Report » du prototype.

**Vue d'ensemble**
- Photo, nom, marque, modèle, identifiant.
- Statut et durée dans ce statut (« En réparation depuis 6 jours »).
- Indicateurs : date d'enregistrement, date d'achat, nombre d'interventions,
  dernière intervention, pièces remplacées, **temps passé** et **coût total**.
  Les deux derniers ne comptent que ce que l'espace courant a saisi.
- Les 5 dernières entrées de la timeline, avec « Voir tout l'historique ».
- Lien « N parcours de réparation → Mes réparations », si le parcours de
  réparation en a rattaché.
- Actions : Ajouter un événement, Changer le statut, Transférer, Modifier,
  Archiver.

**Timeline** : décrite au §6.6.

**Détails**
- Identité : marque, modèle, variante, catégorie (le libellé `name`, traduit),
  n° de série, date d'achat, état, usage.
- Lien vers la fiche du modèle dans le catalogue.
- Identifiant, auteur et date de l'enregistrement, détenteur actuel.

**Pièces jointes**
- Galerie des photos et liste des PDF, filtrables par événement.

### 6.4 Ajouter un événement

Il s'ouvre dans une fenêtre sur la fiche, en plein écran sur un téléphone.

| Champ | Contrôle | Règle |
|---|---|---|
| Type | `Select` avec icônes | Requis |
| Date | `TextInput type="date"` | Requise, aujourd'hui par défaut, `max` = aujourd'hui |
| Description | `TextInput` | 255 caractères au plus |
| Pièces changées | Lignes répétables : nom, référence, état neuve / réemployée / reconditionnée | Le nom est requis sur chaque ligne |
| Coût (€) | `NumberInput` | ≥ 0 |
| Durée | `NumberInput`, en minutes, affichée « 1 h 15 » | De 1 à 10 000 |
| Notes | `Textarea` | |
| Pièces jointes | Photos et PDF | 10 au plus |
| Après cette intervention, passer en | `Select` de statut | Facultatif. Crée aussi l'événement `status_changed` |

La confirmation « Événement enregistré » ramène à la timeline. Ce sont les
étapes 3 à 6 du prototype.

`@mantine/dates` n'est pas installé, d'où le champ de date natif. Une date sans
heure s'affiche avec `timeZone: "UTC"` : sinon, à l'ouest de Greenwich, elle
apparaît au jour précédent.

### 6.5 Le suivi : statut et durées

| Statut | Par défaut pour | Sens |
|---|---|---|
| `received` Reçu | une organisation | L'appareil vient d'entrer |
| `in_use` En service | un particulier | Il est utilisé |
| `broken` En panne | | Un problème est constaté |
| `in_repair` En réparation | | Une intervention est en cours |
| `ready_for_sale` Prêt à la vente | | Contrôlé et préparé |
| `left` Sorti | | Vendu ou donné hors Service Hub |
| `recycled` Recyclé | | Fin de vie |

- `left` et `recycled` rendent l'appareil **inactif**. Il reste consultable et
  disparaît du filtre « actifs ».
- **Chaque changement de statut** crée un événement système `status_changed`
  et met à jour `statusChangedAt`. C'est ce qui rend mesurable ce que la spec
  reproche aux outils actuels de ne pas savoir : le temps passé entre la
  réception et la mise en vente.
- Après un transfert, l'appareil repart du statut par défaut de l'espace qui
  le reçoit.

### 6.6 La timeline

**Contenu**, du plus récent au plus ancien :

| Entrée | Origine |
|---|---|
| Interventions | Formulaire d'événement |
| Changement de statut | Automatique |
| Transfert (« Transféré de VITES à Marie D. ») | Automatique |
| Enregistrement dans le Service Hub | Automatique, à la création |
| Achat (`acquiredAt`) | Calculé, toujours en dernier ; ce n'est pas une ligne en base |

**Une entrée affiche**, comme le panneau « Timeline » du prototype :
- la date, avec une icône et une couleur par type ;
- un titre : la description, ou à défaut le libellé du type ;
- une sous-ligne : type, badge **Vérifié** ou **Déclaré**, coût, durée ;
- les pièces sous forme de pastilles (« Écran (OEM) · neuve ») ;
- les miniatures des photos et une icône pour chaque PDF ;
- l'auteur (« Thomas · VITES ») et la mention « modifié » s'il y a lieu.

Un toucher ouvre le **détail** dans un panneau latéral : notes complètes,
pièces jointes en grand, et les boutons Modifier ou Supprimer quand
l'utilisateur en a le droit.

**Comportement :**
- Le tri se fait sur `occurredAt`, puis sur `createdAt`. Un événement saisi
  après coup trouve sa place.
- Les entrées sont regroupées par année quand l'historique est long, et
  chargées par paquets de 20 (« Charger plus »).
- Filtres par type et par source.
- **Le serveur** retire les coûts, notes, durées et PDF saisis par un autre
  espace. Le navigateur ne les reçoit jamais.

### 6.7 Tableau de bord — `/app/tracking`

Il suit l'espace choisi dans le sélecteur.

**Espace personnel**
- Boutons **Enregistrer un appareil** et **Retrouver un appareil**, comme la
  carte « Device Tracking » de la maquette.
- **Transferts à accepter** en tête s'il y en a, puis les transferts envoyés
  encore en attente.
- Nombre d'appareils, et ceux qui sont « En panne » ou « En réparation ».
- Les 5 dernières interventions, tous appareils confondus.

**Espace organisation**

| Bloc | Contenu |
|---|---|
| Chiffres clés, 30 derniers jours | Appareils actifs · reçus · sortis · interventions · **temps passé** (somme de `durationMinutes`) · coût saisi |
| Répartition par statut | Graphique en anneau, sur le modèle d'`OutcomeDonutChart`. Un clic ouvre la liste filtrée sur ce statut. |
| Délai moyen jusqu'à la vente | Sur 90 jours : de l'enregistrement au premier passage en « Prêt à la vente » |
| À traiter | Appareils en Reçu, En panne, En réparation ou Prêt à la vente depuis plus de 14 jours, du plus ancien au plus récent |
| Activité récente | Les 10 derniers événements : appareil, type, auteur, date |
| En attente | Transferts envoyés et invitations non acceptées |

Tout est calculé en une seule route, par des agrégats SQL dans
`ownership-service`.

### 6.8 Organisations et invitations

1. **L'admin Service Hub** crée l'organisation (nom, sigle) et invite son
   premier responsable (`/app/admin/organizations`).
2. **Le responsable** saisit un e-mail et un rôle. Un e-mail part dans la
   langue de l'interface, avec un lien vers
   `/app/tracking/invitation#<jeton>`.
   - Le jeton est dans le `#` de l'URL : il n'est donc jamais envoyé au
     serveur dans l'adresse, comme pour `MobilePhotoHandoff`.
   - Les appels à l'API le transportent dans le corps de la requête.
3. **L'invité** se connecte ou crée son compte, voit le nom de l'organisation,
   puis accepte ou refuse.
   - **L'acceptation exige que l'e-mail du compte connecté soit celui de
     l'invitation.** Un lien transféré à quelqu'un d'autre ne sert donc à
     rien.
   - Une personne déjà membre d'une autre organisation ne peut pas accepter
     (v1).
4. **La page Membres** (`/app/tracking/organization`) liste :
   - les membres : changer le rôle, retirer ;
   - les invitations en attente : renvoyer, annuler, **copier le lien**.

   Copier le lien sert de secours quand l'e-mail n'arrive pas, et c'est sans
   risque grâce à la vérification de l'e-mail.
5. **L'en-tête** affiche le nom de l'organisation pour ses membres, comme sur
   la maquette.

### 6.9 Transfert

1. Sur la fiche, **« Transférer »** demande l'e-mail du destinataire.
   L'appareil affiche alors « Transfert en attente », et le transfert reste
   annulable.
2. Le destinataire reçoit un lien vers `/app/tracking/transfer#<jeton>`, avec
   la même règle de jeton et d'e-mail qu'au §6.8. Il voit l'appareil et un
   aperçu de l'historique.
3. Il **accepte**, dans son espace personnel ou dans celui de son organisation
   s'il en est membre, ou il **refuse**.
4. À l'acceptation, **en une seule transaction** :
   - le détenteur change ;
   - le statut repasse au défaut de l'espace qui reçoit ;
   - un événement `transferred` s'ajoute ;
   - le transfert passe à `accepted`.

Les quatre sens fonctionnent avec le même mécanisme :
- organisation → particulier : la revente ;
- particulier → organisation : un don à un centre de réemploi ;
- particulier → particulier ;
- organisation → organisation.

La visibilité après transfert suit le §5.

### 6.10 Pièces jointes privées

- Les fichiers ne passent **pas** par `/api/uploads`, qui est public. Ils sont
  servis par `GET tracking/attachments/:id` après vérification des droits : une
  facture ou un n° de série ne doit pas être lisible par une simple URL.
- Il faut ajouter `getFile(key)` au `StorageService`, en local et sur S3, et
  une liste de types autorisés pour les PDF dans `common/upload.constraints.ts`.
- Les miniatures sont les mêmes fichiers, réduits par le navigateur. Pas de
  traitement d'image côté serveur en v1.

### 6.11 Ce que devient l'existant

| Élément | Devenir |
|---|---|
| Routes `/v2/personal-devices` et commandes TCP `*_personal_device` | Conservées : le parcours de réparation s'en sert. Elles ne listent que les appareils où `userId` est rempli et qui ne sont pas archivés. `create_personal_device` génère désormais le code. |
| Suppression d'un appareil par l'utilisateur | Nouvelle commande `archive_personal_device`. `delete_personal_device` reste réservé à l'annulation dans le parcours de réparation. |
| Onglet « Mes appareils » de la Device Library | Renvoie vers `/app/tracking/devices` |
| `UserDevices.tsx` | Retiré quand la nouvelle liste sait faire tout ce qu'il fait (nom, état, usage, date, variante, archivage) |
| « Ajouter à mes appareils » (fiche modèle), `JourneyDevicePrompt`, « Mes réparations » | Continuent de créer des appareils, qui reçoivent maintenant un code. Les liens « Voir mes appareils » pointent vers le nouveau module. |
| Parcours de réparation | Toujours liés par `ownershipId`. Ils n'entrent pas dans la timeline ; la vue d'ensemble affiche seulement un lien vers eux. |

---

## 7. API (gateway, `/api/v1/…`)

Toutes les routes ont `@Permissions`, `@ApiTags`, `@ApiOperation` et
`@ApiResponse`. Tous les corps de requête sont des DTO : avec `whitelist: true`,
un champ absent du DTO est supprimé sans erreur.

| Méthode | Route | Permission | Rôle |
|---|---|---|---|
| POST | `tracking/devices` | `tracking.use` | Enregistrer |
| GET | `tracking/devices?space=&q=&status=&active=&page=&limit=` | `tracking.use` | Liste et recherche |
| GET | `tracking/devices/:code` | `tracking.use` | Fiche et indicateurs |
| PATCH | `tracking/devices/:code` | `tracking.use` | Modifier |
| POST | `tracking/devices/:code/status` | `tracking.use` | Changer le statut |
| DELETE | `tracking/devices/:code` | `tracking.use` | Archiver |
| GET | `tracking/devices/:code/timeline?type=&source=&cursor=` | `tracking.use` | Timeline |
| POST | `tracking/devices/:code/events` | `tracking.use` | Ajouter un événement |
| PATCH, DELETE | `tracking/events/:id` | `tracking.use` | Modifier, supprimer |
| POST | `tracking/devices/:code/attachments` (multipart, `eventId` facultatif) | `tracking.use` | Joindre |
| GET, DELETE | `tracking/attachments/:id` | `tracking.use` | Lire, retirer |
| GET | `tracking/dashboard?space=` | `tracking.use` | Tableau de bord |
| POST | `tracking/devices/:code/transfers` | `tracking.use` | Lancer un transfert |
| DELETE | `tracking/transfers/:id` | `tracking.use` | Annuler |
| GET | `tracking/transfers?direction=incoming\|outgoing` | `tracking.use` | Transferts en attente |
| POST | `tracking/transfers/lookup`, `…/accept`, `…/decline` (jeton dans le corps) | `tracking.use` | Côté destinataire |
| GET | `organizations/me` | `tracking.use` | Mon organisation et mon rôle |
| GET, PATCH, DELETE | `organizations/:id/members[/:userId]` | `tracking.use` + responsable | Membres |
| POST, DELETE | `organizations/:id/invitations[/:invitationId]`, POST `…/resend` | `tracking.use` + responsable | Invitations |
| POST | `invitations/lookup`, `…/accept`, `…/decline` (jeton dans le corps) | `tracking.use` | Côté invité |
| GET, POST, PATCH | `admin/organizations` | `organization.admin` | Administration |

---

## 8. Frontend

- **Menu** : un nouveau groupe « Suivi des appareils » dans
  `routes/sidebar.tsx`, pour tout utilisateur connecté.
- **Routes** : `/app/tracking`, `/app/tracking/new`, `/app/tracking/devices`,
  `/app/tracking/devices/:code`, `/app/tracking/organization`,
  `/app/tracking/invitation`, `/app/tracking/transfer`,
  `/app/admin/organizations`. Il n'y a pas de garde au niveau des routes : chaque
  page redirige elle-même quand l'utilisateur n'est pas connecté, comme
  `CreateDevice.tsx`.
- **Appels HTTP** : un `services/trackingService.ts` qui passe par l'instance
  axios partagée de `services/api.ts`.
- **État** : une tranche `trackingSlice` qui garde l'espace courant.
  - Elle est vidée sur `logoutUser.fulfilled` **et** `logoutUser.rejected`.
  - C'est une tranche nouvelle, pas un changement de forme : `PERSIST_VERSION`
    ne change pas.
- **Composants réutilisés** : `PhotoIdentification`, `ManualDeviceEntry`,
  `SearchFilters`, `DeviceImage`, `DeviceIcon`, `Timeline` de Mantine, les
  graphiques chart.js du Repair Monitor, et `MonthYearSelect` (à extraire de
  `UserDevices.tsx`).
- **Contraintes** :
  - pensé d'abord pour le téléphone ;
  - Tailwind 2.2.19 sans JIT : aucune valeur arbitraire ni classe propre à
    Tailwind 3. On privilégie les composants Mantine ;
  - une catégorie se compare sur `canonicalName` ; `name` ne sert que de
    libellé.
- **Traductions** : un espace de clés `tracking.*`, environ 150 à 200 clés,
  ajoutées en même temps dans `en`, `fr`, `nl` et `de`. Les quatre fichiers
  doivent garder le même nombre de clés (1 461 aujourd'hui). Les e-mails
  d'invitation et de transfert sont aussi rédigés dans les quatre langues.

---

## 9. Découpage en lots

| Lot | Contenu | Taille | Dépend de |
|---|---|---|---|
| 1 | **Fusion et appareils, espace personnel** : migration de `ownerships` et codes de l'existant, génération sur tous les chemins, routes `tracking/devices`, menu, enregistrement, liste et recherche, vue d'ensemble et détails, redirection de l'ancien onglet | L | — |
| 2 | **Événements, suivi et timeline** : `device_events` et pièces, formulaire, statut et `status_changed`, timeline, indicateurs, durée | L | 1 |
| 3 | **Pièces jointes privées** : `getFile`, PDF, route authentifiée, photo d'identification jointe à l'enregistrement | M | 2 |
| 4 | **Organisations et invitations** : tables, permissions, admin, e-mails, acceptation, page Membres, sélecteur d'espace, en-tête, accès des membres sur toutes les routes | L | 1 |
| 5 | **Transfert** : table, e-mails, acceptation, visibilité, événement `transferred` | L | 2, 4 |
| 6 | **Tableau de bord** : personnel, puis organisation avec temps passé et délai moyen | M | 2, 4 |
| 7 | **Finitions** : traductions finalisées, vérification complète, retrait de `UserDevices.tsx` | M | tous |

Les lots 1 à 3 donnent un module utilisable par les particuliers. Le lot 4
l'ouvre aux organisations, et le lot 5 relie les deux.

Chaque lot fait l'objet de ses propres commits (conventional commits, corps qui
explique pourquoi) et n'est commité qu'après relecture.

---

## 10. Vérification

- **Tests unitaires** dans `ownership-service`, `user-management` et
  `api-gateway`. Chaque service doit tenir ses seuils de couverture (40 % des
  branches, 50 % du reste), faute de quoi `npm run test` échoue.
- **Ce qu'il faut couvrir en priorité** :
  - l'identifiant : unicité, nouveau tirage en cas de collision, codes de
    l'existant ;
  - les droits : un utilisateur ne voit pas l'appareil d'un autre ; un
    non-membre ne voit pas ceux d'une organisation ; l'ancien détenteur perd
    l'accès ;
  - la source est bien déduite par le serveur ;
  - le retrait des coûts, notes, durées et PDF après un transfert ;
  - une date future est refusée ;
  - un jeton ne vaut que pour l'e-mail invité.
- **Frontend** : il n'a aucun test. La vérification se fait dans un navigateur,
  sur la stack Docker locale avec une base miroir de la production, en
  affichage bureau et téléphone.
- **E-mails** : la stack locale n'a pas de capteur d'e-mails (le SMTP pointe
  vers `host.docker.internal`). On vérifie avec « Copier le lien » et la ligne
  en base.
- **Scénario de bout en bout** :
  1. un particulier enregistre un iPhone 14 par photo, puis ajoute « Écran
     remplacé » avec une pièce, un coût et 45 minutes ;
  2. un admin crée l'organisation VITES et invite un responsable, qui invite un
     technicien ;
  3. le technicien enregistre un portable, le fait passer de Reçu à En
     réparation puis à Prêt à la vente, et le transfère au particulier ;
  4. le particulier accepte : il voit l'historique sans les coûts ni les
     notes, et VITES ne voit plus l'appareil ;
  5. le tableau de bord de VITES affiche le temps passé, le délai moyen et la
     liste « à traiter ».

---

## 11. Points d'attention

- **Déploiement** : deux nouvelles permissions. Il faut redémarrer
  `user-management` puis la gateway, et prévenir les utilisateurs qu'ils
  devront se reconnecter.
- **La migration de `ownerships` touche des données de production**, en
  particulier le remplissage des codes. À répéter sur une copie de la
  production avant le déploiement.
- **`acquiredAt` n'est pas fiable pour l'existant** (§4.1).
- **Le fuseau horaire** : « aujourd'hui » en UTC côté serveur, d'où la
  tolérance d'un jour sur les dates, et l'affichage des dates en UTC côté
  navigateur.
- **Hors périmètre** : l'export et le partage du rapport, les étiquettes, le
  reporting. La structure ne doit pas les empêcher : l'identifiant est figé et
  la visibilité est décidée par le serveur.
