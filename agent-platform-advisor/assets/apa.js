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
      ${rec.persona_tips && rec.persona_tips[answersMap.q1]
        ? `<div class="rec-dev-note">${rec.persona_tips[answersMap.q1]}</div>`
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
