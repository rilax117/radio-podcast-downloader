# Les Pieds sur Terre — Téléchargeur d'épisodes

Trois outils pour télécharger en lot les épisodes mp3 du podcast [Les Pieds sur Terre](https://radio-podcast.fr/podcast/france-culture/1907/les-pieds-sur-terre/reportage) (France Culture) depuis [radio-podcast.fr](https://radio-podcast.fr) :

1. Un script **Python** (validation locale)
2. Un script **Bash + curl** (autonome, en ligne ou hors-ligne)
3. Une **extension Chrome** (Manifest V3, bouton sur la page + popup toolbar)

Les trois produisent des fichiers nommés `NNN - Titre.mp3` (numéro paddé sur 3 chiffres) et sautent automatiquement l'épisode 102 (auto-promo Radio France de durée 0h00).

## Structure

```
.
├── README.md
├── .gitignore
├── download_episodes.py          # Livrable 1 — Python (validation)
├── download_episodes.sh          # Livrable 2 — Bash + curl
├── chrome-extension/             # Livrable 3 — Extension Chrome
│   ├── manifest.json
│   ├── content.js                #   Extraction DOM + bouton injecté sur la page
│   ├── background.js             #   Service worker, ouvre l'onglet de téléchargement
│   ├── popup.html                #   Popup toolbar (alternative au bouton injecté)
│   ├── popup.js
│   ├── downloader.html           #   Page dédiée qui fait le fetch + ZIP streaming
│   ├── downloader.js
│   └── zip-writer.js             #   ZIP streaming maison (STORE, data descriptors)
├── _archives/                    # Scratch / sample HTML (gitignored)
└── mp3/                          # Sortie des téléchargements (gitignored, ~2.7 GB)
```

## Livrable 1 — Script Python

```bash
python3 download_episodes.py                            # auto-trouve le HTML
python3 download_episodes.py path/vers/page.html        # ou chemin explicite
```

Cherche un fichier HTML de liste d'épisodes (par défaut : `./liste-podcast copy.html` puis `./_archives/liste-podcast copy.html`), télécharge les 101 épisodes dans `mp3/` via `curl` (subprocess — évite le problème de CA bundle macOS sur `urllib`). Idempotent. Aucune dépendance externe (stdlib uniquement).

Sortie attendue :

```
Extracted 101 episodes (skipped 1)
[  1/101] downloading: 001 - L'attente des femmes.mp3
             → 28.3 MB
...
Done. downloaded=101 skipped=0 failed=0 total=2.6 GB
```

## Livrable 2 — Script Bash + curl

```bash
./download_episodes.sh                                       # re-fetch depuis radio-podcast.fr
./download_episodes.sh "_archives/liste-podcast copy.html"   # parse un fichier HTML local
./download_episodes.sh -o ./autre-dossier                    # destination custom (défaut: ./mp3)
```

Dépendances : `bash`, `curl`, `perl` (tous préinstallés sur macOS).

Parsing par `perl -0777` (slurp + regex multi-ligne) pour gérer titres sur plusieurs lignes et entités HTML (`&nbsp;`, `&amp;`, `&#39;`). Idempotent.

## Livrable 3 — Extension Chrome

### Installation

1. Ouvrir `chrome://extensions/`
2. Activer le **Mode développeur** (toggle en haut à droite)
3. Cliquer **« Charger l'extension non empaquetée »**
4. Sélectionner le dossier [chrome-extension/](chrome-extension/)

### Utilisation

L'extension s'active sur toute page `radio-podcast.fr/podcast/*` (pas seulement Les Pieds sur Terre — fonctionne pour n'importe quelle série du site).

**Deux façons de déclencher**, qui mènent au même flot :

- **Bouton flottant** : un panneau apparaît en haut à droite de la page avec le nombre d'épisodes détectés et un bouton « Télécharger tous les épisodes ».
- **Popup toolbar** : cliquer l'icône de l'extension dans la barre Chrome.

**Flot** (un seul fichier `.zip` au final, pas 101 entrées dans Chrome) :

1. Tu cliques le bouton → un nouvel onglet s'ouvre avec la page de téléchargement.
2. Tu cliques « Choisir l'emplacement et démarrer » → dialogue système pour choisir où enregistrer le `.zip`.
3. L'onglet télécharge chaque mp3 et l'écrit en streaming dans le zip (pas de RAM saturée, même pour 2.7 GB).
4. À la fin, tu as **un seul fichier** (ex: `les-pieds-sur-terre.zip`) contenant les 101 mp3 nommés `NNN - Titre.mp3`.

Le filtre `autopromo_replay` exclut automatiquement les épisodes promotionnels.

**Détails techniques :**

- Le zip est en mode STORE (pas de compression) — les mp3 sont déjà compressés.
- Utilise [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (`showSaveFilePicker`) pour streamer directement vers le disque.
- L'implémentation ZIP utilise les *data descriptors* (general purpose flag bit 3) pour écrire les en-têtes sans connaître la taille à l'avance — chaque mp3 traverse le pipeline sans jamais être bufferisé entièrement.
- Format ZIP 32-bit (limite à 4 GB par archive, fits ici).

## Convention de nommage

`NNN - Titre.mp3` avec :

- Numéro paddé sur 3 chiffres (`001`, `002`, …, `101`)
- Séparateur ` - ` (espace + tiret + espace)
- Titre original avec apostrophes courbes (`'`) et accents préservés
- Caractères OS-unsafe remplacés :
  - `/` → `-`
  - `:` → ` -` (ex: `AESH : accompagner…` → `AESH  - accompagner…`)
- Entités HTML décodées (`&nbsp;`, `&amp;`, `&#39;`, etc.)

## Notes techniques

- Les URLs `proxycast.radiofrance.fr/.../*.mp3` sont directement téléchargeables sans authentification.
- `curl` est forcé en HTTP/1.1 (`--http1.1`) avec `--retry-all-errors` pour contourner les erreurs HTTP/2 framing intermittentes sur certains épisodes.
- Sous macOS, `python3 urllib` peut échouer en SSL (CA bundle manquant) — c'est pourquoi le script Python délègue à `curl` plutôt que d'utiliser `urllib.request` directement.
