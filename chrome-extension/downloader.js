import { writeZipStream } from './zip-writer.js';

const summary = document.getElementById('summary');
const startBtn = document.getElementById('start');
const status = document.getElementById('status');
const log = document.getElementById('log');
const bar = document.getElementById('bar');

function setStatus(msg, cls = '') {
  status.textContent = msg;
  status.className = cls;
}

function logLine(msg, cls = '') {
  const div = document.createElement('div');
  if (cls) div.className = cls;
  div.textContent = msg;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

function fmtBytes(n) {
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

// Load payload from session storage (set by background.js when this tab was opened).
const { episodes = [], slug = 'episodes' } = await chrome.storage.session.get(['episodes', 'slug']);
const suggestedName = `${slug || 'episodes'}.zip`;

if (episodes.length === 0) {
  summary.textContent = "Aucun épisode trouvé. Réessaie depuis la page du podcast.";
  startBtn.disabled = true;
} else {
  summary.textContent = `${episodes.length} épisode${episodes.length > 1 ? 's' : ''} prêt${episodes.length > 1 ? 's' : ''} à télécharger dans ${suggestedName}.`;
}

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;

  let handle;
  try {
    handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Archive ZIP', accept: { 'application/zip': ['.zip'] } }]
    });
  } catch (e) {
    setStatus(`Annulé : ${e.message}`, 'err');
    startBtn.disabled = false;
    return;
  }

  const writable = await handle.createWritable();
  let totalBytes = 0;
  let failed = 0;
  const startTime = Date.now();

  async function* filesIterable() {
    for (let i = 0; i < episodes.length; i++) {
      const ep = episodes[i];
      bar.style.width = `${(i / episodes.length * 100).toFixed(1)}%`;
      setStatus(`[${i + 1}/${episodes.length}] ${ep.filename}`);

      let resp;
      try {
        resp = await fetch(ep.url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      } catch (e) {
        failed++;
        logLine(`  ✗ ${ep.filename} : ${e.message}`, 'err');
        continue;
      }
      const before = totalBytes;
      yield {
        name: ep.filename,
        body: new ReadableStream({
          async start(controller) {
            const reader = resp.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                totalBytes += value.length;
                controller.enqueue(value);
              }
              controller.close();
              logLine(`  ✓ ${ep.filename}  (${fmtBytes(totalBytes - before)})`);
            } catch (e) {
              controller.error(e);
            }
          }
        })
      };
    }
  }

  try {
    await writeZipStream(filesIterable(), writable);
    bar.style.width = '100%';
    const secs = ((Date.now() - startTime) / 1000).toFixed(1);
    setStatus(`Terminé en ${secs}s — ${fmtBytes(totalBytes)} (échecs : ${failed}).`, failed > 0 ? 'err' : 'ok');
  } catch (e) {
    setStatus(`ERREUR : ${e.message}`, 'err');
    try { await writable.abort(); } catch {}
  } finally {
    startBtn.disabled = false;
  }
});
