(() => {
  const themeToggle = document.getElementById('theme-toggle');
  const updateThemeToggle = () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    themeToggle.textContent = dark ? 'Light theme' : 'Dark theme';
    themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  };
  themeToggle.addEventListener('click', () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    updateThemeToggle();
  });
  updateThemeToggle();

  const purposeLabels = {
    'Copilot Agent Kit': 'Test & evaluate',
    'Agent Resources': 'Explore the ecosystem',
    'The Custom Engine Blog': 'Engineering insights',
    'Copilot Studio Samples': 'Working examples',
    'Copilot Studio Community Gallery': 'Agents & workflows',
    'Agent Skills & Plugins Gallery': 'Skills & plugins',
    'Agent Build-A-Thon': 'Hands-on building',
    'Architecture Bootcamp': 'Architect training',
    'Microsoft Copilot Agents Labs': 'Hands-on labs',
    'Architecture Center': 'Architecture patterns',
    'Architect Agent Solutions': 'Agent design patterns',
    'Copilot Studio Guidance': 'Adoption strategy',
    'Adopt Agentic AI at Scale': 'Organizational readiness',
    'Agentic Transformation Patterns Playbook': 'Transformation playbook',
    'Copilot Studio Technical Guide for the GitHub Copilot Harness': 'Technical implementation',
    'Customer Stories': 'Customer inspiration',
    'Customer Story Videos': 'See real-world impact',
    'Share Your Story': 'Contribute your experience'
  };
  const excludedResources = new Set([
    'https://github.com/microsoft/skills-for-copilot-studio',
    'https://aka.ms/agiad',
    'programs/ai-webinar.html'
  ]);
  const timeZone = 'America/Los_Angeles';
  const timeFormat = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' });
  const weekdayFormat = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' });
  const dateFormat = new Intl.DateTimeFormat('en-US', { timeZone, month: 'long', day: 'numeric' });
  const status = document.getElementById('load-status');
  const errorPanel = document.getElementById('load-error');
  const retry = document.getElementById('retry');

  const text = (parent, selector) => {
    const value = parent.querySelector(selector)?.textContent.trim();
    if (!value) throw new Error(`The source page is missing ${selector}.`);
    return value;
  };
  const element = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  };
  const sourceLink = (href, base, className) => {
    if (!href) throw new Error('A source resource or session is missing its link.');
    const url = new URL(href, base);
    if (!['https:', 'http:'].includes(url.protocol)) throw new Error('A source link has an unsupported protocol.');
    const link = element('a', className);
    link.href = url.href;
    link.target = '_blank';
    link.rel = 'noopener';
    return link;
  };

  const buildResources = (source, base) => {
    const fragment = document.createDocumentFragment();
    const groups = [
      ['#tools', 'Resources & Tools', 'Build, test, and extend your agents with practical tools, working examples, and community contributions.'],
      ['#programs', 'Learning and Programs', 'Grow your skills through hands-on labs, build-a-thons, and architecture training.'],
      ['#guidance', 'Guidance', 'Plan your agentic transformation with proven patterns, adoption playbooks, and technical guidance.'],
      ['#stories', 'Stories', 'See how organizations are putting agents to work, find inspiration, and share your own experience.']
    ];
    groups.forEach(([selector, label, subtitle]) => {
      const cards = [...source.querySelectorAll(`${selector} a.card, ${selector} a.bento-featured, ${selector} a.story-featured`)]
        .filter(card => !excludedResources.has(card.getAttribute('href')))
        .map(card => ({
          href: card.getAttribute('href'),
          title: text(card, '.card-title, .bento-featured-title'),
          description: text(card, '.card-desc, .bento-featured-desc')
            .replace('from the CAT team', 'from Microsoft engineers')
            .replace('hosted by CAT', 'hosted by Microsoft'),
          cta: text(card, '.btn')
        }));
      if (!cards.length) throw new Error(`No resources were found in ${selector}.`);
      if (selector === '#guidance') {
        cards.push({
          href: 'https://aka.ms/AgenticTransformationPatterns',
          title: 'Agentic Transformation Patterns Playbook',
          description: 'Choose adoption patterns, assess your maturity, and build an operating model and 90-day plan for scaling AI agents across your organization.',
          cta: 'Read the playbook (PDF)'
        });
      }
      const group = element('section', 'resource-group');
      const heading = element('h3', 'resource-group-title', label);
      heading.id = `resources-${selector.slice(1)}`;
      group.setAttribute('aria-labelledby', heading.id);
      const description = element('p', 'resource-group-subtitle', subtitle);
      description.id = `${heading.id}-description`;
      group.setAttribute('aria-describedby', description.id);
      const grid = element('div', 'resource-grid');
      cards.forEach(({ href, title, description, cta }) => {
        const link = sourceLink(href, base, 'resource-card');
        link.append(
          element('span', 'tag', purposeLabels[title] || label),
          element('h4', '', title),
          element('p', '', description),
          element('span', 'resource-cta', `${cta} \u2197`)
        );
        grid.append(link);
      });
      group.append(heading, description, grid);
      fragment.append(group);
    });
    return fragment;
  };

  const buildWeek = (source, base) => {
    const cards = source.querySelectorAll('#event-cards .event-card');
    if (!cards.length) throw new Error('No conference sessions were found.');
    const days = new Map();
    const pending = document.createDocumentFragment();
    cards.forEach(card => {
      const title = text(card, 'h3');
      const time = card.querySelector('time');
      if (!time) {
        const item = element('li');
        const link = sourceLink(card.getAttribute('href'), base);
        link.textContent = title;
        item.append(link);
        pending.append(item);
        return;
      }
      const start = new Date(time.dateTime);
      const end = new Date(time.dataset.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
        throw new Error(`Invalid schedule for ${title}.`);
      }
      const date = time.dateTime.slice(0, 10);
      if (!days.has(date)) days.set(date, []);
      days.get(date).push({ card, title, start, end });
    });

    const week = document.createDocumentFragment();
    [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([date, sessions]) => {
      sessions.sort((a, b) => a.start - b.start);
      const day = element('section', 'day-column');
      day.setAttribute('aria-labelledby', `day-${date}`);
      const header = element('div', 'day-heading');
      const heading = element('h3', '', weekdayFormat.format(sessions[0].start));
      heading.id = `day-${date}`;
      header.append(element('span', '', dateFormat.format(sessions[0].start)), heading);
      const list = element('ol', 'day-sessions');
      sessions.forEach(({ card, title, start, end }) => {
        const item = element('li');
        const link = sourceLink(card.getAttribute('href'), base, 'session');
        const time = element('time', 'session-time', `${timeFormat.format(start)}\u2013${timeFormat.format(end)} PDT`);
        time.dateTime = start.toISOString();
        const kind = card.classList.contains('event-card--workshop') ? 'Full-day workshop' : 'Conference session';
        link.append(
          time,
          element('div', 'session-kind', kind),
          element('h4', '', title),
          element('p', 'session-room', text(card, '.event-card-room')),
          element('p', 'session-speakers', text(card, '.event-card-speakers'))
        );
        item.append(link);
        list.append(item);
      });
      day.append(header, list);
      week.append(day);
    });
    return { week, pending };
  };

  const load = async () => {
    status.hidden = false;
    errorPanel.hidden = true;
    retry.disabled = true;
    try {
      const response = await fetch(new URL('../index.html', window.location.href));
      if (!response.ok) throw new Error(`The resource page returned HTTP ${response.status}.`);
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const resources = buildResources(source, response.url);
      const { week, pending } = buildWeek(source, response.url);
      const scheduleSource = source.querySelector('.event-schedule-note a');
      if (!scheduleSource) throw new Error('The conference schedule link is missing.');
      const scheduleHref = sourceLink(scheduleSource.getAttribute('href'), response.url).href;
      document.getElementById('resource-grid').replaceChildren(resources);
      document.getElementById('week-grid').replaceChildren(week);
      const pendingList = document.getElementById('pending-list');
      pendingList.replaceChildren(pending);
      document.getElementById('pending-sessions').hidden = pendingList.childElementCount === 0;
      document.getElementById('schedule-link').href = scheduleHref;
      document.getElementById('schedule-content').hidden = false;
    } catch (error) {
      console.error('Unable to load the PPCC resources and schedule:', error);
      document.getElementById('error-detail').textContent = error instanceof Error ? error.message : 'An unexpected loading error occurred.';
      errorPanel.hidden = false;
    } finally {
      status.hidden = true;
      retry.disabled = false;
    }
  };
  retry.addEventListener('click', load);
  load();
})();
