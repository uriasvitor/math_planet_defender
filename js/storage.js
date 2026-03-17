const DEFAULT_BEST = { add: 0, sub: 0, mul: 0, div: 0 };
const DEFAULT_FAILURES = {};

export class StorageManager {
  constructor(key) {
    this.key = key;
    this.best = { ...DEFAULT_BEST };
    this.failures = { ...DEFAULT_FAILURES };
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.best = { ...DEFAULT_BEST, ...(parsed.best || parsed) };
      this.failures = { ...(parsed.failures || {}) };
    } catch (err) {
      console.warn("Falha ao carregar recordes", err);
      this.best = { ...DEFAULT_BEST };
      this.failures = { ...DEFAULT_FAILURES };
    }
  }

  save() {
    try {
      const payload = { best: this.best, failures: this.failures };
      localStorage.setItem(this.key, JSON.stringify(payload));
    } catch (err) {
      console.warn("Falha ao salvar recordes", err);
    }
  }

  getBest(scenario) {
    return this.best[scenario] ?? 0;
  }

  registerScore(scenario, score) {
    const current = this.getBest(scenario);
    const isNew = score > current;
    if (isNew) {
      this.best[scenario] = score;
      this.save();
    }
    return isNew;
  }

  clearAll() {
    this.best = { ...DEFAULT_BEST };
    this.failures = { ...DEFAULT_FAILURES };
    this.save();
  }

  registerFailure(label, answer) {
    if (!label) return;
    const entry = this.failures[label] || { count: 0, answer };
    entry.count = (entry.count || 0) + 1;
    entry.answer = answer;
    this.failures[label] = entry;
    this.save();
  }

  getTopFailures(limit = 12) {
    const THRESHOLD = 10;
    const items = Object.keys(this.failures)
      .map((k) => ({ label: k, ...(this.failures[k] || {}) }))
      .filter((it) => (it.count || 0) >= THRESHOLD);
    items.sort((a, b) => (b.count || 0) - (a.count || 0));
    return items.slice(0, limit);
  }

  registerSuccess(label) {
    if (!label) return;
    const entry = this.failures[label];
    if (!entry) return;
    entry.count = Math.max(0, (entry.count || 0) - 1);
    if (entry.count <= 0) {
      delete this.failures[label];
    } else {
      this.failures[label] = entry;
    }
    this.save();
  }
}
