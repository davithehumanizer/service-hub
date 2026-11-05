{ FR } : How-to APIs
Ce document est une ébauche : la partie API-Platform sera réalisée fin mai.
Présentation rapide
Le catalogue de pièces détachées disposes de deux API distinctes :
•	Meilisearch (container Docker) : moteur de recherche utilisé par le projet ;
•	API Platform (intégré à Symfony) :couche d’abstraction permettant de manipuler les entités métier.
Par défaut, les exemples utilisent l’instance de test : “https://search.spc-e6.cris-tech.io/”, hébergeant la dernière version de la branche develop.
Si vous hébergez le projet en local, remplacez simplement cette URL par “http://127.0.0.1:7700/” ou “http://localhost:7700/”. Dans ce cas, remplacez également “prod” par “dev” dans les noms d’index.
Utilisation de Meilisearch
Introduction
Trois index sont actuellement disponibles :
•	repairer : données des réparateurs / reconditionneurs
o	app_prod_data_subdomain_repairer
•	device : données deséquipements
o	app_prod_data_subdomain_device
•	sparepart : données des pièces détachées
o	app_prod_data_subdomain_sparepart
Meilisearch est utilisé de deux façons :
•	Synchronisation automatique : toute modification sur une entité (Device, SparePart, Repairer) met à jour l’index correspondant.
•	Recherche : le sous-domaine data interroge directement Meilisearch (via localhost côté Symfony).
Pour exposer la recherche à l’extérieur, un sous-domaine dédié est utilisé : search.
Cas concret
On souhaite connaître les équipements.
curl -X GET 'https://search.spc-e6.cris-tech.io/indexes/app_prod_data_subdomain_device/search' \
  -H 'Authorization: Bearer {TOKEN}' \
  -H 'Content-Type: application/json'
Au besoin, quelques liens vers les références intéressante sur la documentation officielle :
•	https://www.meilisearch.com/docs/reference/api/indexes/list-all-indexes
•	https://www.meilisearch.com/docs/reference/api/search/search-with-get
•	https://www.meilisearch.com/docs/reference/api/search/search-with-post
•	https://www.meilisearch.com/docs/reference/api/multi-search/perform-a-multi-search
•	https://www.meilisearch.com/docs/reference/api/facet-search/search-in-facets ? Nous utilisons des facets pour les filtres sur l’interface data.
Perspectives d'évolutions
Évolutions prévues
•	Mise en place d’une API Gateway (KrakenD) avec sécurisation via Keycloak ou équivalent
o	https://www.krakend.io/docs/authorization/client-credentials/
o	https://www.krakend.io/docs/authorization/keycloak/
o	Authentification de type OAuth2 (grant_type: client_credentials)
