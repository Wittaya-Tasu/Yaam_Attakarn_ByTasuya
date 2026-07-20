(() => {
  'use strict';

  const DATA = window.YAAM_DATA;
  const thaiDays = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
  const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
  const subNames = ['ต้น', 'กลาง', 'ปลาย'];
  const categoryLabels = { story: 'เรื่องราว', health: 'เจ็บไข้', lost: 'หาของ', travel: 'เดินทาง' };
  const levelLabels = { good: 'ดี', neutral: 'กลาง ๆ', bad: 'ควรระวัง' };

  const els = {
    app: document.getElementById('app'), splash: document.getElementById('splash'),
    displayDate: document.getElementById('displayDate'), displayTime: document.getElementById('displayTime'),
    periodBadge: document.getElementById('periodBadge'), currentNumber: document.getElementById('currentNumber'),
    currentName: document.getElementById('currentName'), currentSubperiod: document.getElementById('currentSubperiod'),
    remainingText: document.getElementById('remainingText'), nextText: document.getElementById('nextText'),
    progressBar: document.getElementById('progressBar'), dateInput: document.getElementById('dateInput'),
    timeInput: document.getElementById('timeInput'), nowBtn: document.getElementById('nowBtn'),
    liveToggle: document.getElementById('liveToggle'), categoryControl: document.getElementById('categoryControl'),
    categoryTitle: document.getElementById('categoryTitle'), timeline: document.getElementById('timeline'),
    themeBtn: document.getElementById('themeBtn'), dialog: document.getElementById('detailDialog'),
    dialogStatus: document.getElementById('dialogStatus'), dialogMeta: document.getElementById('dialogMeta'),
    dialogTitle: document.getElementById('dialogTitle'), dialogText: document.getElementById('dialogText')
  };

  let selectedCategory = 'travel';
  let liveMode = true;
  let selectedDate = new Date();
  let lastCurrentCardId = null;
  let initialScrollDone = false;

  const pad = n => String(n).padStart(2, '0');
  const localDateValue = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const localTimeValue = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const minutesOfDay = d => d.getHours() * 60 + d.getMinutes();
  const addDays = (d, amount) => { const x = new Date(d); x.setDate(x.getDate() + amount); return x; };

  function effectiveYamDate(date) {
    const mins = minutesOfDay(date);
    // 00:00–06:00 belongs to the previous yarm day. 06:01 begins the new yarm day.
    return mins <= 360 ? addDays(date, -1) : new Date(date);
  }

  function cycleFromWeekday(cycle, weekday) {
    const startNumber = weekday === 0 ? 1 : weekday + 1;
    const startIndex = cycle.indexOf(startNumber);
    return Array.from({ length: 8 }, (_, i) => cycle[(startIndex + i) % cycle.length]);
  }

  function createSlots(date) {
    const yamDate = effectiveYamDate(date);
    const weekday = yamDate.getDay();
    const dayNumbers = cycleFromWeekday(DATA.dayCycle, weekday);
    const nightNumbers = cycleFromWeekday(DATA.nightCycle, weekday);
    const slots = [];

    const make = (period, index, number, startMinutes, baseDateOffset = 0) => {
      const start = new Date(yamDate);
      start.setHours(0,0,0,0);
      start.setDate(start.getDate() + baseDateOffset);
      start.setMinutes(startMinutes);
      const end = new Date(start.getTime() + 90 * 60000 - 60000);
      return { id: `${period}-${index}`, period, index, number, name: DATA.names[period][number], start, end };
    };

    dayNumbers.forEach((n, i) => slots.push(make('day', i, n, 361 + i * 90)));
    nightNumbers.forEach((n, i) => {
      const startMinutes = 1081 + i * 90;
      if (startMinutes < 1440) slots.push(make('night', i, n, startMinutes));
      else slots.push(make('night', i, n, startMinutes - 1440, 1));
    });
    return { yamDate, slots };
  }

  function getCurrentInfo(date, slots) {
    const t = date.getTime();
    let slot = slots.find(s => t >= s.start.getTime() && t <= s.end.getTime() + 59999);
    if (!slot) {
      // Exactly 06:00 is the final minute of the previous night's last slot.
      slot = slots[slots.length - 1];
    }
    const elapsed = Math.max(0, Math.min(89, Math.floor((t - slot.start.getTime()) / 60000)));
    const subIndex = Math.min(2, Math.floor(elapsed / 30));
    const subStart = new Date(slot.start.getTime() + subIndex * 30 * 60000);
    const subEndExclusive = new Date(subStart.getTime() + 30 * 60000);
    const remaining = Math.max(0, Math.ceil((subEndExclusive.getTime() - t) / 60000));
    const progress = Math.max(0, Math.min(100, ((t - subStart.getTime()) / (30 * 60000)) * 100));
    return { slot, subIndex, subStart, remaining, progress };
  }

  function predictionFor(number, category, subIndex) {
    const value = DATA.predictions[number][category];
    return Array.isArray(value) ? value[subIndex] : value;
  }

  function formatDateThai(d) {
    return `วัน${thaiDays[d.getDay()]}ที่ ${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
  }
  function formatTime(d) { return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
  function formatRange(slot) { return `${formatTime(slot.start)}–${formatTime(slot.end)}`; }

  function updateInputs() {
    els.dateInput.value = localDateValue(selectedDate);
    els.timeInput.value = localTimeValue(selectedDate);
  }

  function render({ shouldScroll = false } = {}) {
    const { yamDate, slots } = createSlots(selectedDate);
    const current = getCurrentInfo(selectedDate, slots);
    const p = predictionFor(current.slot.number, selectedCategory, current.subIndex);

    els.displayDate.textContent = formatDateThai(selectedDate);
    els.displayTime.textContent = `${formatTime(selectedDate)} น.`;
    els.periodBadge.textContent = current.slot.period === 'day' ? 'กลางวัน' : 'กลางคืน';
    els.currentNumber.textContent = current.slot.number;
    els.currentName.textContent = current.slot.name;
    els.currentSubperiod.textContent = `${subNames[current.subIndex]} • ${levelLabels[p.level]}`;
    els.remainingText.textContent = `เหลืออีก ${current.remaining} นาที`;
    els.nextText.textContent = current.subIndex < 2 ? `ถัดไป: ${subNames[current.subIndex + 1]}` : 'ถัดไป: ยามใหม่';
    els.progressBar.style.width = `${current.progress}%`;

    const sections = [
      { key: 'day', title: 'ยามกลางวัน', time: '06:01–18:00' },
      { key: 'night', title: 'ยามกลางคืน', time: '18:01–06:00' }
    ];

    els.timeline.innerHTML = sections.map(section => {
      const cards = slots.filter(s => s.period === section.key).map(slot => renderCard(slot, current)).join('');
      return `<section class="period-section">
        <div class="period-heading"><h2>${section.title}</h2><span>${section.time}</span></div>
        <div class="yam-list">${cards}</div>
      </section>`;
    }).join('');

    els.timeline.querySelectorAll('.subperiod').forEach(btn => {
      btn.addEventListener('click', () => openDetail(btn.dataset.number, btn.dataset.subindex, btn.dataset.period, btn.dataset.name, btn.dataset.time));
    });

    const currentId = current.slot.id;
    if ((shouldScroll || (!initialScrollDone && liveMode)) && currentId !== lastCurrentCardId) {
      requestAnimationFrame(() => {
        document.getElementById(`card-${currentId}`)?.scrollIntoView({ behavior: initialScrollDone ? 'smooth' : 'auto', block: 'center' });
        initialScrollDone = true;
      });
    }
    lastCurrentCardId = currentId;
  }

  function renderCard(slot, current) {
    const isCurrent = slot.id === current.slot.id;

    // การเดินทางมีคำทำนายแยก ต้น / กลาง / ปลาย จึงคงรูปแบบ 3 ช่องเดิม
    if (selectedCategory === 'travel') {
      const subs = [0,1,2].map(i => {
        const start = new Date(slot.start.getTime() + i * 30 * 60000);
        const pred = predictionFor(slot.number, selectedCategory, i);
        const currentClass = isCurrent && i === current.subIndex ? ' current' : '';
        return `<button class="subperiod level-${pred.level}${currentClass}" type="button"
          data-number="${slot.number}" data-subindex="${i}" data-period="${slot.period}"
          data-name="${slot.name}" data-time="${formatTime(start)}">
          <span class="subperiod-name">${subNames[i]}</span>
          <span class="subperiod-time">${formatTime(start)}</span>
          <span class="status-pill">${levelLabels[pred.level]}</span>
        </button>`;
      }).join('');

      return `<article id="card-${slot.id}" class="yam-card${isCurrent ? ' current' : ''}">
        <div class="yam-card-head">
          <div class="yam-identity">
            <span class="yam-number">${slot.number}</span>
            <div><div class="yam-name">${slot.name}</div><div class="yam-subtitle">เลขยาม ${slot.number}</div></div>
          </div>
          <span class="yam-time">${formatRange(slot)}</span>
        </div>
        <div class="subperiod-grid">${subs}</div>
      </article>`;
    }

    // เรื่องราว เจ็บไข้ และหาของ มีคำทำนายเดียวตลอดยามหลัก
    const pred = predictionFor(slot.number, selectedCategory, 0);
    return `<article id="card-${slot.id}" class="yam-card compact-card level-${pred.level}${isCurrent ? ' current' : ''}">
      <div class="yam-card-head compact-head">
        <div class="yam-identity">
          <span class="yam-number">${slot.number}</span>
          <div class="yam-main-copy">
            <div class="yam-title-row">
              <div class="yam-name">${slot.name}</div>
              <span class="card-status level-${pred.level}">${levelLabels[pred.level]}</span>
            </div>
            <div class="yam-subtitle">เลขยาม ${slot.number}</div>
          </div>
        </div>
        <span class="yam-time">${formatRange(slot)}</span>
      </div>
      <div class="prediction-copy">
        <p>${pred.text}</p>
      </div>
    </article>`;
  }

  function openDetail(numberRaw, subIndexRaw, period, name, time) {
    const number = Number(numberRaw), subIndex = Number(subIndexRaw);
    const pred = predictionFor(number, selectedCategory, subIndex);
    els.dialogStatus.className = `dialog-status ${pred.level}`;
    els.dialogMeta.textContent = `${categoryLabels[selectedCategory]} • ${period === 'day' ? 'กลางวัน' : 'กลางคืน'} • เริ่ม ${time} น.`;
    els.dialogTitle.textContent = `เลขยาม ${number} ${name} • ${subNames[subIndex]}`;
    els.dialogText.textContent = pred.text;
    if (typeof els.dialog.showModal === 'function') els.dialog.showModal();
  }

  function applySelectedInput() {
    const [y,m,d] = els.dateInput.value.split('-').map(Number);
    const [hh,mm] = els.timeInput.value.split(':').map(Number);
    if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return;
    selectedDate = new Date(y, m-1, d, hh, mm, 0, 0);
    liveMode = false;
    els.liveToggle.checked = false;
    render({ shouldScroll: true });
  }

  els.categoryControl.addEventListener('click', e => {
    const btn = e.target.closest('button[data-category]');
    if (!btn || btn.dataset.category === selectedCategory) return;
    selectedCategory = btn.dataset.category;
    els.categoryControl.querySelectorAll('button').forEach(b => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    els.categoryTitle.textContent = categoryLabels[selectedCategory];
    els.timeline.classList.add('fading');
    setTimeout(() => { render(); els.timeline.classList.remove('fading'); }, 200);
  });

  els.dateInput.addEventListener('change', applySelectedInput);
  els.timeInput.addEventListener('change', applySelectedInput);
  els.nowBtn.addEventListener('click', () => {
    liveMode = true; els.liveToggle.checked = true; selectedDate = new Date(); updateInputs(); render({ shouldScroll: true });
  });
  els.liveToggle.addEventListener('change', () => {
    liveMode = els.liveToggle.checked;
    if (liveMode) { selectedDate = new Date(); updateInputs(); render({ shouldScroll: true }); }
  });

  const savedTheme = localStorage.getItem('yaam-theme');
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  else if (matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.dataset.theme = 'dark';
  els.themeBtn.addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next; localStorage.setItem('yaam-theme', next);
  });

  setInterval(() => {
    if (!liveMode) return;
    selectedDate = new Date(); updateInputs(); render();
  }, 30000);

  selectedDate = new Date();
  updateInputs();
  render();
  setTimeout(() => { els.splash.classList.add('hidden'); els.app.classList.remove('is-loading'); }, 450);

  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
