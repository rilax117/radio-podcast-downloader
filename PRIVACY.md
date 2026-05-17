# Politique de confidentialité / Privacy Policy

**Extension : « Télécharger tous les épisodes » — radio-podcast-downloader**

🇫🇷 Français · [🇬🇧 English version](#english-version)

*Dernière mise à jour : 2026-05-18*

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
| `storage` | Passer la liste d'épisodes entre l'onglet source et l'onglet de téléchargement (`chrome.storage.session`, volatile). |
| `activeTab` | Lire le nombre d'épisodes détectés sur l'onglet actif quand l'utilisateur ouvre le popup. |
| Host `https://radio-podcast.fr/*` | Le content script lit le DOM (attributs `data-mp3`) pour détecter les épisodes affichés. |
| Host `https://*.radiofrance.fr/*` | Télécharger les fichiers mp3 depuis `proxycast.radiofrance.fr` (CDN officiel Radio France). |
| Host `https://*.radiofrance-podcast.net/*` | Télécharger les fichiers mp3 d'épisodes plus anciens servis depuis `media.radiofrance-podcast.net`. |

## Code source

Le code source complet est public et auditable à : https://github.com/rilax117/radio-podcast-downloader

Cette page de politique de confidentialité reflète exactement le comportement du code. Tout écart serait un bug à signaler.

## Contact

Pour toute question : ouvrir une issue sur https://github.com/rilax117/radio-podcast-downloader/issues

---

<a id="english-version"></a>

# English version

**Extension: "Télécharger tous les épisodes" — radio-podcast-downloader**

🇬🇧 English · [🇫🇷 Version française](#politique-de-confidentialité--privacy-policy)

*Last updated: 2026-05-18*

## No data collection

This extension **does not collect, store, or transmit any personal data**.

- No user identifiers, no accounts, no authentication.
- No telemetry, no analytics, no tracking.
- No third-party servers contacted other than those explicitly listed below.

## Network requests

When the user clicks "Télécharger tous les épisodes", the extension performs only the following requests:

- `GET` requests to URLs `https://proxycast.radiofrance.fr/...` and `https://*.radiofrance-podcast.net/...` to retrieve the mp3 files the user has explicitly requested.
- No other network requests are made.

URLs are read directly from the DOM of the `radio-podcast.fr` page the user is viewing, from the `data-mp3` attribute publicly exposed by the site.

## Local storage

The extension uses `chrome.storage.session` (volatile storage, cleared when the browser closes) only to pass the episode list from the source tab to the download tab. No data is persisted.

The final `.zip` archive is saved to the user's disk at the location they choose via the system dialog (`showSaveFilePicker`). The extension has no access to the file system beyond what the user explicitly authorizes at that moment.

## Requested permissions

| Permission | Reason |
|---|---|
| `storage` | Pass the episode list between the source tab and the download tab (`chrome.storage.session`, volatile). |
| `activeTab` | Read the number of episodes detected on the active tab when the user opens the popup. |
| Host `https://radio-podcast.fr/*` | The content script reads the DOM (`data-mp3` attributes) to detect listed episodes. |
| Host `https://*.radiofrance.fr/*` | Download mp3 files from `proxycast.radiofrance.fr` (Radio France's official CDN). |
| Host `https://*.radiofrance-podcast.net/*` | Download mp3 files for older episodes served from `media.radiofrance-podcast.net`. |

## Source code

Full source code is public and auditable at: https://github.com/rilax117/radio-podcast-downloader

This privacy policy reflects the exact behavior of the code. Any discrepancy would be a bug to report.

## Contact

For any question: open an issue at https://github.com/rilax117/radio-podcast-downloader/issues
