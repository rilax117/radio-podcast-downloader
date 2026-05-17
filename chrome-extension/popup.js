const btn = document.getElementById('go');
const status = document.getElementById('status');

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function setStatus(text, isError = false) {
  status.textContent = text;
  status.className = isError ? 'err' : '';
}

async function init() {
  const tab = await getActiveTab();
  if (!tab || !tab.url || !/^https:\/\/radio-podcast\.fr\/podcast\//.test(tab.url)) {
    btn.disabled = true;
    setStatus('Ouvre une page radio-podcast.fr/podcast/...', true);
    return;
  }

  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'countEpisodes' });
    if (resp && typeof resp.count === 'number') {
      setStatus(`${resp.count} épisode${resp.count > 1 ? 's' : ''} détecté${resp.count > 1 ? 's' : ''}.`);
      if (resp.count === 0) btn.disabled = true;
    }
  } catch (e) {
    setStatus('Recharge la page (Cmd+R) puis ré-ouvre le popup.', true);
    btn.disabled = true;
  }
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  setStatus('Démarrage des téléchargements…');
  const tab = await getActiveTab();
  try {
    const resp = await chrome.tabs.sendMessage(tab.id, { action: 'startDownload' });
    if (resp) {
      setStatus(`${resp.ok} démarrés, ${resp.failed} échecs (sur ${resp.total}).`,
        resp.failed > 0);
    } else {
      setStatus('Pas de réponse du content script.', true);
    }
  } catch (e) {
    setStatus(`Erreur: ${e.message}`, true);
  } finally {
    btn.disabled = false;
  }
});

init();
