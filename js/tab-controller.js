const yamTabBtn = document.getElementById('yamTabBtn');
const kalaTabBtn = document.getElementById('kalaTabBtn');
const yamTabPanel = document.getElementById('yamTabPanel');
const kalaTabPanel = document.getElementById('kalaTabPanel');
const app = document.getElementById('app');
const legacyFloatBtn = document.getElementById('backToTopBtn');
let kalaApp = null;

async function activateTab(name) {
  const isKala = name === 'kala';
  yamTabPanel.hidden = isKala;
  kalaTabPanel.hidden = !isKala;
  yamTabBtn.classList.toggle('active', !isKala);
  kalaTabBtn.classList.toggle('active', isKala);
  yamTabBtn.setAttribute('aria-selected', String(!isKala));
  kalaTabBtn.setAttribute('aria-selected', String(isKala));
  app.classList.toggle('kala-active', isKala);
  if (legacyFloatBtn) legacyFloatBtn.hidden = isKala;

  if (isKala && !kalaApp) {
    const { mountKalaChataTab } = await import('../kala-tab.js');
    kalaApp = mountKalaChataTab(document.getElementById('kala-root'), {
      datasetUrl: './data/lunar-month-boundaries.json'
    });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

yamTabBtn.addEventListener('click', () => activateTab('yam'));
kalaTabBtn.addEventListener('click', () => activateTab('kala'));
