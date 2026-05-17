# Politique de confidentialité

**Extension : « Télécharger tous les épisodes »**

## Aucune collecte de données

Cette extension **ne collecte, ne stocke, ni ne transmet aucune donnée personnelle**.

- Aucun identifiant utilisateur, aucun compte, aucune authentification.
- Aucune télémétrie, aucun analytics, aucun tracking.
- Aucun serveur tiers contacté en dehors de ceux explicitement listés ci-dessous.

## Requêtes réseau

Lorsque l'utilisateur clique « Télécharger tous les épisodes », l'extension effectue uniquement les requêtes suivantes :

- `GET` sur les URLs `https://proxycast.radiofrance.fr/...` et `https://*.radiofrance-podcast.net/...` pour récupérer les fichiers mp3 que l'utilisateur a explicitement demandés.
- Aucune autre requête réseau n'est faite.

Les URLs sont lues directement depuis le DOM de la page `radio-podcast.fr` consultée par l'utilisateur, dans l'attribut `data-mp3` exposé publiquement par le site.

## Stockage local

L'extension utilise `chrome.storage.session` (stockage volatile, effacé à la fermeture du navigateur) uniquement pour transmettre la liste des épisodes entre l'onglet source et l'onglet de téléchargement. Aucune donnée n'est persistée.

L'archive `.zip` finale est enregistrée sur le disque de l'utilisateur à l'emplacement qu'il choisit via le dialogue système (`showSaveFilePicker`). L'extension n'a pas accès au système de fichiers en dehors de ce que l'utilisateur autorise explicitement à ce moment-là.

## Permissions demandées

| Permission | Raison |
|---|---|
| `storage` | Passer la liste d'épisodes entre l'onglet source et l'onglet de téléchargement (`chrome.storage.session`). |
| `activeTab` | Lire le nombre d'épisodes détectés sur l'onglet actif quand l'utilisateur ouvre le popup. |
| `host_permissions` sur `radio-podcast.fr`, `*.radiofrance.fr`, `*.radiofrance-podcast.net` | Télécharger les fichiers mp3 publics depuis les serveurs Radio France. |

## Code source

Le code source complet est public et auditable. Cette page de politique de confidentialité reflète exactement le comportement du code.

## Contact

Pour toute question : ouvrir une issue sur le dépôt source.
