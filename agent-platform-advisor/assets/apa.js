// === STATE ===
let apa = null; // populated from YAML
let answers = {}; // { q1: 'q1a', q2: 'q2b', ... }
let fastTrack = false;
let currentQuestionIndex = 0;
let listenersReady = false;

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

// Applies 1.5x weight to Q7 if top two scores are within threshold.
// Returns new scores object (or same object if tiebreaker not needed).
function applyTiebreaker(scores, answersMap, questions, tbConfig) {
  const vals = Object.values(scores).sort((a, b) => b - a);
  if (vals[0] - vals[1] > tbConfig.applies_when_top_two_within) return scores;

  // Q7 not answered (early exit path) — skip tiebreaker
  if (!answersMap[tbConfig.question_id]) return scores;

  const q7 = questions.find(q => q.id === tbConfig.question_id);
  if (!q7) return scores;
  const selectedOpt = q7.options.find(o => o.id === answersMap[tbConfig.question_id]);
  if (!selectedOpt) return scores;

  const boosted = { ...scores };
  apa.meta.platforms.forEach(p => {
    boosted[p.id] = scores[p.id] + (selectedOpt.scores[p.id] ?? 0) * (tbConfig.weight_multiplier - 1);
  });
  return boosted;
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
  const raw = sumRawScores(answersMap, questions, zeroed);
  const tbConfig = apa.scoring.tiebreaker;
  const final = applyTiebreaker(raw, answersMap, apa.questions, tbConfig);

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
    factors.push(`${c.questionLabel}: ${c.optionLabel}`);
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
      <div class="rec-section-title">Watch out for</div>
      <ul class="rec-list">${watchOut}</ul>
    </div>`;
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
  document.getElementById('question-title').textContent = question.prompt;
  document.getElementById('question-subtitle').textContent = question.purpose || '';

  const optionsList = document.getElementById('options-list');
  optionsList.innerHTML = '';
  question.options.forEach(opt => {
    const div = document.createElement('div');
    div.className = 'option-card' + (answers[question.id] === opt.id ? ' selected' : '');
    div.innerHTML = `
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
