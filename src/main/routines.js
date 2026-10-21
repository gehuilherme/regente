// Rotinas: prompts agendados entregues a um terminal (ou lembretes na área de trabalho).
const { uid } = require('./store');

// "45s", "30m", "2h", "1h30m" -> ms
function parseEvery(s) {
  const m = String(s || '').match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  if (!m || !m[0]) return null;
  const ms = ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0)) * 1000;
  return ms >= 10000 ? ms : null;
}

// Próximo disparo a partir de `from` para um agendamento.
function nextRun(r, from = Date.now()) {
  if (r.every) return from + r.every;
  if (r.daily || r.weekly) {
    const [hh, mm] = (r.daily || r.weekly.split('@')[1] || '09:00').split(':').map(Number);
    const days = r.weekly ? r.weekly.split('@')[0].split(',').map((d) => ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(d.trim().slice(0, 3).toLowerCase())) : null;
    const d = new Date(from);
    d.setSeconds(0, 0);
    d.setHours(hh, mm);
    for (let i = 0; i < 8; i++) {
      if (d.getTime() > from && (!days || days.includes(d.getDay()))) return d.getTime();
      d.setDate(d.getDate() + 1);
      d.setHours(hh, mm);
    }
  }
  if (r.at) return r.at > from ? r.at : null;
  return null;
}

class Routines {
  constructor({ store, sessions, deliver, notify, tr = (k, v) => k.replace(/\{(\w+)\}/g, (m, x) => v?.[x] ?? m) }) {
    Object.assign(this, { store, sessions, deliver, notify, tr });
    store.state.routines ||= [];
    this.timer = setInterval(() => this.tick(), 5000);
  }

  get list() { return this.store.state.routines; }

  add(spec) {
    const r = {
      id: uid('rt-'), target: spec.target, prompt: spec.prompt, reminder: !!spec.reminder,
      every: spec.every ? parseEvery(spec.every) : undefined, daily: spec.daily, weekly: spec.weekly,
      at: spec.once ? Date.now() + (parseEvery(spec.once) || 0) : undefined,
      count: spec.count ? Number(spec.count) : undefined, until: spec.until ? Date.parse(spec.until) : undefined,
      skipIfBusy: spec.skipIfBusy !== false, enabled: spec.enabled !== false, runs: 0, createdAt: Date.now(),
    };
    if (spec.every && !r.every) throw new Error('intervalo inválido (use 45s, 30m, 2h, 1h30m; mínimo 10s)');
    if (!r.every && !r.daily && !r.weekly && !r.at) throw new Error('informe --every, --daily HH:MM, --weekly mon,wed@HH:MM ou --once <atraso>');
    r.next = nextRun(r);
    this.list.push(r);
    this.store.save();
    return r;
  }

  remove(id) {
    const before = this.list.length;
    this.store.state.routines = this.list.filter((r) => r.id !== id);
    this.store.save();
    return before !== this.list.length;
  }

  update(id, patch) {
    const r = this.list.find((x) => x.id === id);
    if (!r) return null;
    Object.assign(r, patch);
    if (patch.enabled) r.next = nextRun(r);
    this.store.save();
    return r;
  }

  tick() {
    const now = Date.now();
    for (const r of this.list) {
      if (!r.enabled || !r.next || r.next > now) continue;
      r.next = nextRun(r, now);
      const done = (r.count && r.runs + 1 >= r.count) || (r.until && now > r.until);
      try {
        if (r.reminder) {
          this.notify('Lembrete do Regente', r.prompt);
        } else {
          const hit = this.store.findNode(r.target);
          const s = this.sessions.get(r.target);
          if (!hit || !s || s.status === 'exited') { r.lastResult = 'terminal não está rodando'; continue; }
          if (r.skipIfBusy && (s.status === 'working' || s.status === 'waiting')) { r.lastResult = 'pulado: terminal ocupado'; continue; }
          this.deliver(hit.node, this.tr('[Regente] Rotina agendada:\n{prompt}', { prompt: r.prompt }));
        }
        r.runs++;
        r.lastRun = now;
        r.lastResult = 'ok';
      } catch (e) { r.lastResult = e.message; }
      if (done || !r.next) r.enabled = false;
      this.store.save();
    }
  }

  stop() { clearInterval(this.timer); }
}

module.exports = { Routines, parseEvery, nextRun };
