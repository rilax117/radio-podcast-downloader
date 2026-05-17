// background.js — service worker. Receives the episode list + slug from the
// content script or popup, stashes it in session storage, then opens the
// downloader page in a new tab. The downloader page handles the actual
// ZIP-streamed download to a single user-chosen .zip file.

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.action === 'openDownloader' && Array.isArray(msg.episodes)) {
    (async () => {
      await chrome.storage.session.set({
        episodes: msg.episodes,
        slug: msg.slug || 'episodes'
      });
      const tab = await chrome.tabs.create({
        url: chrome.runtime.getURL('downloader.html')
      });
      sendResponse({ ok: true, tabId: tab.id, count: msg.episodes.length });
    })();
    return true; // keep channel open for async response
  }
});
