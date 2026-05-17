// content.js — runs on https://radio-podcast.fr/podcast/*
// Injects a floating "Télécharger tous les épisodes" button. On click, sends
// the extracted episode list to the background service worker, which opens
// the dedicated downloader page in a new tab.

const AUTOPROMO_RE = /autopromo_replay/i;

function extractEpisodes() {
  const episodes = [];
  for (const el of document.querySelectorAll('.PodcastEpisode')) {
    const num = el.dataset.id;
    const titleEl = el.querySelector('.EpTitle');
    const mp3El = el.querySelector('[data-mp3]');
    if (!num || !titleEl || !mp3El) continue;

    let title = titleEl.textContent
      .replace(/^\s*\d+\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    const url = mp3El.dataset.mp3;
    if (!url || AUTOPROMO_RE.test(url)) continue;

    episodes.push({ num: parseInt(num, 10), title, url });
  }
  return episodes;
}

function pad3(n) { return String(n).padStart(3, '0'); }

function sanitizeFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '-');
}

function pageSlug() {
  // e.g. /podcast/france-culture/1907/les-pieds-sur-terre/reportage
  const m = location.pathname.match(/\/podcast\/[^/]+\/[^/]+\/([^/]+)/);
  return m ? m[1].toLowerCase() : 'podcast-episodes';
}

let panel = null;
let statusLine = null;

function ensurePanel() {
  if (panel) return panel;
  panel = document.createElement('div');
  panel.id = '__lps_dl_panel';
  panel.style.cssText = [
    'position:fixed', 'top:12px', 'right:12px', 'z-index:2147483647',
    'background:#111', 'color:#fff', 'padding:12px 14px', 'border-radius:8px',
    'font:14px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'box-shadow:0 4px 20px rgba(0,0,0,0.3)', 'min-width:260px'
  ].join(';');

  const title = document.createElement('div');
  title.textContent = 'Téléchargement des épisodes';
  title.style.cssText = 'font-weight:600;margin-bottom:6px';
  panel.appendChild(title);

  statusLine = document.createElement('div');
  statusLine.style.cssText = 'font-size:12px;opacity:0.85';
  panel.appendChild(statusLine);

  const btn = document.createElement('button');
  btn.id = '__lps_dl_btn';
  btn.textContent = 'Télécharger tous les épisodes';
  btn.style.cssText = [
    'display:block', 'margin-top:10px', 'background:#fff', 'color:#111',
    'border:none', 'padding:8px 12px', 'border-radius:6px', 'cursor:pointer',
    'font-weight:600', 'width:100%', 'font-size:13px'
  ].join(';');
  btn.addEventListener('click', startDownload);
  panel.appendChild(btn);

  document.body.appendChild(panel);
  return panel;
}

function setStatus(msg) {
  ensurePanel();
  if (statusLine) statusLine.textContent = msg;
}

async function startDownload() {
  const episodes = extractEpisodes();
  if (episodes.length === 0) {
    setStatus('Aucun épisode détecté sur cette page.');
    return { ok: 0, total: 0 };
  }

  const items = episodes.map(ep => ({
    url: ep.url,
    filename: sanitizeFilename(`${pad3(ep.num)} - ${ep.title}.mp3`)
  }));

  setStatus(`Ouverture de l'onglet de téléchargement (${items.length} épisodes)…`);
  const resp = await chrome.runtime.sendMessage({
    action: 'openDownloader',
    episodes: items,
    slug: pageSlug()
  });
  if (resp && resp.ok) {
    setStatus(`Onglet ouvert : ${resp.count} épisodes prêts à archiver.`);
  } else {
    setStatus("Erreur lors de l'ouverture de l'onglet.");
  }
  return resp;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.action === 'startDownload') {
    startDownload().then(sendResponse);
    return true;
  }
  if (msg && msg.action === 'countEpisodes') {
    sendResponse({ count: extractEpisodes().length });
    return false;
  }
});

ensurePanel();
const count = extractEpisodes().length;
setStatus(`${count} épisode${count > 1 ? 's' : ''} détecté${count > 1 ? 's' : ''}.`);
