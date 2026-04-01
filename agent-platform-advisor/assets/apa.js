// === STATE ===
let apa = null; // populated from YAML
let answers = {}; // { q1: 'q1a', q2: 'q2b', ... }
let fastTrack = false;
let currentQuestionIndex = 0;
let listenersReady = false;
let recommendedPlatformId = null;
let isURLLoaded = false; // true when loaded from shared URL params
let originalPlatformId = null; // from &r= URL param for temporal comparison
let originalDate = null; // from &d= URL param

// === UTILITIES ===
function showSection(id) {
  ['loading-section','error-section','welcome-section','prescreen-section',
   'assessment-section','recommendation-section'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle('hidden', s !== id);
  });
  updateProgressBar(id);
}

// === HISTORY NAVIGATION ===
function pushState(section, questionIndex) {
  const state = { section, questionIndex: questionIndex ?? null };
  history.pushState(state, '', '');
}

window.addEventListener('popstate', (e) => {
  const state = e.state;
  if (!state) {
    showSection('welcome-section');
    return;
  }
  if (state.section === 'assessment-section' && state.questionIndex != null) {
    currentQuestionIndex = state.questionIndex;
    renderQuestion();
  } else if (state.section === 'recommendation-section') {
    renderRecommendation();
  }
  showSection(state.section);
});

function updateProgressBar(sectionId) {
  const steps = ['Welcome', 'Assessment', 'Recommendation'];
  const activeIndex = {
    'loading-section': 0,
    'error-section': 0,
    'welcome-section': 0,
    'prescreen-section': 0,
    'assessment-section': 1,
    'recommendation-section': 2,
  }[sectionId] ?? 0;

  const bar = document.getElementById('progress-bar');
  if (!bar) return;
  bar.className = 'progress-bar';
  bar.innerHTML = steps.map((label, i) => {
    const cls = i < activeIndex ? 'complete' : i === activeIndex ? 'active' : '';
    const connector = i < steps.length - 1
      ? `<div class="progress-connector"></div>` : '';
    return `
      <div class="progress-step ${cls}">
        <div class="progress-dot"></div>
        <span>${label}</span>
      </div>${connector}`;
  }).join('');
}

// === SCORING ENGINE ===
const HARD_RULES = {
  q4d: { zero: ['agent_builder', 'm365_copilot'] },
  q8b: { zero: ['agent_builder', 'm365_copilot'] },
};

// Returns { platformId: true } for each platform that must be zeroed
function getZeroedPlatforms(answersMap) {
  const zeroed = {};
  Object.values(answersMap).forEach(optionId => {
    if (HARD_RULES[optionId]) {
      HARD_RULES[optionId].zero.forEach(p => { zeroed[p] = true; });
    }
  });
  // Prescreen "No — I need a custom agent" excludes M365 Copilot from the full assessment.
  // M365 Copilot is only appropriate when the user explicitly wants a built-in experience.
  if (!fastTrack) zeroed['m365_copilot'] = true;
  return zeroed;
}

// Returns { platformId: number } raw totals before tiebreaker
function sumRawScores(answersMap, questions, zeroed) {
  const platformIds = apa.meta.platforms.map(p => p.id);
  const totals = Object.fromEntries(platformIds.map(id => [id, 0]));

  questions.forEach(q => {
    const selectedOptionId = answersMap[q.id];
    if (!selectedOptionId) return;
    const option = q.options.find(o => o.id === selectedOptionId);
    if (!option) return;
    platformIds.forEach(pid => {
      const base = option.scores[pid] ?? 0;
      totals[pid] += zeroed[pid] ? 0 : base;
    });
  });

  return totals;
}

function getThresholdLabel(score, thresholds) {
  const rounded = Math.round(score);
  const t = thresholds.find(t => rounded >= t.min && rounded <= t.max);
  return t ? t.label : 'Not recommended';
}

// Returns platforms sorted by final score descending: [{id, score, label}, ...]
function rankPlatforms(answersMap) {
  const zeroed = getZeroedPlatforms(answersMap);
  const questions = apa.questions.filter(q => answersMap[q.id]); // only answered
  const final = sumRawScores(answersMap, questions, zeroed);

  return apa.meta.platforms
    .map(p => ({
      id: p.id,
      score: Math.round(final[p.id]),
      label: getThresholdLabel(final[p.id], apa.scoring.recommendation_thresholds),
    }))
    .sort((a, b) => b.score - a.score);
}

const HARD_RULE_LABELS = {
  q4d: 'Complex agent orchestration — this is a hard requirement for Foundry',
  q8b: 'External user audience — Agent Builder and M365 Copilot cannot publish externally',
};

// Returns up to 3 bullet strings summarising key scoring factors (or disqualifying rules) for the given platform
function getKeyFactors(platformId, answersMap) {
  const factors = [];

  // 1. Hard rules that zeroed this platform
  Object.entries(answersMap).forEach(([, optionId]) => {
    if (HARD_RULES[optionId] && HARD_RULES[optionId].zero.includes(platformId)) {
      factors.push(`⚠️ ${HARD_RULE_LABELS[optionId] ?? optionId}`);
    }
  });

  // 2. Top-scoring questions for this platform (highest contribution first; skip zero-score answers)
  const contributions = [];
  apa.questions.forEach(q => {
    const optionId = answersMap[q.id];
    if (!optionId) return;
    const option = q.options.find(o => o.id === optionId);
    if (!option) return;
    const score = option.scores[platformId] ?? 0;
    if (score > 0) {
      contributions.push({ questionLabel: q.label, optionLabel: option.label, score });
    }
  });
  contributions.sort((a, b) => b.score - a.score);
  contributions.slice(0, 3 - factors.length).forEach(c => {
    factors.push(`<em>${c.questionLabel}</em> ${c.optionLabel}`);
  });

  return factors.slice(0, 3);
}

const PLATFORM_ICONS = {
  agent_builder:  '../images/copilot.png',
  m365_copilot:   '../images/m365-copilot-logo.png',
  copilot_studio: '../images/copilot-studio.png',
  foundry:        '../images/ai-foundry.png',
};

function badgeClass(label) {
  if (label.startsWith('Strong'))   return 'badge-strong';
  if (label.startsWith('Good'))     return 'badge-good';
  if (label.startsWith('Possible')) return 'badge-possible';
  return 'badge-not';
}


function buildPlatformCard(platformId, ranked, answersMap, isPrimary, showBadge) {
  const rec = apa.recommendations[platformId];
  if (!rec) return `<div class="rec-card"><p>Platform data unavailable.</p></div>`;
  const rankEntry = ranked.find(r => r.id === platformId);
  // showBadge is true only for scored primary cards; key factors are only meaningful in that same context
  const factors = isPrimary && showBadge ? getKeyFactors(platformId, answersMap) : [];
  const icon = PLATFORM_ICONS[platformId] || '';

  const badgeHtml = showBadge && rankEntry
    ? `<span class="rec-badge ${badgeClass(rankEntry.label)}">${rankEntry.label}</span>`
    : '';

  const factorsHtml = factors.length > 0 ? `
    <div class="rec-section-title">Why this was recommended</div>
    <ul class="rec-list">${factors.map(f => `<li>${f}</li>`).join('')}</ul>` : '';

  const resourcesHtml = rec.resources_url
    ? `<a class="rec-resources-link" href="${rec.resources_url}" target="_blank" rel="noopener noreferrer">
        Explore ${rec.headline} resources →</a>`
    : '';

  const bestFor = (rec.best_for || []).map(f => `<li>${f}</li>`).join('');
  const watchOut = (rec.watch_out_for || []).map(f => `<li>${f}</li>`).join('');
  const firstPartyHtml = (rec.first_party_agents || []).length > 0 ? `
    <details class="rec-accordion">
      <summary class="rec-accordion-trigger">
        <span class="rec-section-title">Available First-Party Copilot Agents</span>
        <span class="rec-accordion-count">${rec.first_party_agents.length}</span>
        <svg class="rec-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <ul class="rec-list">${rec.first_party_agents.map(a => {
      const label = a.url
        ? `<a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.label}</a>`
        : a.label;
      return `<li><strong>${label}</strong> — ${a.description}</li>`;
    }).join('')}</ul>
    </details>` : '';

  const templatesHtml = (rec.templates || []).length > 0 ? `
    <details class="rec-accordion">
      <summary class="rec-accordion-trigger">
        <span class="rec-section-title">Available Templates</span>
        <span class="rec-accordion-count">${rec.templates.length}</span>
        <svg class="rec-accordion-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
      </summary>
      <ul class="rec-list">${rec.templates.map(t => {
      const label = t.url
        ? `<a href="${t.url}" target="_blank" rel="noopener noreferrer">${t.label}</a>`
        : t.label;
      return `<li><strong>${label}</strong> — ${t.description}</li>`;
    }).join('')}</ul>
    </details>` : '';

  return `
    <div class="rec-card ${isPrimary ? 'primary' : 'secondary'}">
      <div class="rec-header">
        <img class="rec-platform-icon" src="${icon}" alt="${rec.headline}">
        <div>
          <div class="rec-platform-name">${rec.headline}${badgeHtml}</div>
        </div>
      </div>
      <p class="rec-summary">${rec.summary}</p>
      ${platformId === 'copilot_studio' && (answersMap.q1 === 'q1c' || answersMap.q1 === 'q1d')
        ? `<div class="rec-dev-note">
            <strong>🛠️ Developer tip:</strong> You can build Copilot Studio agents in YAML using the
            <a href="https://learn.microsoft.com/en-us/microsoft-copilot-studio/authoring-overview" target="_blank" rel="noopener noreferrer">Copilot Studio extension for VS Code</a>
            — no low-code canvas required.
          </div>`
        : ''}
      ${resourcesHtml}
      ${factorsHtml}
      <div class="rec-section-title">Best for</div>
      <ul class="rec-list">${bestFor}</ul>
      <div class="rec-section-title">Important Considerations</div>
      <ul class="rec-list">${watchOut}</ul>
      ${firstPartyHtml}
      ${templatesHtml}
    </div>`;
}

// === AGENT STRUCTURE ===
const ICON_PATHS = {
  'cpu':             '<rect width="16" height="16" x="4" y="4" rx="2"/><rect width="6" height="6" x="9" y="9" rx="1"/><path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2"/>',
  'rocket':          '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
  'book-open':       '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  'settings':        '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'message-square':  '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'plug':            '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
  'server':          '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/>',
  'clipboard':       '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  'bolt':            '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  'key':             '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>',
  'users':           '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  'scale':           '<path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z"/><path d="M7 21H17"/><path d="M12 3v18"/><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2"/>',
  'bar-chart':       '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  'building':        '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  'folder':          '<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>',
  'link':            '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  'database':        '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  'file-text':       '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/>',
  'lock':            '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'beaker':          '<path d="M4.5 3h15"/><path d="M6 3v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V3"/><path d="M6 14h12"/>',
  'target':          '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'arrows-left-right': '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
  'zap':             '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  'wrench':          '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  'wifi':            '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>',
  'sparkles':        '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4M19 17v4M3 5h4M17 19h4"/>',
  'search':          '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  'trending-up':     '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'refresh':         '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  'pencil':          '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/>',
};

function getIcon(name, size = 16) {
  const paths = ICON_PATHS[name];
  if (!paths) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${paths}</svg>`;
}

// === BOOT ===
async function boot() {
  showSection('loading-section');
  try {
    const res = await fetch('./apa.yaml');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    apa = jsyaml.load(text);
    setupListeners();

    // Check for URL params (shared link)
    const urlResult = parseURLParams();
    if (urlResult) {
      if (urlResult.mode === 'wizard') {
        // Pre-fill wizard with answers from URL
        currentQuestionIndex = 0;
        renderQuestion();
        showSection('assessment-section');
        history.replaceState({ section: 'assessment-section', questionIndex: 0 }, '', '');
      } else {
        // mode=card (default): skip wizard, render card directly
        isURLLoaded = true;
        renderRecommendation();
        showSection('recommendation-section');
        // Don't push history state for URL-loaded cards (eng review decision 3A)
        history.replaceState({ section: 'recommendation-section' }, '', '');
      }
    } else {
      showSection('welcome-section');
      history.replaceState({ section: 'welcome-section' }, '', '');
    }
  } catch (err) {
    document.getElementById('error-message').textContent =
      `Could not load advisor data: ${err.message}`;
    showSection('error-section');
  }
}

function setupListeners() {
  if (listenersReady) return;
  listenersReady = true;
  document.getElementById('start-btn').addEventListener('click', () => {
    showSection('prescreen-section');
    pushState('prescreen-section');
  });
  document.getElementById('next-btn').addEventListener('click', handleNext);
  document.getElementById('prev-btn').addEventListener('click', handlePrev);
}

function handlePrescreenYes() {
  fastTrack = true;
  answers = {};
  renderRecommendation();
  showSection('recommendation-section');
  pushState('recommendation-section');
}

function handlePrescreenNo() {
  fastTrack = false;
  if (Object.keys(answers).length === 0) {
    currentQuestionIndex = 0;
  }
  renderQuestion();
  showSection('assessment-section');
  pushState('assessment-section', currentQuestionIndex);
}

function renderQuestion() {
  const question = apa.questions[currentQuestionIndex];
  const total = apa.questions.length;

  document.getElementById('question-counter').textContent =
    `Question ${currentQuestionIndex + 1} of ${total}`;
  document.getElementById('question-title').textContent = question.label;
  document.getElementById('question-subtitle').textContent = question.prompt || '';

  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  question.options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'option-card' + (answers[question.id] === opt.id ? ' selected' : '');
    div.setAttribute('role', 'button');
    div.setAttribute('tabindex', '0');
    const isSelected = answers[question.id] === opt.id;
    div.setAttribute('aria-pressed', String(isSelected));
    div.innerHTML = `
      <div class="option-radio-indicator" aria-hidden="true">
        <div class="option-radio-outer">${isSelected ? '<div class="option-radio-inner"></div>' : ''}</div>
      </div>
      <div class="option-content">
        <div class="option-label">${opt.label}</div>
      </div>`;
    const select = () => {
      answers[question.id] = opt.id;
      renderQuestion();
    };
    div.addEventListener('click', select);
    div.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
    });
    optionsList.appendChild(div);
  });

  const nextBtn = document.getElementById('next-btn');
  nextBtn.disabled = !answers[question.id];
  nextBtn.textContent = currentQuestionIndex === total - 1
    ? 'Get Recommendation ▶' : 'Next ▶';

  document.getElementById('prev-btn').disabled = false;
}

function handleNext() {
  const question = apa.questions[currentQuestionIndex];

  if (currentQuestionIndex < apa.questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
    pushState('assessment-section', currentQuestionIndex);
  } else {
    renderRecommendation();
    showSection('recommendation-section');
    pushState('recommendation-section');
  }
}

function handlePrev() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
    pushState('assessment-section', currentQuestionIndex);
  } else {
    showSection('prescreen-section');
    pushState('prescreen-section');
  }
}

// === SCORE COMPARISON ===
function getScoreReason(platformId, ranked, answersMap) {
  const rec = apa.recommendations[platformId];
  const rankEntry = ranked.find(r => r.id === platformId);
  if (!rankEntry || rankEntry.score === 0) {
    // Check for hard-rule disqualification
    const zeroed = getZeroedPlatforms(answersMap);
    if (zeroed[platformId]) {
      const ruleKeys = Object.entries(answersMap)
        .filter(([, optId]) => HARD_RULES[optId] && HARD_RULES[optId].zero.includes(platformId))
        .map(([, optId]) => optId);
      if (ruleKeys.length > 0 && HARD_RULE_LABELS[ruleKeys[0]]) {
        return HARD_RULE_LABELS[ruleKeys[0]];
      }
    }
    if (platformId === 'm365_copilot' && !fastTrack) {
      return 'Only available via the Microsoft 365 Copilot path — excluded from custom agent assessment.';
    }
    return rec ? rec.scoring_summary : 'Not applicable for this scenario.';
  }
  // Dynamic: find the top contributing question
  const contributions = [];
  apa.questions.forEach(q => {
    const optionId = answersMap[q.id];
    if (!optionId) return;
    const option = q.options.find(o => o.id === optionId);
    if (!option) return;
    const score = option.scores[platformId] ?? 0;
    if (score > 0) contributions.push({ qLabel: q.label, oLabel: option.label, score });
  });
  contributions.sort((a, b) => b.score - a.score);
  if (contributions.length > 0) {
    const top = contributions[0];
    return `Top factor: ${top.qLabel} — ${top.oLabel}`;
  }
  return rec ? rec.scoring_summary : '';
}

function buildScoreComparison(ranked, answersMap) {
  const maxScore = apa.scoring.raw_score_max || 24;
  const rows = apa.meta.platforms
    .filter(p => p.id !== 'm365_copilot')
    .map(p => {
    const rankEntry = ranked.find(r => r.id === p.id);
    const score = rankEntry ? rankEntry.score : 0;
    const label = rankEntry ? rankEntry.label : 'Not recommended';
    const pct = Math.round((score / maxScore) * 100);
    const icon = PLATFORM_ICONS[p.id] || '';
    const reason = getScoreReason(p.id, ranked, answersMap);
    const badge = `<span class="rec-badge sc-badge ${badgeClass(label)}">${label}</span>`;

    return `
      <div class="sc-row">
        <div class="sc-platform">
          <img class="sc-icon" src="${icon}" alt="${p.label}">
          <span class="sc-name">${p.label}</span>
        </div>
        <div class="sc-bar-area">
          <div class="sc-bar-track">
            <div class="sc-bar-fill" style="--bar-pct: ${pct}%"></div>
          </div>
          <span class="sc-score">${score}/${maxScore}</span>
          ${badge}
        </div>
        <p class="sc-reason">${reason}</p>
      </div>`;
  }).join('');

  return `
    <div class="sc-panel">
      <div class="sc-heading">Score Breakdown</div>
      ${rows}
    </div>`;
}

function toggleScoreComparison() {
  const panel = document.getElementById('rec-score-comparison');
  const btn = document.getElementById('rec-score-toggle');
  const chevron = btn.querySelector('.score-toggle-chevron');
  const isHidden = panel.classList.toggle('hidden');
  chevron.textContent = isHidden ? '▾' : '▴';
  if (!isHidden) {
    // Trigger bar animation after reveal
    requestAnimationFrame(() => {
      panel.querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.add('animate'));
    });
  } else {
    panel.querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.remove('animate'));
  }
}

function showRecNav(hasSecondary) {
  const nav = document.getElementById('rec-nav');
  const alsoLink = document.getElementById('rec-nav-also');
  const alsoSep = document.getElementById('rec-nav-also-sep');
  nav.style.display = '';
  alsoLink.style.display = hasSecondary ? '' : 'none';
  alsoSep.style.display = hasSecondary ? '' : 'none';
}

function renderRecommendation() {
  if (fastTrack) {
    recommendedPlatformId = 'm365_copilot';
    document.getElementById('rec-primary-card').innerHTML =
      buildPlatformCard('m365_copilot', [], {}, true, false);
    document.getElementById('rec-pair-banner').classList.add('hidden');
    document.getElementById('rec-second-label').classList.add('hidden');
    document.getElementById('rec-second-card').innerHTML = '';
    document.getElementById('rec-fasttrack-prompt').classList.remove('hidden');
    document.getElementById('rec-score-toggle').classList.add('hidden');
    document.getElementById('rec-score-comparison').classList.add('hidden');
    // Hide nav for fast-track (no scores, no secondary)
    document.getElementById('rec-nav').style.display = 'none';
    renderDecisionCard();
    return;
  }

  document.getElementById('rec-fasttrack-prompt').classList.add('hidden');

  const ranked = rankPlatforms(answers);
  const top = ranked[0];
  recommendedPlatformId = top ? top.id : null;
  const second = ranked[1];

  if (!top || !second) {
    document.getElementById('rec-primary-card').innerHTML =
      '<div class="rec-card"><p>Unable to generate a recommendation. Please contact the CAT team.</p></div>';
    return;
  }

  document.getElementById('rec-primary-card').innerHTML =
    buildPlatformCard(top.id, ranked, answers, true, true);

  const pairBanner = document.getElementById('rec-pair-banner');
  const secondLabel = document.getElementById('rec-second-label');

  // Hide secondary card when second platform is "Not recommended" (score 0-5)
  if (second.label === 'Not recommended') {
    pairBanner.classList.add('hidden');
    secondLabel.classList.add('hidden');
    document.getElementById('rec-second-card').innerHTML = '';
    document.getElementById('rec-score-comparison').innerHTML = buildScoreComparison(ranked, answers);
    document.getElementById('rec-score-comparison').classList.remove('hidden');
    document.getElementById('rec-score-toggle').classList.add('hidden');
    requestAnimationFrame(() => {
      document.getElementById('rec-score-comparison').querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.add('animate'));
    });
    // Show nav without "Also Consider"
    showRecNav(false);
    renderDecisionCard();
    return;
  }

  const scoreDiff = top.score - second.score;
  const isPair = scoreDiff <= apa.scoring.tie_handling.threshold_points;
  const pairEntry = isPair
    ? (apa.scoring.tie_handling.valid_pairs || []).find(p =>
        p.platforms.includes(top.id) && p.platforms.includes(second.id))
    : null;

  if (pairEntry) {
    pairBanner.textContent = `💡 ${pairEntry.rationale}`;
    pairBanner.classList.remove('hidden');
    secondLabel.textContent = 'Complementary platform:';
    secondLabel.classList.remove('hidden');
  } else {
    pairBanner.classList.add('hidden');
    secondLabel.textContent = 'Also consider:';
    secondLabel.classList.remove('hidden');
  }

  document.getElementById('rec-second-card').innerHTML =
    buildPlatformCard(second.id, ranked, answers, false, false);

  document.getElementById('rec-score-comparison').innerHTML = buildScoreComparison(ranked, answers);
  document.getElementById('rec-score-comparison').classList.remove('hidden');
  document.getElementById('rec-score-toggle').classList.add('hidden');
  requestAnimationFrame(() => {
    document.getElementById('rec-score-comparison').querySelectorAll('.sc-bar-fill').forEach(bar => bar.classList.add('animate'));
  });

  // Show nav with "Also Consider"
  showRecNav(true);
  renderDecisionCard();
}

function restart() {
  answers = {};
  fastTrack = false;
  currentQuestionIndex = 0;
  recommendedPlatformId = null;
  isURLLoaded = false;
  originalPlatformId = null;
  originalDate = null;
  // Clear URL params
  if (window.location.search) {
    history.replaceState(null, '', window.location.pathname);
  }
  showSection('welcome-section');
  pushState('welcome-section');
}

function startFullAssessment() {
  fastTrack = false;
  answers = {};
  currentQuestionIndex = 0;
  renderQuestion();
  showSection('assessment-section');
  pushState('assessment-section', 0);
}

// === URL PARAMETER PARSING ===
// Returns { mode: 'card'|'wizard' } if valid params found, or null
function parseURLParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.size === 0) return null;

  const mode = params.get('mode') || 'card';
  originalPlatformId = params.get('r') || null;
  originalDate = params.get('d') || null;

  // Fast-track handling
  if (params.get('ft') === '1') {
    fastTrack = true;
    answers = {};
    return { mode };
  }

  // Build answers from URL params
  const questionIds = new Set(apa.questions.map(q => q.id));
  const validOptionIds = new Set();
  apa.questions.forEach(q => q.options.forEach(o => validOptionIds.add(o.id)));

  let hasValidAnswer = false;
  let hasDrift = false;

  questionIds.forEach(qId => {
    const value = params.get(qId);
    if (value && validOptionIds.has(value)) {
      answers[qId] = value;
      hasValidAnswer = true;
    } else if (value) {
      // Unknown option — schema drift, ignore
      hasDrift = true;
    }
  });

  // Check for questions in YAML not present in URL
  apa.questions.forEach(q => {
    if (!answers[q.id]) hasDrift = true;
  });

  if (!hasValidAnswer) return null;

  // Store drift flag for later display
  window._decisionCardDrift = hasDrift;

  fastTrack = false;
  return { mode };
}

// === DECISION CARD ===
function buildShareableURL() {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();

  if (fastTrack) {
    params.set('ft', '1');
  } else {
    apa.questions.forEach(q => {
      if (answers[q.id]) params.set(q.id, answers[q.id]);
    });
  }

  params.set('r', recommendedPlatformId || '');
  params.set('d', formatDate(new Date()));
  params.set('mode', 'card');

  return `${base}?${params.toString()}`;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function formatDateDisplay(yyyymmdd) {
  if (!yyyymmdd || yyyymmdd.length !== 8) return '';
  const y = yyyymmdd.substring(0, 4);
  const m = parseInt(yyyymmdd.substring(4, 6), 10);
  const d = parseInt(yyyymmdd.substring(6, 8), 10);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[m - 1]} ${d}, ${y}`;
}

// Compute key factors using delta algorithm: (winning_platform_score − best_runner_up_score)
function computeDecisionKeyFactors() {
  if (fastTrack || !recommendedPlatformId) return [];
  const ranked = rankPlatforms(answers);
  const runnerId = ranked.length > 1 ? ranked[1].id : null;

  const deltas = [];
  apa.questions.forEach(q => {
    const optionId = answers[q.id];
    if (!optionId) return;
    const option = q.options.find(o => o.id === optionId);
    if (!option) return;

    const winnerScore = option.scores[recommendedPlatformId] ?? 0;
    const runnerScore = runnerId ? (option.scores[runnerId] ?? 0) : 0;
    const delta = winnerScore - runnerScore;

    deltas.push({
      questionLabel: q.label,
      optionLabel: option.label,
      delta
    });
  });

  deltas.sort((a, b) => b.delta - a.delta);
  return deltas.slice(0, 3).filter(d => d.delta > 0);
}

function renderDecisionCard() {
  const card = document.getElementById('decision-card');
  const divider = document.getElementById('decision-card-divider');
  if (!card || !recommendedPlatformId) return;

  // Platform chip
  const platformMeta = apa.meta.platforms.find(p => p.id === recommendedPlatformId);
  const chipLabel = platformMeta ? platformMeta.label : recommendedPlatformId;
  document.getElementById('decision-card-chip').textContent = chipLabel;

  // Score
  const scoreEl = document.getElementById('decision-card-score');
  if (fastTrack) {
    scoreEl.textContent = '';
  } else {
    const ranked = rankPlatforms(answers);
    const entry = ranked.find(r => r.id === recommendedPlatformId);
    if (entry) {
      const maxScore = apa.scoring.raw_score_max || 15;
      const thresholdClass = entry.label.startsWith('Strong') ? 'threshold-strong'
        : entry.label.startsWith('Good') ? 'threshold-good' : 'threshold-possible';
      scoreEl.innerHTML = `${entry.score}/${maxScore} <span class="threshold-label ${thresholdClass}">— ${entry.label}</span>`;
    }
  }

  // Key factors
  const factors = computeDecisionKeyFactors();
  const factorsContainer = document.getElementById('decision-card-factors');
  const factorsList = document.getElementById('decision-card-factors-list');
  if (factors.length > 0) {
    factorsList.innerHTML = factors.map(f =>
      `<li>"${f.questionLabel}" → ${f.optionLabel}</li>`
    ).join('');
    factorsContainer.style.display = '';
  } else {
    factorsContainer.style.display = 'none';
  }

  // Recipient context (URL-loaded only)
  const contextEl = document.getElementById('decision-card-context');
  contextEl.style.display = isURLLoaded ? '' : 'none';

  // Temporal change banner
  const bannerEl = document.getElementById('decision-card-banner');
  if (isURLLoaded && originalPlatformId && originalPlatformId !== recommendedPlatformId) {
    const dateStr = originalDate ? formatDateDisplay(originalDate) : 'a previous visit';
    bannerEl.innerHTML = `Your recommendation has changed since ${dateStr}. The platform landscape has been updated. <a href="javascript:void(0)" onclick="restart()">Retake assessment →</a>`;
    bannerEl.style.display = '';
  } else {
    bannerEl.style.display = 'none';
  }

  // Schema drift note
  const driftEl = document.getElementById('decision-card-drift');
  if (window._decisionCardDrift) {
    driftEl.textContent = 'ℹ Some evaluation criteria have been updated since this recommendation was generated.';
    driftEl.style.display = '';
  } else {
    driftEl.style.display = 'none';
  }

  // Date
  const dateEl = document.getElementById('decision-card-date');
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  dateEl.textContent = `Generated ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  // Re-evaluate link (URL-loaded only)
  const reevalLink = document.getElementById('decision-card-reevaluate');
  const linksSep = document.getElementById('decision-card-links-sep');
  if (isURLLoaded) {
    reevalLink.style.display = '';
    linksSep.style.display = '';
    reevalLink.onclick = () => { window.location.href = buildShareableURL(); };
  } else {
    reevalLink.style.display = 'none';
    linksSep.style.display = 'none';
  }

  // Show card + divider + share anchor
  divider.style.display = '';
  card.style.display = '';
  const shareAnchor = document.getElementById('rec-share-anchor');
  if (shareAnchor) shareAnchor.style.display = '';
}

// === SHARE & DOWNLOAD ===
function copyShareLink() {
  const url = buildShareableURL();
  const btn = document.getElementById('decision-card-share');
  const originalText = btn.textContent;

  function showSuccess() {
    btn.textContent = '✓ Copied!';
    btn.classList.add('btn-decision-copied');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('btn-decision-copied');
    }, 2000);
  }

  function showError() {
    btn.textContent = 'Copy failed';
    btn.classList.add('btn-decision-error');
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('btn-decision-error');
    }, 2000);
    // Show manual copy input below card
    let fallback = document.getElementById('decision-card-fallback-url');
    if (!fallback) {
      fallback = document.createElement('input');
      fallback.id = 'decision-card-fallback-url';
      fallback.type = 'text';
      fallback.readOnly = true;
      fallback.style.cssText = 'width:100%;margin-top:8px;padding:8px;font-size:12px;border:1px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font-mono);';
      document.getElementById('decision-card').appendChild(fallback);
    }
    fallback.value = url;
    fallback.style.display = '';
    fallback.select();
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(showSuccess, () => {
      // Fallback: execCommand
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showSuccess();
      } catch { showError(); }
    });
  } else {
    try {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showSuccess();
    } catch { showError(); }
  }
}

document.addEventListener('DOMContentLoaded', boot);
