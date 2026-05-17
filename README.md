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
├── liste-podcast copy.html       # Sample HTML page (input pour les scripts en mode local)
├── download_episodes.py          # Livrable 1 — Python (validation)
├── download_episodes.sh          # Livrable 2 — Bash + curl
├── chrome-extension/             # Livrable 3 — Extension Chrome
│   ├── manifest.json
│   ├── content.js                #   Extraction DOM + bouton injecté
│   ├── background.js             #   Service worker, orchestration chrome.downloads
│   ├── popup.html
│   └── popup.js
└── mp3/                          # Sortie des téléchargements (gitignored, ~2.7 GB)
```

## Livrable 1 — Script Python

```bash
python3 download_episodes.py
```

Lit `liste-podcast copy.html` à la racine, télécharge les 101 épisodes dans `mp3/` via `curl` (subprocess). Idempotent : skip les fichiers déjà présents. Aucune dépendance externe (stdlib uniquement).

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
./download_episodes.sh                            # re-fetch la page depuis radio-podcast.fr
./download_episodes.sh "liste-podcast copy.html"  # parse un fichier HTML local
./download_episodes.sh -o ./autre-dossier         # destination custom (défaut: ./mp3)
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

Deux façons de déclencher :

- **Bouton flottant** : un panneau apparaît en haut à droite de la page avec le nombre d'épisodes détectés et un bouton « Télécharger tous les épisodes ».
- **Popup toolbar** : cliquer l'icône de l'extension dans la barre Chrome.

Les téléchargements partent vers le dossier Downloads par défaut de Chrome. Le filtre `autopromo_replay` exclut automatiquement les épisodes promotionnels.

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
