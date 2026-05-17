# Store assets — Chrome Web Store submission

Materials for the [Chrome Web Store listing](https://chrome.google.com/webstore/devconsole/) submission. Not bundled with the extension itself.

## `store-icon-128.png`

**128×128 PNG**, transparent background, ~12px padding around a rounded-square mark, matching the in-extension icon ([chrome-extension/icons/icon-128.png](../chrome-extension/icons/icon-128.png)) but with proper Web Store padding so it doesn't bleed to the canvas edges.

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

## TODO for full submission

- [ ] Screenshots (1280×800 or 640×400, 1–5 images)
- [ ] Promotional tile 440×280 (optional but recommended)
- [ ] Marquee tile 1400×560 (optional, for featured placement)
