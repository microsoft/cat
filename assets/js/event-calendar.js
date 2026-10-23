(() => {
  const cards = document.getElementById('event-cards');
  const calendar = document.getElementById('event-calendar');
  const controls = document.getElementById('event-view-controls');
  const dayButtons = document.getElementById('event-days');
  const dayPanels = document.getElementById('event-calendar-days');
  const pending = document.getElementById('event-pending-list');
  const timeZone = 'America/Los_Angeles';
  const dayFormat = new Intl.DateTimeFormat('en-US', {
    timeZone, weekday: 'long', month: 'long', day: 'numeric'
  });
  const timeFormat = new Intl.DateTimeFormat('en-US', {
    timeZone, hour: 'numeric', minute: '2-digit'
  });
  const days = new Map();

  cards.querySelectorAll('.event-card').forEach(card => {
    const time = card.querySelector('time');
    if (!time) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = card.href;
      link.target = '_blank';
      link.rel = 'noopener';
      link.textContent = card.querySelector('h3').textContent;
      item.append(link);
      pending.append(item);
      return;
    }

    const start = time.dateTime;
    const end = time.dataset.end;
    const date = start.slice(0, 10);
    const minutes = value => Number(value.slice(11, 13)) * 60 + Number(value.slice(14, 16));
    if (!days.has(date)) days.set(date, []);
    days.get(date).push({ card, start, end, startMinute: minutes(start), endMinute: minutes(end) });
  });

  pending.closest('.event-pending').hidden = pending.childElementCount === 0;

  [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([date, sessions], index) => {
    sessions.sort((a, b) => a.startMinute - b.startMinute);
    const label = dayFormat.format(new Date(sessions[0].start));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline';
    button.textContent = label;
    button.id = `event-day-${date}`;
    button.setAttribute('aria-pressed', String(index === 1));
    button.setAttribute('aria-controls', `event-day-panel-${date}`);
    dayButtons.append(button);

    const panel = document.createElement('section');
    panel.id = `event-day-panel-${date}`;
    panel.setAttribute('aria-labelledby', button.id);
    panel.hidden = index !== 1;
    const heading = document.createElement('h3');
    heading.className = 'event-calendar-heading';
    heading.textContent = `${label}, 2026 · Las Vegas time (PDT)`;
    const scroll = document.createElement('div');
    scroll.className = 'event-calendar-scroll';
    scroll.tabIndex = 0;
    scroll.setAttribute('role', 'region');
    scroll.setAttribute('aria-label', `${label} time grid; scroll horizontally on small screens`);
    const grid = document.createElement('div');
    grid.className = 'event-time-grid';
    const firstMinute = Math.floor(sessions[0].startMinute / 60) * 60;
    const lastMinute = Math.ceil(Math.max(...sessions.map(session => session.endMinute)) / 60) * 60;
    grid.style.gridTemplateRows = `repeat(${(lastMinute - firstMinute) / 15}, 48px)`;

    for (let minute = firstMinute; minute < lastMinute; minute += 30) {
      const tick = document.createElement('span');
      tick.className = 'event-time-label';
      tick.textContent = timeFormat.format(new Date(`${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}:00-07:00`));
      tick.style.gridRow = `${(minute - firstMinute) / 15 + 1} / span 2`;
      const line = document.createElement('div');
      line.className = 'event-time-line';
      line.style.gridRow = tick.style.gridRow;
      line.setAttribute('aria-hidden', 'true');
      grid.append(tick, line);
    }

    // Allocate columns per overlapping group; non-overlapping sessions use the full width.
    const groups = [];
    sessions.forEach(session => {
      let group = groups[groups.length - 1];
      if (!group || session.startMinute >= group.endMinute) {
        group = { sessions: [], laneEnds: [], endMinute: session.endMinute };
        groups.push(group);
      }
      let lane = group.laneEnds.findIndex(end => end <= session.startMinute);
      if (lane === -1) lane = group.laneEnds.length;
      group.laneEnds[lane] = session.endMinute;
      group.endMinute = Math.max(group.endMinute, session.endMinute);
      group.sessions.push({ ...session, lane });
    });

    const laneCount = Math.max(...groups.map(group => group.laneEnds.length));
    grid.style.gridTemplateColumns = `76px repeat(${laneCount}, minmax(260px, 1fr))`;
    groups.forEach(group => {
      group.sessions.forEach(session => {
        const link = document.createElement('a');
        link.href = session.card.href;
        link.target = '_blank';
        link.rel = 'noopener';
        link.className = 'event-calendar-session';
        link.style.gridRow = `${(session.startMinute - firstMinute) / 15 + 1} / span ${(session.endMinute - session.startMinute) / 15}`;
        link.style.gridColumn = group.laneEnds.length === 1 ? '2 / -1' : String(session.lane + 2);
        const time = document.createElement('span');
        time.className = 'event-card-date';
        time.textContent = `${timeFormat.format(new Date(session.start))}–${timeFormat.format(new Date(session.end))} PDT`;
        const title = document.createElement('h4');
        title.textContent = session.card.querySelector('h3').textContent;
        const room = session.card.querySelector('.event-card-room').cloneNode(true);
        const speakers = session.card.querySelector('.event-card-speakers').cloneNode(true);
        link.append(time, title, room, speakers);
        grid.append(link);
      });
    });
    scroll.append(grid);
    panel.append(heading, scroll);
    dayPanels.append(panel);

    button.addEventListener('click', () => {
      [...dayButtons.children].forEach(day => day.setAttribute('aria-pressed', String(day === button)));
      [...dayPanels.children].forEach(day => { day.hidden = day !== panel; });
    });
  });

  controls.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', () => {
      const showCalendar = button.dataset.eventView === 'calendar';
      calendar.hidden = !showCalendar;
      cards.hidden = showCalendar;
      controls.querySelectorAll('button').forEach(view => {
        view.setAttribute('aria-pressed', String(view === button));
      });
    });
  });
  cards.classList.add('visible');
  cards.hidden = true;
  calendar.hidden = false;
  controls.hidden = false;
})();
