// background.js — service worker. Receives a list of downloads from the
// content script and dispatches them through chrome.downloads sequentially.

const DELAY_MS = 200;

function downloadOne(item) {
  return new Promise((resolve) => {
    chrome.downloads.download(
      {
        url: item.url,
        filename: item.filename,
        conflictAction: 'uniquify',
        saveAs: false
      },
      (id) => {
        if (chrome.runtime.lastError || !id) {
          resolve({ ok: false, error: chrome.runtime.lastError?.message || 'no id' });
        } else {
          resolve({ ok: true, id });
        }
      }
    );
  });
}

async function downloadAll(items) {
  let ok = 0;
  let failed = 0;
  for (const item of items) {
    const r = await downloadOne(item);
    if (r.ok) ok++; else failed++;
    if (DELAY_MS > 0) await new Promise(r => setTimeout(r, DELAY_MS));
  }
  return { ok, failed, total: items.length };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.action === 'downloadAll' && Array.isArray(msg.items)) {
    downloadAll(msg.items).then(sendResponse);
    return true; // keep channel open for async response
  }
});
