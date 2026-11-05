# Suivi des parcours de réparation — plan

Couvre les PBI **13515**, **13775**, **13764**, **13765**, **13516**, aujourd'hui
répartis sous deux parents différents et rédigés sans référence les uns aux
autres. Ils forment un seul chantier.

## Principe

Un parcours est enregistré **anonymement** à la fin du wizard, identifié par un
jeton secret détenu par le navigateur. Se connecter *adopte* le parcours.

Aucune fonctionnalité n'exige un compte ; le compte rend le suivi durable. C'est
ce qui permet de couvrir les invités, qui sont la majorité des utilisateurs.

**Un parcours n'entre jamais dans les statistiques tant que l'utilisateur n'a
pas déclaré son résultat.** Beaucoup de visiteurs essaieront le wizard avec des
données fictives ; seul un retour délibéré, lors d'une visite ultérieure,
transforme un parcours en donnée statistique.

## Modèle de données : deux étages

### `repair_journeys` — nouvelle table

Le parcours en attente. **Jamais agrégée, jamais lue par les endpoints de
statistiques.**

| Colonne | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `declarationToken` | uuid unique | secret ; colonne en `select: false`, donc jamais renvoyée par une lecture, même écrite par distraction |
| `tokenExpiresAt` | timestamptz | |
| `userId` | int, nullable | posé lors de l'adoption |
| `deviceId` | int, nullable | lien vers `devices` — débloque 13516 |
| `brand`, `modelType` | varchar | |
| `productCategory`, `productCategoryId` | varchar | |
| `problem` | text, nullable | description saisie, conservée |
| `problemTag` | enum `ProblemTag` | |
| `issueSeverity`, `issueDuration` | enum, nullable | mêmes valeurs que sur `repair_records` |
| `visualCondition`, `usageIntensity`, `estimatedAge` | enum / float, nullable | idem |
| `repairRoute` | enum `DoItYourself` \| `Professional` \| `Recycle` \| `Reuse` | le `dispatchChoice` du wizard ; un parcours `Reuse` ne demande pas de déclaration |
| `locale`, `country` | varchar | |
| `journeyDate` | timestamptz | |
| `status` | enum `Pending` \| `Declared` | l'expiration n'est pas un statut : elle se déduit de `tokenExpiresAt`, donc rien n'a besoin de tourner pour la maintenir vraie |
| `declaredAt` | timestamptz, nullable | |
| `repairRecordId` | uuid, nullable | la ligne promue |
| `remindAfter` | timestamptz | report de l'invite |

### `repair_records` — table existante, rôle inchangé

Une ligne n'y est créée **qu'au moment de la déclaration**. Colonnes à ajouter :

| Colonne | Type | Alimentée par |
|---|---|---|
| `source` | enum `ImportedDataset` \| `Platform`, défaut `ImportedDataset` | distingue nos déclarations des 195 554 lignes importées |
| `issueSeverity` | enum `partial` \| `broken`, nullable | `issueSeverity` du wizard |
| `issueDuration` | enum `just_happened` \| `less_than_week` \| `one_week_to_month` \| `one_to_six_months` \| `more_than_six_months`, nullable | ancienneté de la panne |
| `visualCondition` | enum `as_new` \| `good` \| `fair` \| `poor`, nullable | `productCondition.visualCondition` |
| `usageIntensity` | enum `hardly_used` \| `light` \| `moderate` \| `heavy`, nullable | `productCondition.usageIntensity` |

Trois colonnes existantes accueillent le reste sans modification :
`problem` (text) reçoit la description saisie, `productAge` (float) reçoit
`productCondition.estimatedAge`, et `yearOfManufacture` est renseignée à la
déclaration si l'utilisateur la fournit.

`dataProvider` ne peut pas jouer ce rôle : il contient le nom du repair café
d'origine (« Capelle aan den IJssel », « Eindhoven-Woensel »…), 463 valeurs
distinctes. C'est une donnée métier, pas un discriminant technique.

### Pourquoi deux tables plutôt qu'un drapeau

Avec une colonne `confirmed` sur `repair_records`, **chaque** requête de
statistiques devrait penser à filtrer, et un seul oubli ferait fuiter des
données de test dans un tableau de bord public.

Avec deux tables, les endpoints de statistiques ne changent pas de
comportement : ils lisent `repair_records`, qui ne reçoit que du déclaré. Il n'y
a rien à ne pas oublier.

## Correspondance wizard → parcours

| Champ | Source | Note |
|---|---|---|
| `brand`, `modelType` | `wizardDevice.brand`, `.model` | |
| `productCategory`, `productCategoryId` | `wizardDevice.categories[0]` ou `selectedDeviceType` | |
| `deviceId` | `wizardDevice.device_id` | |
| `problem` | `issueDescription` | |
| `problemTag` | libellé du tag IA | **correspondance 1:1** : les valeurs de `ProblemTag` sont identiques à celles du classifieur |
| `repairRoute` | `dispatchChoice` | |
| `country` | géolocalisation déjà en store | au mieux |
| `locale` | `i18n.language` | |
| `issueSeverity` | `issueSeverity` | |
| `issueDuration` | `issueDuration` | |
| `visualCondition`, `usageIntensity` | `productCondition.*` | |
| `productAge` | `productCondition.estimatedAge` | **colonne déjà existante** |

## Éléments proposés à l'utilisateur

### E1 — Enregistrement de fin de parcours
*Aucune interface.* Un `repair_journey` est créé silencieusement quand
l'utilisateur atteint le récapitulatif avec une solution choisie. Invisible des
statistiques.

### E2 — Invite de connexion en fin de parcours (13764, reformulé)
Bannière **non bloquante**, sous la solution recommandée, invités uniquement,
une fois par parcours, refermable.

> Votre parcours est enregistré sur cet appareil. Créez un compte pour le
> retrouver partout et suivre vos réparations.

Actions : `Créer un compte` · `Se connecter` · `Plus tard`

### E3 — Bandeau de retour
En tête de l'application, dès qu'un parcours attend une issue depuis plus de
7 jours et que son jeton est valide.

> Avez-vous réussi à réparer votre {marque} {modèle} ?

Actions : `Oui` · `Partiellement` · `Non` · `Pas encore`
« Pas encore » repousse de 7 jours.

### E4 — Formulaire de déclaration
C'est ici que le parcours devient une donnée statistique, et l'occasion de
compléter ce que le wizard ne pouvait pas capter.

**Étape 1 — l'issue, en un clic.** Réparé · Partiellement réparé · Pas réparé ·
Appareil abandonné. *Seul champ obligatoire.*

**Étape 2 — compléments, tous facultatifs.**
- Si réparé : qu'avez-vous fait ? (`SolutionTag` : remplacement de pièce,
  nettoyage, soudure, mise à jour logicielle, recâblage, réglage, couture,
  lubrification, autre) + texte libre
- Si pas réparé : qu'est-ce qui vous a bloqué ? (`RepairBarrier` : trop cher,
  pièces indisponibles, manque d'information ou de compétences, conception du
  produit, panne non trouvée, réparation non rentable, autre)
- Dans tous les cas : année de fabrication ou âge approximatif — les seuls
  champs statistiques que le wizard ne demande jamais

**Étape 3 — confirmation et impact.** CO₂ évité, calculé par la chaîne
Fixometer déjà branchée dans le wizard. Pour un invité, seconde invite de
connexion — meilleur moment psychologique, il vient de réussir :
> Créez un compte pour conserver votre impact cumulé.

**Règle de conception :** chaque question supplémentaire fait chuter le taux de
réponse. L'issue en un clic, tout le reste facultatif et sautable.

### E5 — Tableau de bord de suivi (fusion avec 13765)
Route **`/app/my-repairs`**, **accessible aussi aux invités** pour la partie
suivi — c'est le meilleur argument de création de compte : leur montrer ce
qu'ils perdraient.

`/app/dashboard` ne pouvait pas jouer ce rôle, contrairement à ce que ce
document annonçait : cette route **est le wizard**, pas un tableau de bord.

| Section | Invité | Connecté | Livré |
|---|---|---|---|
| Réparations en cours, avec bouton `Déclarer le résultat` | ✅ depuis les jetons du navigateur | ✅ | ✅ |
| Réparations terminées : issue, date | ✅ | ✅ | ✅ |
| Encart « ce navigateur seulement » | ✅ | — | ✅ |
| Appareils enregistrés (`ownership-service`) | ❌ | ✅ lien | ✅ |
| CO₂ par réparation | ✅ | ✅ | ✅ figé en base |
| Impact cumulé sur la page | ✅ | ✅ | ❌ reste à afficher |
| Alerte prochain entretien | ❌ | ✅ si données | ❌ **reporté** |

Dates via `Intl.DateTimeFormat` et la locale active, comme l'exige 13765.

**Le CO₂ est figé à la déclaration**, dans `co2Avoided` sur `repair_journeys`,
avec la catégorie de référence retenue et la taille de son échantillon.

L'argument initial était le coût — la chaîne réclamait un poids absent du
parcours, donc un aller-retour `devices-service` par appareil. Il est tombé
avec le passage aux facteurs par catégorie : c'est désormais une lecture en
mémoire. **La vraie raison est ailleurs** : « voilà ce que vous avez évité »
est une affirmation sur le passé. Recalculé à l'affichage, le cumul d'un
utilisateur changerait entre deux visites parce qu'un facteur a été révisé ou
une catégorie corrigée — et un total qui bouge tout seul n'est pas un bilan.
Figer, c'est aussi conserver le chiffre qu'on lui a montré le jour où il a
répondu.

`null` y signifie « inconnu », jamais zéro : ni le gros électroménager ni les
instruments de musique n'ont de référence, et un calcul indisponible ne doit
pas faire échouer une déclaration. Les consommateurs doivent ignorer les
`null` plutôt que les compter comme des zéros.

L'impact est calculé **par la gateway**, jamais reçu du navigateur — sans quoi
n'importe qui gonflerait son propre bilan — et `repair-monitor-service` le
reçoit en paramètre distinct du corps de la requête.

### E6 — Historique sur la fiche appareil (13516)
« N réparations déclarées sur ce modèle » et répartition des issues, sur les
seuls enregistrements déclarés. Rendu possible par `deviceId`.

### E7 — Avis d'adoption à la connexion
Discret, après connexion d'un invité porteur de jetons :
> 2 parcours de réparation ont été rattachés à votre compte.

## Workflows

### W1 — Persistance du parcours *(nouveau)*
Récapitulatif atteint avec une solution choisie →
`POST /v1/repair-monitor/journeys` → renvoie `{ id, declarationToken }` →
stockés dans une nouvelle tranche Redux `pendingDeclarations`, persistée et
**non effacée par `resetWorkflow`**.

Endpoint distinct de `POST /records`, qui exige `repair.submit` et reste fermé.
Celui-ci n'accepte que la forme d'un parcours et est limité en débit.

### W2 — Déclaration et promotion *(nouveau)*
`PATCH /v1/repair-monitor/journeys/:id/outcome`, jeton dans le corps. Valide le
jeton, l'expiration et `status = Pending`. Puis, dans une transaction :

1. crée la ligne `repair_records` avec `source = Platform`,
   `dataProvider = care2repair`, l'issue et les compléments ;
2. passe le parcours à `Declared`, renseigne `declaredAt` et `repairRecordId` ;
3. efface `declarationToken`.

Usage unique, limité en débit. **C'est le seul chemin par lequel une donnée
plateforme entre dans les statistiques.**

### W3 — Invite de retour *(nouveau)*
Au chargement de l'application, la tranche `pendingDeclarations` est parcourue
**côté client**. Aucun appel serveur tant que l'utilisateur ne répond pas : ni
sondage, ni ordonnanceur, ni coût.

### W4 — Adoption à l'authentification *(nouveau)*
Après connexion ou inscription réussie, si des jetons sont détenus →
`POST /v1/repair-monitor/journeys/claim` → le serveur pose `userId`. Le parcours
devient consultable depuis n'importe quel appareil.

### W5 — persistance de `pendingDeclarations` *(aucun changement nécessaire)*

Prévu comme une modification, s'est révélé n'en demander aucune. `resetWorkflow`,
`logout` et `loginUser.fulfilled` ne réinitialisent que la tranche du wizard, et
aucun purge global n'existe : la nouvelle tranche survit donc d'elle-même — y
compris à une connexion, ce qui prépare l'adoption (W4).

**Pas d'incrément de `PERSIST_VERSION`** non plus, contrairement à ce que ce
document annonçait : ajouter une clé au reducer ne casse pas la réhydratation,
redux-persist conservant l'état initial des clés absentes du stockage. Bumper
aurait purgé les sessions et déconnecté tous les utilisateurs pour rien.

### W6 — Points d'entrée connexion et inscription *(modifié)*
`/login` et `/create-account` acceptent `?returnTo=`, transmis de l'un à l'autre
et honoré après connexion. Seuls les chemins commençant par `/app/` sont
acceptés : une cible de redirection lue dans l'URL est une redirection ouverte
en puissance, et `//evil.example` est un argument valide de `history.push`.

**Pas un retour au wizard.** `loginUser.fulfilled` réinitialise
`repairWorkflow` : se connecter depuis le récapitulatif efface le parcours
affiché, et y revenir montrerait l'étape 0. La destination est donc
`/app/my-repairs`, où le parcours vient justement d'être adopté — ce que
l'utilisateur cherchait à conserver.

### W8 — Lecture des parcours *(nouveau)*
`POST /v1/repair-monitor/journeys/lookup`, jetons dans le corps. Un POST pour
une lecture, délibérément : les jetons sont des secrets, et une chaîne de requête
finit dans les journaux d'accès, les proxys et l'historique du navigateur.

Le serveur renvoie l'union des parcours dont un jeton est présenté et de ceux
rattachés au compte connecté. **Sans jeton ni session, la réponse est vide** —
l'absence d'autorisation ne dégénère pas en « tout montrer ». Le jeton n'est
jamais renvoyé.

### W9 — Déclaration par le propriétaire *(nouveau)*
`declareOutcome` accepte désormais **deux** autorisations : le jeton, ou un
utilisateur connecté propriétaire du parcours. Sans la seconde, l'adoption (W4)
ne servirait à rien : l'utilisateur qui se connecte sur son téléphone se verrait
réclamer un jeton que seul son ordinateur détient.

### W7 — Statistiques du Repair Monitor *(inchangé)*
Aucune modification. C'est l'intérêt du modèle à deux étages.

## Migrations

`repair-monitor-service` n'a aucun fichier de migration : le schéma actuel a été
créé par `synchronize: true` et correspond aux entités. **Aucune migration de
référence n'est donc nécessaire** — l'existant est déjà aligné.

En revanche la nouvelle table et les nouvelles colonnes en exigent une, parce
que `synchronize` est désormais **désactivé en production** : la variable
`TYPEORM_SYNCHRONIZE` n'est posée nulle part — ni dans `docker-compose.yml`, ni
dans le `.env` du service — et le code par défaut sur `false` depuis la reprise
en main du schéma. Sans migration, `repair_journeys` ne sera tout simplement pas
créée sur le serveur.

L'outillage est déjà en place : `npm run typeorm:migrate` existe dans le
service, identique à celui de `devices-service`. Il ne manque que le dossier
`src/migrations/` et le fichier.

Une seule migration suffit donc : création de `repair_journeys`, plus les cinq
colonnes ajoutées à `repair_records`. À jouer sur la stack locale d'abord, en
vérifiant son idempotence par un second passage.

## Décisions

**Tranchées.** Invite de retour à 7 jours, jeton valable 90 jours. Description
libre conservée. Gravité, ancienneté et état du produit conservés eux aussi,
avec les colonnes correspondantes ajoutées aux deux tables.

**Encore ouverte — purge des parcours non déclarés.** Les supprimer à
l'expiration du jeton serait propre côté RGPD, mais suppose une tâche
planifiée, qui n'existe pas. À défaut, une commande d'administration lancée à
la main. Sans conséquence sur les statistiques — ces parcours n'y entrent
jamais — mais c'est une rétention de données à justifier.

## Séquencement

| Tranche | Contenu | Infrastructure nouvelle |
|---|---|---|
| 1 ✅ | Migration, `repair_journeys`, W1, E1 | aucune |
| 2 ✅ | W2, W3, W4, W6, E2, E3, E4, E7 | aucune |
| 3 ✅ | E5 — tableau de bord (13765), W8, W9 | aucune |
| 4 | E6 — historique par appareil (13516) | aucune |
| 5 | Relance par email (13775, point 1) | **ordonnanceur** — inexistant dans tout le backend |
| — | Affichage de l'impact cumulé sur E5 | aucune — le chiffre est déjà en base |

Les tranches 1 et 2 livrent l'essentiel de 13515, 13775 et 13764 sans aucune
infrastructure nouvelle et sans exclure les invités.

## Tickets à ouvrir

- **Les souscriptions aux tutoriels ne partent jamais.**
  `TutorialSubscriptionService.create()` écrit une ligne qu'aucun code ne relit.
  La fonctionnalité livrée en juillet est une boîte aux lettres morte.
- **Aucun ordonnanceur dans le backend.** Ni `@nestjs/schedule` ni `@Cron`,
  dans aucun service. Prérequis de la tranche 5, et correctif du point ci-dessus.
- **`repair-monitor-service` sans migrations.** Baseline à créer.
