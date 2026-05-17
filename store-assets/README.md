# Store assets — Chrome Web Store submission

Materials for the [Chrome Web Store listing](https://chrome.google.com/webstore/devconsole/) submission. Not bundled with the extension itself.

## `store-icon-128.png`

**128×128 PNG**, transparent background, ~12 px padding around a rounded-square mark, matching the in-extension icon ([chrome-extension/icons/icon-128.png](../chrome-extension/icons/icon-128.png)) but with proper Web Store padding so it doesn't bleed to the canvas edges.

Respects the Chrome Web Store icon guidelines:
- Exactly 128×128 pixels
- ≥ 8 px transparent padding on each side
- No text, no UI chrome, no screenshot content
- Recognizable at small sizes (downscales cleanly to 96/48/16)

Regenerate from source:

```bash
cd store-assets
qlmanage -t -s 128 -o . store-icon.svg
mv store-icon.svg.png store-icon-128.png
```

## Screenshots

**Web Store requirements** : 1280×800 ou 640×400, JPEG ou PNG 24-bit (sans alpha), 1 à 5 images.

| Fichier | Description | Statut |
|---|---|---|
| `screenshot-download-in-progress.jpg` | Page de l'onglet downloader en cours de téléchargement (barre de progression + checklist) | ✅ 1280×800 JPEG |
| `screenshot-button-on-page.jpg` | Le bouton flottant injecté sur une page radio-podcast.fr | 🔲 À refaire |
| `screenshot-downloader-tab.jpg` | L'onglet downloader avant clic démarrer (titre + bouton « Choisir l'emplacement… ») | 🔲 À refaire |

**Conseils pour les captures à refaire** :
- Sur macOS : Cmd+Shift+4 puis sélection → fichier `.png` créé sur le Bureau.
- Cibler **1280×800** exact si possible (ratio 1.6:1) : pousser le zoom navigateur si nécessaire.
- Si la capture est plus large, recadrer avec **Aperçu** (Outils → Ajuster la taille / Recadrer) plutôt qu'un crop centré aveugle.
- Convertir en JPEG (quality ≥ 90) ou en PNG sans canal alpha avant upload.

## TODO

- [ ] 2 screenshots manquants (voir tableau)
- [ ] Promotional tile 440×280 (optionnel)
- [ ] Marquee tile 1400×560 (optionnel, pour featured placement)
