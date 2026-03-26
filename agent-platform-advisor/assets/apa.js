// === STATE ===
let apa = null; // populated from YAML
let answers = {}; // { q1: 'q1a', q2: 'q2b', ... }
let fastTrack = false;
let currentQuestionIndex = 0;
let listenersReady = false;
let recommendedPlatformId = null;

// === UTILITIES ===
function showSection(id) {
  ['loading-section','error-section','welcome-section','prescreen-section',
   'assessment-section','recommendation-section'].forEach(s => {
    const el = document.getElementById(s);
    if (el) el.classList.toggle('hidden', s !== id);
  });
  updateProgressBar(id);
}

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
  q5d: { zero: ['agent_builder', 'm365_copilot', 'copilot_studio'] },
  q6c: { zero: ['agent_builder', 'm365_copilot'] },
  q8b: { zero: ['agent_builder', 'm365_copilot'] },
  q8c: { zero: ['agent_builder', 'm365_copilot'] },
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
  q5d: 'Full infrastructure control selected — Foundry is the only viable platform',
  q6c: 'Strict compliance (sovereign cloud / regulatory) — Foundry required',
  q8b: 'External user audience — Agent Builder and M365 Copilot cannot publish externally',
  q8c: 'Mixed audience (internal + external) — Agent Builder and M365 Copilot cannot publish externally',
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

  const bestFor = (rec.best_for || []).map(f => `<li>${f}</li>`).join('');
  const watchOut = (rec.watch_out_for || []).map(f => `<li>${f}</li>`).join('');
  const firstPartyHtml = (rec.first_party_agents || []).length > 0 ? `
    <div class="rec-section-title">Available 1st Party Copilot Agents</div>
    <ul class="rec-list">${rec.first_party_agents.map(a => {
      const label = a.url
        ? `<a href="${a.url}" target="_blank" rel="noopener noreferrer">${a.label}</a>`
        : a.label;
      return `<li><strong>${label}</strong> — ${a.description}</li>`;
    }).join('')}</ul>` : '';

  const templatesHtml = (rec.templates || []).length > 0 ? `
    <div class="rec-section-title">Available Templates</div>
    <ul class="rec-list">${rec.templates.map(t => {
      const label = t.url
        ? `<a href="${t.url}" target="_blank" rel="noopener noreferrer">${t.label}</a>`
        : t.label;
      return `<li><strong>${label}</strong> — ${t.description}</li>`;
    }).join('')}</ul>` : '';

  return `
    <div class="rec-card ${isPrimary ? 'primary' : 'secondary'}">
      <div class="rec-header">
        <img class="rec-platform-icon" src="${icon}" alt="${rec.headline}">
        <div>
          <div class="rec-platform-name">${rec.headline}${badgeHtml}</div>
        </div>
      </div>
      <p class="rec-summary">${rec.summary}</p>
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
    showSection('welcome-section');
    setupListeners();
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
  });
  document.getElementById('next-btn').addEventListener('click', handleNext);
  document.getElementById('prev-btn').addEventListener('click', handlePrev);
}

function handlePrescreenYes() {
  fastTrack = true;
  answers = {};
  renderRecommendation();
  showSection('recommendation-section');
}

function handlePrescreenNo() {
  fastTrack = false;
  answers = {};
  currentQuestionIndex = 0;
  renderQuestion();
  showSection('assessment-section');
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
    const isSelected = answers[question.id] === opt.id;
    div.innerHTML = `
      <div class="option-radio-indicator" aria-hidden="true">
        <div class="option-radio-outer">${isSelected ? '<div class="option-radio-inner"></div>' : ''}</div>
      </div>
      <div class="option-content">
        <div class="option-label">${opt.label}</div>
      </div>`;
    div.addEventListener('click', () => {
      answers[question.id] = opt.id;
      renderQuestion(); // re-render to show selection
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

  // Early exit: q5d skips remaining questions
  if (answers[question.id] === 'q5d') {
    renderRecommendation();
    showSection('recommendation-section');
    return;
  }

  if (currentQuestionIndex < apa.questions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    renderRecommendation();
    showSection('recommendation-section');
  }
}

function handlePrev() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  } else {
    showSection('prescreen-section');
  }
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

  const scoreDiff = top.score - second.score;
  const isPair = scoreDiff <= apa.scoring.tie_handling.threshold_points;
  const pairEntry = isPair
    ? (apa.scoring.tie_handling.valid_pairs || []).find(p =>
        p.platforms.includes(top.id) && p.platforms.includes(second.id))
    : null;

  const pairBanner = document.getElementById('rec-pair-banner');
  const secondLabel = document.getElementById('rec-second-label');

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
}

function restart() {
  answers = {};
  fastTrack = false;
  currentQuestionIndex = 0;
  recommendedPlatformId = null;
  showSection('welcome-section');
}

function startFullAssessment() {
  fastTrack = false;
  answers = {};
  currentQuestionIndex = 0;
  renderQuestion();
  showSection('assessment-section');
}

document.addEventListener('DOMContentLoaded', boot);
