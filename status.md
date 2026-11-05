**✅ 1. Architecture Générale**

- Basée sur **microservices** avec communication via ClientProxy et MessagePattern.
- Déployée avec **Docker**, chaque service tourne dans son propre container.

**Conteneurs actifs :**

- service-hub-front (React)
- api-gateway (entrée principale REST sécurisée via JWT)
- user-management (gestion des utilisateurs, rôles, permissions)
- oauth-service (OAuth2 - client credential)
- devices-service (gestion des appareils)
- ownership-service (relation user-device)
- repairers-service (réparateurs)
- notifications-service (emails, confirmations, etc.)
- db (PostgreSQL)
- **Stack EFK (Elasticsearch, Fluentd, Kibana)** pour les logs

**🔐 2. Système d’authentification hybride en place**

**1\. JWT classique (email + mot de passe)**

- Authentification des utilisateurs humains via email/password.
- Un JWT est émis par le backend (via user-management ou auth-service) une fois les identifiants validés.
- Le token contient :
  - sub: identifiant utilisateur
  - role: rôle (user, admin, guest)
  - permissions: liste des permissions

**2\. OAuth2 via client credentials**

- Tu as mis en place un microservice oauth-service dédié à la gestion des clients API externes.
- Les applications tierces peuvent obtenir un JWT via le flux client_credentials :
  - POST /oauth/token
  - avec client_id et client_secret
- Le JWT contient :
  - client_id
  - Permissions associées à l’application (stockées en base via client.permissions)
  - Pas de userId (car ce n’est pas un utilisateur humain)

**👤 3. Système de rôles et permissions**

- User possède un role (guest, user, admin)
- Chaque Role possède plusieurs Permission (en base de données)
- PermissionsGuard valide que l’utilisateur a bien les action nécessaires pour accéder à une route
- Permissions attachées à chaque route via un décorateur @Permissions('device.read')

**🧑‍🤝‍🧑 4. Guest Access**

- Rôle guest par défaut pour les visiteurs non authentifiés
- Routes publiques lisibles (ex : repairer.read) même sans token
- Fonctionnalités limitées par permission

**🧪 5. Tests et CI/CD**

- **Tests unitaires** en place
- **CI/CD avec GitHub Actions**
  - Build & déploiement via SSH sur serveur distant
  - Clé SSH configurée dans les secrets GitHub
- Automatisation du déploiement via docker-compose

**🌍 Déploiement**

- Serveur distant, dont l'adresse est dans les secrets GitHub du dépôt
- Accès root configuré (avec changement de mot de passe sécurisé)
- Nom de domaine actif : **care2repair.eu**
- Ports ouverts : 22, 80, 443
- Configuration prévue pour Apache, Docker, Let's Encrypt (HTTPS)

**🛠️ 6. Améliorations et Corrections Récentes**

*   **Documentation API Scalar**:
    *   **Interface Scalar configurée**: Mise en place de Scalar API Reference à `/api/scalar` avec documentation interactive
    *   **Documentation des outils intégrés**: Ajout d'une section complète sur les outils (Repair Map, iFixit, Fixometer, Fast Plan Eco) directement dans la documentation API
    *   **Service de documentation externalisé**: Création d'un `ApiDocumentationService` pour gérer dynamiquement le contenu des outils depuis des fichiers Markdown
    *   **Liens API corrigés**: Mise à jour des références vers les endpoints avec le format `#tag/{nom-du-tag}/{method}/{endpoint}`
    *   **Style professionnel**: Suppression des emojis, documentation en anglais uniquement

*   **Frontend**:
    *   **Menu latéral iFixit Tutorials**: Implémentation d'une logique dynamique pour le menu latéral des tutoriels iFixit. Affiche les tutoriels liés au périphérique sélectionné ou un message/bouton de redirection si aucun périphérique n'est choisi.
    *   **Correction de la route des tutoriels**: Résolution de l'erreur 404 sur la route `/app/ifixit-tutorials` lorsque aucun appareil n'est sélectionné, assurant une navigation fluide.

*   **Backend (Service `api-gateway`)**:
    *   **Amélioration de l'authentification flexible**: Refactorisation du `FlexibleAuthGuard` pour une gestion plus robuste des flux d'authentification (JWT, Client Credentials, Guest), incluant la gestion des erreurs de validation de token et un fallback correct entre les méthodes.
    *   **Correction des tests d'authentification**: Résolution des problèmes dans `auth.controller.spec.ts` liés aux redirections OAuth et à la gestion des erreurs de signature JWT dans les tests.
    *   **Logs d'authentification améliorés**: Ajout de logs détaillés dans `FlexibleAuthGuard` et `JwtStrategy` pour faciliter le débogage du processus d'authentification.

*   **Backend (Service `external-adapters-service`)**:
    *   **Fiabilité des tests iFixit Adapter**: Correction des tests unitaires pour `ifixit-adapter.service.spec.ts`, notamment le chargement des variables d'environnement, la validation des chemins d'URL et la préparation des données de mock pour la recherche d'appareils.
    *   **Configuration Jest optimisée**: Ajustements de la configuration Jest (`jest.config.ts`) pour assurer une exécution correcte des tests TypeScript et ignorer les fichiers compilés.

*   **Abonnement aux tutoriels manquants (`api-gateway` + `notifications-service`)**:
    *   **Nouvel endpoint** `POST /api/v1/notifications/tutorial-subscriptions` (public, sans authentification) permettant à un utilisateur de s'inscrire pour être notifié par email dès qu'un tutoriel de réparation devient disponible pour son appareil.
    *   **Nouvelle entité `TutorialSubscription`** dans `notifications-service` (email, deviceId, issueTypes, locale) avec module/service/controller dédiés et pattern de message `create_tutorial_subscription`.
    *   **Email de confirmation traduit** (EN/FR/NL/DE) généré côté `api-gateway` via `buildTutorialSubscriptionConfirmationEmail` puis envoyé par `notifications-service`.
    *   **Tests unitaires**: couverture à 100% du controller/service `TutorialSubscription`, du controller `Notifications` (api-gateway), du DTO de validation et du template d'email (voir dossiers `__test__`).

*   **Frontend — Étape Summary/Récapitulatif du Wizard**:
    *   **Réorganisation UX**: les blocs de conclusion selon le choix de dispatch (`doItYourself`, `getHelp`, `recycle`) sont désormais affichés en haut de la page, avant le récapitulatif, pour réduire le scroll nécessaire.
    *   **Alternatives systématiques**: lorsque le choix est "Je répare moi-même" et qu'aucun tutoriel n'est disponible, des solutions alternatives (réparateur à proximité, pièces détachées, catalogue d'API communautaires) sont proposées, avec un bouton pour s'abonner aux notifications de disponibilité.
    *   **Navigation simplifiée**: suppression du bandeau de navigation dupliqué en bas de page (le footer sticky global du Wizard est désormais masqué sur la dernière étape), ne conservant que les boutons "Recommencer" et "Précédent".

**📬 Notifications**

- Microservice notifications-service en charge :
  - Envoi d’emails
  - Confirmation de compte
  - Réinitialisation de mot de passe
  - **Abonnement aux tutoriels manquants**: notification email lorsqu'un tutoriel de réparation devient disponible
  - Prévu pour intégrer des **emails transactionnels OAuth2**

**📚 Documentation**

- **Interface Scalar API**: Documentation interactive accessible via `/api/scalar`
- **Documentation des outils intégrés**: Section complète sur les 4 outils principaux (Repair Map, iFixit Integration, Fixometer, Fast Plan Eco)
- **Service de documentation dynamique**: `ApiDocumentationService` chargeant le contenu depuis des fichiers Markdown
- **Liens API directs**: Références vers les endpoints spécifiques avec format `#tag/{nom-du-tag}/{method}/{endpoint}`
- Fichier .docx généré avec la documentation du **système de permissions**
- À destination des intégrateurs d'API tiers
- Contenu en anglais, structuré pour être partagé

**🔧 9. Outils Intégrés**

**Repair Map** - Géolocalisation des réparateurs
- Recherche géolocalisée de réparateurs qualifiés
- Carte interactive avec évaluations et coordonnées
- API: `POST /v1/repairers/nearest`

**iFixit Integration** - Tutoriels de réparation
- Liste des tutoriels disponibles pour appareils spécifiques
- Recherche dans la base de connaissances iFixit
- API: `GET /v1/external-adapters/ifixit/search`

**Fixometer Impact Calculator** - Calcul d'impact environnemental
- Évaluation de l'empreinte carbone des appareils
- Comparaison réparation vs remplacement
- API: `GET /v1/external-adapters/fixometer/impact-metrics`

**Fast Plan Eco** - Planification d'itinéraires écologiques
- Calcul d'itinéraires optimisés et écologiques
- Géocodage d'adresses et export GPX
- API: `POST /v1/fast-plan-eco/calculate-route`

**➡️ 10. Prochaines Étapes et Améliorations**

*   **Résoudre les Échecs de Tests Backend Restants**:
    *   **`api-gateway`**: Examiner et corriger les erreurs de contrôleur (`[ControllerName] methodName error: fail`) qui apparaissent encore dans les logs des tests, indiquant des problèmes non résolus avec les exceptions ou les dépendances mockées.
    *   **`external-adapters-service`**: Mettre en place une solution plus robuste pour le chargement des variables d'environnement dans les tests (ex: `dotenv-cli` ou configuration Jest dédiée) afin d'assurer que `process.env.IFIXIT_API_URL` est correctement défini.

*   **Documentation API Complète**:
    *   **Finaliser la documentation Scalar**: S'assurer que tous les endpoints sont correctement documentés avec des exemples et descriptions complètes
    *   **Guides d'intégration**: Créer des guides détaillés pour les développeurs tiers souhaitant intégrer les APIs
    *   **Maintenance automatique**: Mettre en place un système de mise à jour automatique de la documentation lors des déploiements

*   **Améliorer les Performances Frontend (Chargement de la Carte)**:
    *   **Pagination/Chargement Paresseux des Réparateurs**: Implémenter une stratégie pour charger uniquement les réparateurs visibles sur la carte ou dans une zone spécifique, plutôt que tous les réparateurs à la fois.
    *   **Clustering des Marqueurs**: Utiliser le clustering pour regrouper les marqueurs de réparateurs proches, améliorant ainsi les performances de rendu et l'expérience utilisateur pour les cartes denses.
    *   **Optimisation de l'API Backend**: Collaborer avec l'équipe backend pour optimiser l'API de liste des réparateurs, en s'assurant qu'elle ne renvoie que les données nécessaires et qu'elle est performante.

*   **Renforcer le Système d'Authentification**:
    *   **Gestion Robuste des Erreurs dans `FlexibleAuthGuard`**: Assurer que tous les scénarios d'erreur sont gérés avec élégance et que des messages d'erreur clairs sont fournis au client, notamment pour les problèmes de signature JWT.
    *   **Gestion Centralisée des Variables d'Environnement**: Établir une stratégie claire et cohérente pour la gestion des variables d'environnement à travers tous les services et environnements (développement, test, production) afin d'éviter les problèmes récurrents.

*   **Développement de Fonctionnalités**:
    *   **Gestion du Profil Utilisateur**: Étendre les fonctionnalités de gestion du profil utilisateur (ex: mise à jour des informations personnelles, gestion des appareils).
    *   **Flux de Demande de Réparation**: Implémenter le flux complet pour les utilisateurs souhaitant demander des réparations, incluant la planification, la communication avec les réparateurs et le traitement des paiements.
    *   **Intégration/Gestion des Réparateurs**: Développer des fonctionnalités permettant aux réparateurs de s'inscrire, de gérer leurs services, leur disponibilité et leurs tarifs.
    *   **Notifications**: Intégrer pleinement le `notifications-service` pour divers événements (ex: mises à jour du statut de réparation, nouveaux messages, promotions).

*   **Surveillance et Journalisation**:
    *   **Intégration Fluentd**: S'assurer que l'intégration Fluentd pour la journalisation est entièrement fonctionnelle et fiable sur tous les services, en résolvant les problèmes de connectivité (ex: `getaddrinfo ENOTFOUND fluentd`).
    *   **Surveillance Centralisée**: Mettre en place une solution de surveillance centralisée (ex: Prometheus, Grafana) pour suivre les performances de l'application, les erreurs et l'utilisation des ressources à travers tous les microservices.

*   **Améliorations de la Sécurité**:
    *   **Limitation de Débit (Rate Limiting)**: Implémenter la limitation de débit sur les points d'API pour prévenir les abus et les attaques par force brute.
    *   **Validation des Entrées**: Assurer une validation robuste des entrées sur tous les points d'API pour prévenir les vulnérabilités courantes (ex: XSS, injection SQL).
    *   **Audits de Sécurité**: Mener des audits de sécurité réguliers et des tests d'intrusion.

**💡 11. Idées de Fonctionnalités Futures**

*   **Fonctionnalités Clés & Améliorations de l'Expérience Utilisateur**:
    *   **Gestion Complète du Flux de Réparation**: Permettre aux utilisateurs de soumettre des demandes de réparation détaillées, avec la possibilité pour les réparateurs d'accepter/refuser les tâches, un suivi en temps réel du statut de la réparation, une plateforme de communication intégrée entre utilisateurs et réparateurs, et une gestion sécurisée des paiements.
    *   **Tableaux de Bord Personnalisés (Utilisateur & Réparateur)**: Créer des interfaces dédiées pour les utilisateurs (historique des appareils, réparations, demandes) et les réparateurs (gestion des tâches acceptées, disponibilités, revenus), incluant un centre de notifications centralisé.
    *   **Améliorations de la Gestion des Appareils**: Mettre en place un historique complet des appareils (réparations passées, pièces remplacées), un suivi des garanties, et potentiellement des outils de diagnostic ou des guides de dépannage de base.

*   **Fonctionnalités Avancées & Monétisation**:
    *   **Système d'Évaluation et de Notation**: Permettre aux utilisateurs de noter et commenter les réparateurs après service, avec affichage public des évaluations pour aider les futurs utilisateurs.
    *   **Gestion des Zones de Service (pour les Réparateurs)**: Offrir aux réparateurs la possibilité de définir leurs zones d'intervention (par code postal, rayon), facilitant la mise en relation basée sur la localisation.
    *   **Gestion des Stocks (pour les Réparateurs)**: Mettre en place un système pour que les réparateurs puissent gérer leur inventaire de pièces détachées, avec une intégration potentielle pour la commande auprès de fournisseurs.
    *   **Promotions et Réductions**: Développer un mécanisme pour que les réparateurs puissent offrir des promotions ou des réductions, et pour que les utilisateurs puissent appliquer des codes de réduction.
    *   **Analyses et Rapports**: Fournir des tableaux de bord pour les administrateurs affichant des métriques clés (nombre de réparations, appareils populaires, performances des réparateurs, revenus).

*   **Améliorations Techniques & d'Infrastructure**:
    *   **Versionnage d'API**: Implémenter un système de versionnage pour l'API afin de gérer les évolutions sans impacter les clients existants.
    *   **Orchestration de Conteneurs (Kubernetes/OpenShift)**: Envisager une migration vers une plateforme d'orchestration de conteneurs plus robuste pour une meilleure scalabilité et gestion des déploiements complexes.
    *   **Améliorations du Pipeline CI/CD**: Intégrer des tests de bout en bout automatisés et des contrôles de qualité de code (analyse statique) dans le pipeline de CI/CD.
