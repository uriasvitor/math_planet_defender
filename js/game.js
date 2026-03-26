import {
  scenarios,
  TOTAL_TIME,
  formatTime,
  maxDigitsByScenario,
} from "./config.js";
import { ProblemGenerator } from "./problems.js";

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

const HOSTILE_KINDS = new Set(["asteroid", "minion"]);
const HEART_SPAWN_CHANCE = 0.06;
const POWER_UP_SPAWN_CHANCE = 0.018;
const POWER_MATCH_DURATION = 5;
const DEFAULT_DIFFICULTY_PROFILES = {
  easy: 0.85,
  normal: 1,
  hard: 1.2,
  insane: 1.4,
};

const PACE_PROFILES = {
  add: { start: 0.16, end: 1.05, curve: 1.2 },
  train: { start: 0.14, end: 0.95, curve: 1.25 },
  sandbox: { start: 0.14, end: 0.95, curve: 1.2 },
  recuperacao: { start: 0.16, end: 0.98, curve: 1.2 },
  sub: { start: 0.18, end: 1.12, curve: 1.1 },
  mul: { start: 0.18, end: 1.08, curve: 1.28 },
  div: { start: 0.18, end: 1.08, curve: 1.1 },
  sqrt: { start: 0.16, end: 1.0, curve: 1.1 },
  pow: { start: 0.18, end: 1.08, curve: 1.1 },
  percent: { start: 0.18, end: 1.08, curve: 1.1 },
  decimal: { start: 0.18, end: 1.08, curve: 1.1 },
  default: { start: 0.18, end: 1.05, curve: 1.1 },
};

const DEFAULT_GAME_CONFIG = {
  difficultyLevel: "normal",
  difficultyMultiplier: 1,
  difficultyProfiles: { ...DEFAULT_DIFFICULTY_PROFILES },
  heartsEnabled: true,
  lifePerHeart: 1,
  bossEnabled: true,
  baseLife: 3,
  maxLife: 0,
  bossHp: 300,
  bossDamagePerHit: 30,
  bossBarEnabled: true,
  powerUpsEnabled: true,
  powerMatchEnabled: true,
  powerClearEnabled: true,
  heartSpawnChance: HEART_SPAWN_CHANCE,
  powerUpSpawnChance: POWER_UP_SPAWN_CHANCE,
  powerMatchChance: 0.5,
  powerClearChance: 0.5,
  matchPowerDuration: POWER_MATCH_DURATION,
  paceMultiplier: 1,
  enemySpeedMultiplier: 1,
  scoreMultiplier: 1,
};

function toNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export class Game {
  constructor({
    renderer,
    hud,
    audio,
    storage,
    answerInput,
    onRunStart,
    gameConfig = {},
  }) {
    this.renderer = renderer;
    this.hud = hud;
    this.audio = audio;
    this.storage = storage;
    this.answerInput = answerInput;
    this.problemGen = new ProblemGenerator();
    this.mods = { autoReset: false, oneStrike: false };
    this.onRunStart = typeof onRunStart === "function" ? onRunStart : null;
    this.settings = this.normalizeGameConfig(gameConfig);

    // training elapsed time counter (unbounded) so training pace can grow
    this._trainingElapsed = 0;

    this.state = this.createInitialState();
    this.hud.setPhaseLabel(this.getScenarioLabel());
  }

  setMods(mods = {}) {
    this.mods = {
      autoReset: !!mods.autoReset,
      autoResetOnLoss: !!mods.autoResetOnLoss,
      oneStrike: !!mods.oneStrike,
    };
  }

  normalizeGameConfig(config = {}) {
    const merged = { ...DEFAULT_GAME_CONFIG, ...(config || {}) };
    const rawProfiles = {
      ...DEFAULT_DIFFICULTY_PROFILES,
      ...(merged.difficultyProfiles || {}),
    };
    const difficultyProfiles = {
      easy: Math.max(0.4, Math.min(3, toNumber(rawProfiles.easy, 0.85))),
      normal: Math.max(0.4, Math.min(3, toNumber(rawProfiles.normal, 1))),
      hard: Math.max(0.4, Math.min(3, toNumber(rawProfiles.hard, 1.2))),
      insane: Math.max(0.4, Math.min(3, toNumber(rawProfiles.insane, 1.4))),
    };
    const level = String(merged.difficultyLevel || "normal").toLowerCase();
    return {
      difficultyLevel: difficultyProfiles[level] ? level : "normal",
      difficultyMultiplier: Math.max(
        0.5,
        Math.min(3, toNumber(merged.difficultyMultiplier, 1)),
      ),
      difficultyProfiles,
      heartsEnabled: Boolean(merged.heartsEnabled),
      lifePerHeart: Math.max(1, Math.min(99, Math.floor(toNumber(merged.lifePerHeart, 1)))),
      bossEnabled: Boolean(merged.bossEnabled),
      baseLife: Math.max(1, Math.floor(toNumber(merged.baseLife, 3))),
      maxLife: Math.max(0, Math.floor(toNumber(merged.maxLife, 0))),
      bossHp: Math.max(20, Math.floor(toNumber(merged.bossHp, 300))),
      bossDamagePerHit: Math.max(
        1,
        Math.floor(toNumber(merged.bossDamagePerHit, 30)),
      ),
      bossBarEnabled: Boolean(merged.bossBarEnabled),
      powerUpsEnabled: Boolean(merged.powerUpsEnabled),
      powerMatchEnabled: Boolean(merged.powerMatchEnabled),
      powerClearEnabled: Boolean(merged.powerClearEnabled),
      heartSpawnChance: Math.max(
        0,
        Math.min(0.4, toNumber(merged.heartSpawnChance, HEART_SPAWN_CHANCE)),
      ),
      powerUpSpawnChance: Math.max(
        0,
        Math.min(0.2, toNumber(merged.powerUpSpawnChance, POWER_UP_SPAWN_CHANCE)),
      ),
      powerMatchChance: Math.max(
        0,
        Math.min(1, toNumber(merged.powerMatchChance, 0.5)),
      ),
      powerClearChance: Math.max(
        0,
        Math.min(1, toNumber(merged.powerClearChance, 0.5)),
      ),
      matchPowerDuration: Math.max(
        1,
        Math.min(20, toNumber(merged.matchPowerDuration, POWER_MATCH_DURATION)),
      ),
      paceMultiplier: Math.max(
        0.4,
        Math.min(3, toNumber(merged.paceMultiplier, 1)),
      ),
      enemySpeedMultiplier: Math.max(
        0.4,
        Math.min(3, toNumber(merged.enemySpeedMultiplier, 1)),
      ),
      scoreMultiplier: Math.max(
        0.2,
        Math.min(5, toNumber(merged.scoreMultiplier, 1)),
      ),
    };
  }

  setGameConfig(config = {}) {
    this.settings = this.normalizeGameConfig({ ...this.settings, ...config });
    const lifeCap = this.getLifeCap();
    if (this.state && (!this.state.running || this.state.gameOver)) {
      this.state.baseLife = this.settings.baseLife;
    }
    if (this.state && lifeCap > 0) {
      this.state.baseLife = Math.min(this.state.baseLife, lifeCap);
    }
    if (this.state && Array.isArray(this.state.enemies)) {
      this.state.enemies = this.state.enemies.filter((enemy) => {
        if (enemy.kind === "heart" && !this.settings.heartsEnabled) return false;
        if (
          enemy.kind === "power_match" &&
          (!this.settings.powerUpsEnabled || !this.settings.powerMatchEnabled)
        )
          return false;
        if (
          enemy.kind === "power_clear" &&
          (!this.settings.powerUpsEnabled || !this.settings.powerClearEnabled)
        )
          return false;
        return true;
      });
    }
    if (this.state && !this.settings.bossEnabled) {
      this.state.bossActive = false;
      this.state.boss = null;
      this.state.bossSpawned = false;
    }
    if (this.state) this.updateHud();
  }

  getDifficultyFactor() {
    const base =
      this.settings.difficultyProfiles?.[this.settings.difficultyLevel] || 1;
    return base * this.settings.difficultyMultiplier;
  }

  getConfiguredEnemySpeed(baseSpeed) {
    const base = toNumber(baseSpeed, 45);
    const scaled =
      base * this.settings.enemySpeedMultiplier * this.getDifficultyFactor();
    return Math.max(15, scaled);
  }

  addScore(points) {
    const scaled = toNumber(points, 0) * this.settings.scoreMultiplier;
    this.state.score += Math.max(0, Math.round(scaled));
  }

  createInitialState() {
    return {
      running: false,
      gameOver: false,
      enemies: [],
      bullets: [],
      score: 0,
      baseLife: this.settings.baseLife,
      scenario: "add",
      trainingDigits: 1,
      trainingOperation: "add",
      spawnTimer: 0,
      nextSpawn: scenarios.add.spawn,
      speedBoost: 0,
      enemyId: 1,
      timeLeft: TOTAL_TIME,
      totalTime: TOTAL_TIME,
      bossSpawned: false,
      bossActive: false,
      boss: null,
      bossMinionTimer: 0,
      matchPowerTimer: 0,
      recentSpawnXs: [],
    };
  }

  get elapsed() {
    if (this.isTraining()) return this._trainingElapsed;
    return this.state.totalTime - this.state.timeLeft;
  }

  getWave() {
    return Math.max(1, 1 + Math.floor(this.elapsed / 30));
  }

  getHealthStatus() {
    if (this.isTraining()) return { label: "INF", cls: "ok" };
    if (this.state.baseLife >= 3) return { label: "OK", cls: "ok" };
    if (this.state.baseLife === 2) return { label: "WARN", cls: "warn" };
    return { label: "CRIT", cls: "crit" };
  }

  getLifeCap() {
    const cap = Math.max(0, Math.floor(toNumber(this.settings.maxLife, 0)));
    // A cap at or below the starting life makes heart pickups look broken,
    // so only enforce it when it is above the initial amount.
    if (cap <= this.settings.baseLife) return 0;
    return cap;
  }

  getPace() {
    const profile = PACE_PROFILES[this.state.scenario] || PACE_PROFILES.default;
    const progressWindow = this.isTraining() ? 360 : TOTAL_TIME;
    const progress = Math.min(1, this.elapsed / progressWindow);
    const easedProgress = Math.pow(progress, profile.curve);
    const raw = lerp(profile.start, profile.end, easedProgress);
    const scaled = raw * this.settings.paceMultiplier * this.getDifficultyFactor();
    return Math.max(0.05, scaled);
  }

  isTraining() {
    return this.state.scenario === "train";
  }

  normalizeTrainingDigits(digits) {
    const fallback = this.state.trainingDigits || 1;
    const value = Number.isFinite(digits) ? Math.floor(digits) : fallback;
    const cap = maxDigitsByScenario.train;
    const clamped = Number.isFinite(cap) ? Math.min(value, cap) : value;
    return Math.max(1, clamped);
  }

  getProblemOptions() {
    if (!this.isTraining()) return undefined;
    return {
      digits: this.state.trainingDigits,
      operation: this.state.trainingOperation,
    };
  }

  getScenarioLabel() {
    const scenarioName = scenarios[this.state.scenario].name;
    if (this.state.scenario === "train") {
      const digits = this.state.trainingDigits;
      const unit = digits === 1 ? "digito" : "digitos";
      const opName = scenarios[this.state.trainingOperation]
        ? scenarios[this.state.trainingOperation].name
        : this.state.trainingOperation;
      return `${scenarioName} - ${digits} ${unit} (${opName})`;
    }
    if (this.state.scenario !== "add") return scenarioName;
    const stage = this.problemGen.currentStageIndex(this.elapsed) + 1;
    return `${scenarioName} - Treino ${stage}`;
  }

  getRandomElapsedForHeart() {
    const currentStage = this.problemGen.currentStageIndex(this.elapsed);
    const stage = randInt(currentStage, 2);
    if (stage === 0) return 0;
    if (stage === 1) return 60;
    return 120;
  }

  isHostileKind(kind) {
    return HOSTILE_KINDS.has(kind);
  }

  answersMatch(expected, provided) {
    if (!Number.isFinite(expected) || !Number.isFinite(provided)) return false;
    if (Number.isInteger(expected) && Number.isInteger(provided)) {
      return provided === expected;
    }
    const tol = 1e-4;
    if (Math.abs(provided - expected) <= tol) return true;
    return Number(provided.toFixed(4)) === Number(expected.toFixed(4));
  }

  rememberSpawnX(x) {
    if (!Number.isFinite(x)) return;
    const recent = this.state.recentSpawnXs || [];
    recent.push(x);
    if (recent.length > 5) recent.shift();
    this.state.recentSpawnXs = recent;
  }

  pickSpawnX() {
    const minX = 80;
    const maxX = this.renderer.canvas.width - 80;
    if (maxX <= minX) return this.renderer.canvas.width / 2;
    const recent = this.state.recentSpawnXs || [];
    const spread = maxX - minX;
    const minSpacing = Math.max(56, Math.min(140, Math.floor(spread * 0.22)));
    let x = randInt(minX, maxX);
    for (let i = 0; i < 8; i += 1) {
      const candidate = randInt(minX, maxX);
      if (recent.every((prev) => Math.abs(prev - candidate) >= minSpacing)) {
        x = candidate;
        break;
      }
      x = candidate;
    }
    this.rememberSpawnX(x);
    return x;
  }

  createTwoDigitMultiplicationProblem() {
    const a = randInt(10, 99);
    const b = randInt(10, 99);
    return { label: `${a} x ${b}`, answer: a * b };
  }

  hasEnabledPowerUps() {
    if (!this.settings.powerUpsEnabled) return false;
    return this.settings.powerMatchEnabled || this.settings.powerClearEnabled;
  }

  pickPowerUpKind(force = false) {
    const canMatch = this.settings.powerMatchEnabled;
    const canClear = this.settings.powerClearEnabled;
    if (!canMatch && !canClear && !force) return null;
    if (!canMatch && !canClear && force) {
      return Math.random() < 0.5 ? "power_match" : "power_clear";
    }
    if (canMatch && !canClear) return "power_match";
    if (!canMatch && canClear) return "power_clear";

    const matchWeight = Math.max(0, this.settings.powerMatchChance);
    const clearWeight = Math.max(0, this.settings.powerClearChance);
    const total = matchWeight + clearWeight;
    if (total <= 0) {
      return Math.random() < 0.5 ? "power_match" : "power_clear";
    }
    return Math.random() < clearWeight / total ? "power_clear" : "power_match";
  }

  gainLife() {
    if (this.isTraining()) return;
    if (!this.settings.heartsEnabled) return;
    const amount = Math.max(1, this.settings.lifePerHeart);
    const lifeCap = this.getLifeCap();
    if (lifeCap > 0) {
      this.state.baseLife = Math.min(
        lifeCap,
        this.state.baseLife + amount,
      );
    } else {
      this.state.baseLife += amount;
    }
    this.audio.playHit();
    this.updateHud();
  }

  collidesWithPlayer(enemy) {
    const player = this.renderer.player;
    const dx = enemy.x - player.x;
    const dy = enemy.y - player.y;
    const playerRadius = 40;
    const enemyRadius = enemy.kind === "asteroid" ? 36 : 28;
    const radius = playerRadius + enemyRadius;
    return dx * dx + dy * dy <= radius * radius;
  }

  spawnBoss(force = false) {
    if (!force && !this.settings.bossEnabled) return;
    this.state.bossSpawned = true;
    this.state.bossActive = true;
    const hp = this.settings.bossHp;
    this.state.boss = {
      id: "boss",
      x: this.renderer.width / 2,
      y: -120,
      targetY: 120,
      hp,
      maxHp: hp,
      wobble: 0,
      problem: this.problemGen.next(
        this.state.scenario,
        this.elapsed,
        this.getProblemOptions(),
      ),
    };
    this.state.bossMinionTimer = 2.5;
    // play spawn sound and show visual cue
    try {
      this.audio.playSpawn();
      if (this.renderer)
        this.renderer.showImpactLabel(
          "CHEFÃO",
          this.state.boss.x,
          this.state.boss.y,
        );
    } catch (e) {}
  }

  hitBoss() {
    if (!this.state.bossActive || !this.state.boss) return;
    const damage = this.settings.bossDamagePerHit;
    this.state.boss.hp = Math.max(0, this.state.boss.hp - damage);
    this.addScore(25);
    this.audio.playHit();
    if (this.state.boss.hp <= 0) {
      this.state.bossActive = false;
      this.finish("boss");
    } else {
      this.state.boss.problem = this.problemGen.next(
        this.state.scenario,
        this.elapsed,
        this.getProblemOptions(),
      );
    }
  }

  resetRunState() {
    this.state = {
      ...this.state,
      running: false,
      gameOver: false,
      enemies: [],
      bullets: [],
      score: 0,
      baseLife: this.settings.baseLife,
      spawnTimer: 0,
      speedBoost: 0,
      enemyId: 1,
      nextSpawn: scenarios[this.state.scenario].spawn,
      timeLeft: TOTAL_TIME,
      totalTime: TOTAL_TIME,
      bossSpawned: false,
      bossActive: false,
      boss: null,
      bossMinionTimer: 0,
      matchPowerTimer: 0,
      recentSpawnXs: [],
    };
    this._trainingElapsed = 0;
    this.state.nextSpawn = 1 / this.getPace();
    this.hud.hideOverlay();
    this.hud.setPhaseLabel(this.getScenarioLabel());
    this.answerInput.value = "";
    this.updateHud();
  }

  start() {
    this.audio.ensure();
    this.state.running = true;
    this.answerInput.focus();
    try {
      if (this.onRunStart) this.onRunStart();
    } catch (e) {}
  }

  pause() {
    this.state.running = false;
  }

  reset() {
    this.registerScore({ allowProgression: false });
    this.resetRunState();
  }

  setScenario(mode, options = {}) {
    this.registerScore({ allowProgression: false });
    this.state.scenario = mode;
    if (mode === "train") {
      this.state.trainingDigits = this.normalizeTrainingDigits(options.digits);
      this.state.trainingOperation = options.operation || "add";
    }
    this.resetRunState();
  }

  registerScore({ allowProgression = false } = {}) {
    const isNew = this.storage.registerScore(
      this.state.scenario,
      this.state.score,
    );
    // Progression: unlock next mode only when the run is won (boss defeated)
    const progressionModes = [
      "add",
      "sub",
      "mul",
      "div",
      "sqrt",
      "pow",
      "percent",
      "decimal",
    ];
    const idx = progressionModes.indexOf(this.state.scenario);
    if (
      allowProgression &&
      idx !== -1 &&
      idx < progressionModes.length - 1
    ) {
      try {
        const raw = localStorage.getItem("md_unlockedModes");
        let arr = raw ? JSON.parse(raw) : ["add"];
        if (!Array.isArray(arr)) arr = ["add"];
        const next = progressionModes[idx + 1];
        if (!arr.includes(next)) {
          arr.push(next);
          localStorage.setItem("md_unlockedModes", JSON.stringify(arr));
        }
      } catch (e) {}
    }
    return isNew;
  }

  activateMatchPowerUp(sourceEnemy) {
    this.state.matchPowerTimer = this.settings.matchPowerDuration;
    this.audio.playCoin();
    if (this.renderer) {
      const x = sourceEnemy?.x ?? this.renderer.player.x;
      const y = sourceEnemy?.y ?? this.renderer.player.y - 80;
      const duration = Number(this.settings.matchPowerDuration || POWER_MATCH_DURATION);
      const durationText = duration.toFixed(1).replace(/\.0$/, "");
      this.renderer.showImpactLabel(`IGUAIS ${durationText}s`, x, y);
    }
    this.updateHud();
  }

  clearAllHostiles(sourceEnemy) {
    const targets = this.state.enemies.filter((enemy) =>
      this.isHostileKind(enemy.kind),
    );
    targets.forEach((enemy) =>
      this.destroyEnemy(enemy, { silent: true, skipChain: true }),
    );
    this.audio.playDestroy();
    try {
      setTimeout(() => this.audio.playCoin(), 90);
    } catch (e) {}
    if (this.renderer && sourceEnemy) {
      this.renderer.showImpactLabel("LIMPA TELA", sourceEnemy.x, sourceEnemy.y);
    }
    this.updateHud();
  }

  spawnPowerUp(options = {}) {
    const force = !!options.force;
    if (!force && !this.hasEnabledPowerUps()) return false;
    const kind = this.pickPowerUpKind(force);
    if (!kind) return false;
    const isClear = kind === "power_clear";
    const problem = isClear
      ? this.createTwoDigitMultiplicationProblem()
      : this.problemGen.next(
          this.state.scenario,
          this.elapsed,
          this.getProblemOptions(),
        );
    const enemy = {
      id: this.state.enemyId++,
      x: this.pickSpawnX(),
      y: -40,
      speed: this.getConfiguredEnemySpeed(scenarios[this.state.scenario].speed * 0.95),
      drift: randInt(-12, 12),
      label: problem.label,
      answer: problem.answer,
      wobble: Math.random() * Math.PI * 2,
      kind,
    };
    this.state.enemies.push(enemy);
    return true;
  }

  spawnHeart() {
    if (!this.settings.heartsEnabled) return false;
    const elapsed = this.getRandomElapsedForHeart();
    const problem = this.problemGen.next(
      this.state.scenario,
      elapsed,
      this.getProblemOptions(),
    );
    const enemy = {
      id: this.state.enemyId++,
      x: this.pickSpawnX(),
      y: -40,
      speed: this.getConfiguredEnemySpeed(scenarios[this.state.scenario].speed),
      drift: randInt(-18, 18),
      label: problem.label,
      answer: problem.answer,
      wobble: Math.random() * Math.PI * 2,
      kind: "heart",
    };
    this.state.enemies.push(enemy);
    return true;
  }

  spawnMinion() {
    if (!this.state.bossActive) return;
    const problem = this.problemGen.next(
      this.state.scenario,
      this.elapsed,
      this.getProblemOptions(),
    );
    const speed = this.getConfiguredEnemySpeed(
      scenarios[this.state.scenario].speed + 15,
    );
    const enemy = {
      id: this.state.enemyId++,
      x: this.state.boss
        ? this.state.boss.x + randInt(-60, 60)
        : this.pickSpawnX(),
      y: this.state.boss ? this.state.boss.y + 40 : -40,
      speed,
      drift: randInt(-26, 26),
      label: problem.label,
      answer: problem.answer,
      wobble: Math.random() * Math.PI * 2,
      kind: "minion",
    };
    this.state.enemies.push(enemy);
  }

  spawnEnemy() {
    if (!this.state.bossActive) {
      const roll = Math.random();
      const canSpawnPowerUp = this.hasEnabledPowerUps();
      const powerChance = canSpawnPowerUp ? this.settings.powerUpSpawnChance : 0;
      const heartChance = this.settings.heartsEnabled
        ? this.settings.heartSpawnChance
        : 0;

      if (canSpawnPowerUp && roll < powerChance && this.spawnPowerUp()) return;
      if (heartChance > 0 && roll < powerChance + heartChance && this.spawnHeart())
        return;
    }
    // Recuperação mode: spawn previously-missed problems preferentially
    if (this.state.scenario === "recuperacao" && this.storage) {
      const top = this.storage.getTopFailures(12) || [];
      if (top.length) {
        const pick = top[randInt(0, top.length - 1)];
        const speed = scenarios[this.state.scenario]?.speed || 45;
        const enemy = {
          id: this.state.enemyId++,
          x: this.pickSpawnX(),
          y: -40,
          speed: this.getConfiguredEnemySpeed(speed),
          drift: 0,
          label: pick.label,
          answer: pick.answer,
          wobble: Math.random() * Math.PI * 2,
          kind: "asteroid",
        };
        this.state.enemies.push(enemy);
        return;
      }
    }
    const problem = this.problemGen.next(
      this.state.scenario,
      this.elapsed,
      this.getProblemOptions(),
    );
    const speed = this.getConfiguredEnemySpeed(scenarios[this.state.scenario].speed);
    const enemy = {
      id: this.state.enemyId++,
      x: this.pickSpawnX(),
      y: -40,
      speed,
      drift: 0,
      label: problem.label,
      answer: problem.answer,
      wobble: Math.random() * Math.PI * 2,
      kind: "asteroid",
    };
    this.state.enemies.push(enemy);
  }

  spawnCustom(type, options = {}) {
    const forceSpawn = !!options.force;
    let kindType = String(type || "asteroid").toLowerCase();
    if (kindType === "vida") kindType = "heart";
    if (kindType === "powerup" || kindType === "power") kindType = "power_random";
    if (kindType === "powerup_match") kindType = "power_match";
    if (kindType === "powerup_clear") kindType = "power_clear";

    const digits = options.digits ?? 1;
    const operation = options.operation ?? "add";
    const elapsed = this.elapsed;
    const problem = this.problemGen.next("train", elapsed, {
      digits,
      operation,
    });
    if (kindType === "boss") {
      if (!this.state.bossActive) {
        this.spawnBoss(forceSpawn);
      }
      if (this.state.boss) {
        this.state.boss.problem = problem;
        this.audio.playSpawn();
        this.renderer.showImpactLabel(
          "CHEFÃO",
          this.state.boss.x,
          this.state.boss.y,
        );
      }
      return;
    }

    if (kindType === "heart") {
      if (!forceSpawn && !this.settings.heartsEnabled) return;
      const enemy = {
        id: this.state.enemyId++,
        x: this.pickSpawnX(),
        y: -40,
        speed: this.getConfiguredEnemySpeed(
          options.speed ?? scenarios[this.state.scenario].speed,
        ),
        drift: randInt(-18, 18),
        label: problem.label,
        answer: problem.answer,
        wobble: Math.random() * Math.PI * 2,
        kind: "heart",
      };
      this.state.enemies.push(enemy);
      try {
        this.renderer.createLabel(enemy.id);
      } catch (e) {}
      this.audio.playSpawn();
      this.renderer.showImpactLabel("VIDA", enemy.x, enemy.y);
      return;
    }

    if (kindType === "power_random") {
      this.spawnPowerUp({ force: forceSpawn });
      return;
    }

    if (kindType === "power_match") {
      if (
        !forceSpawn &&
        (!this.settings.powerUpsEnabled || !this.settings.powerMatchEnabled)
      )
        return;
      const enemy = {
        id: this.state.enemyId++,
        x: this.pickSpawnX(),
        y: -40,
        speed: this.getConfiguredEnemySpeed(
          Math.max(40, options.speed ?? scenarios[this.state.scenario].speed),
        ),
        drift: randInt(-12, 12),
        label: problem.label,
        answer: problem.answer,
        wobble: Math.random() * Math.PI * 2,
        kind: "power_match",
      };
      this.state.enemies.push(enemy);
      this.audio.playSpawn();
      this.renderer.showImpactLabel("PWR IGUAIS", enemy.x, enemy.y);
      return;
    }

    if (kindType === "power_clear") {
      if (
        !forceSpawn &&
        (!this.settings.powerUpsEnabled || !this.settings.powerClearEnabled)
      )
        return;
      const p = this.createTwoDigitMultiplicationProblem();
      const enemy = {
        id: this.state.enemyId++,
        x: this.pickSpawnX(),
        y: -40,
        speed: this.getConfiguredEnemySpeed(
          Math.max(40, options.speed ?? scenarios[this.state.scenario].speed),
        ),
        drift: randInt(-12, 12),
        label: p.label,
        answer: p.answer,
        wobble: Math.random() * Math.PI * 2,
        kind: "power_clear",
      };
      this.state.enemies.push(enemy);
      this.audio.playSpawn();
      this.renderer.showImpactLabel("PWR LIMPA", enemy.x, enemy.y);
      return;
    }

    if (kindType === "minion") {
      const enemy = {
        id: this.state.enemyId++,
        x: this.pickSpawnX(),
        y: -40,
        speed: this.getConfiguredEnemySpeed(
          options.speed ?? scenarios[this.state.scenario].speed + 15,
        ),
        drift: randInt(-26, 26),
        label: problem.label,
        answer: problem.answer,
        wobble: Math.random() * Math.PI * 2,
        kind: "minion",
      };
      this.state.enemies.push(enemy);
      try {
        this.renderer.createLabel(enemy.id);
      } catch (e) {}
      this.audio.playSpawn();
      this.renderer.showImpactLabel("MINION", enemy.x, enemy.y);
      return;
    }

    // default: asteroid
    const enemy = {
      id: this.state.enemyId++,
      x: this.pickSpawnX(),
      y: -40,
      speed: this.getConfiguredEnemySpeed(
        options.speed ?? scenarios[this.state.scenario].speed,
      ),
      drift: 0,
      label: problem.label,
      answer: problem.answer,
      wobble: Math.random() * Math.PI * 2,
      kind: "asteroid",
    };
    this.state.enemies.push(enemy);
    try {
      this.renderer.createLabel(enemy.id);
    } catch (e) {}
    this.audio.playSpawn();
    this.renderer.showImpactLabel(String(enemy.label), enemy.x, enemy.y);
  }

  handleShot(rawValue) {
    if (!this.state.running || this.state.gameOver) return;
    const value = rawValue.trim();
    if (!value.length) return;
    // allow comma or dot as decimal separator
    const normalized = value.replace(",", ".");
    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) {
      this.hud.flashInput(this.answerInput);
      return;
    }
    // prioridade no boss
    if (
      this.state.bossActive &&
      this.state.boss &&
      this.answersMatch(this.state.boss.problem.answer, numeric)
    ) {
      this.playShotAudio();
      this.state.bullets.push({
        targetBoss: true,
        t: 0,
        duration: 0.32,
        x: this.renderer.player.x,
        y: this.renderer.player.y - this.renderer.player.radius,
      });
      this.answerInput.value = "";
      return;
    }
    const candidates = this.state.enemies.filter((e) =>
      this.answersMatch(e.answer, numeric),
    );
    if (!candidates.length) {
      this.hud.flashInput(this.answerInput);
      return;
    }
    candidates.sort((a, b) => b.y - a.y);
    const target = candidates[0];
    this.playShotAudio();
    this.state.bullets.push({
      targetId: target.id,
      t: 0,
      duration: 0.28,
      x: this.renderer.player.x,
      y: this.renderer.player.y - this.renderer.player.radius,
    });
    this.answerInput.value = "";
  }

  playShotAudio() {
    if (this.state.matchPowerTimer > 0) {
      if (typeof this.audio.playExplosionShot === "function") {
        this.audio.playExplosionShot();
        return;
      }
      this.audio.playDestroy();
      return;
    }
    this.audio.playShoot();
  }

  damageBase() {
    if (this.isTraining()) return;
    // one-strike mod: any hit ends the run immediately
    if (this.mods && this.mods.oneStrike) {
      this.audio.playDamage();
      this.finish("base");
      return;
    }
    this.state.baseLife -= 1;
    this.audio.playDamage();
    this.updateHud();
    if (this.state.baseLife <= 0) {
      this.finish("base");
    }
  }

  destroyEnemy(enemy, options = {}) {
    const { silent = false, skipChain = false } = options;
    const idx = this.state.enemies.indexOf(enemy);
    if (idx === -1) return;
    this.state.enemies.splice(idx, 1);

    if (enemy.kind === "heart") {
      this.gainLife();
      return;
    }

    if (enemy.kind === "power_match") {
      this.addScore(15);
      this.activateMatchPowerUp(enemy);
      return;
    }

    if (enemy.kind === "power_clear") {
      this.addScore(25);
      this.clearAllHostiles(enemy);
      return;
    }

    if (!this.isHostileKind(enemy.kind)) return;

    const stage = this.problemGen.currentStageIndex(this.elapsed);
    const points = 10 + stage * 5;
    this.addScore(points);

    if (!silent) {
      if (enemy.kind === "asteroid") {
        this.audio.playDestroy();
        try {
          setTimeout(() => this.audio.playCoin(), 110);
        } catch (e) {}
      } else {
        this.audio.playHit();
      }
    }

    if (this.state.matchPowerTimer > 0 && !skipChain) {
      const sameAnswerEnemies = this.state.enemies.filter(
        (candidate) =>
          this.isHostileKind(candidate.kind) &&
          this.answersMatch(candidate.answer, enemy.answer),
      );
      sameAnswerEnemies.forEach((candidate) =>
        this.destroyEnemy(candidate, { silent: true, skipChain: true }),
      );
      if (sameAnswerEnemies.length) {
        this.audio.playDestroy();
        if (this.renderer) {
          this.renderer.showImpactLabel(
            `COMBO x${sameAnswerEnemies.length + 1}`,
            enemy.x,
            enemy.y,
          );
        }
      }
    }

    this.updateHud();
    try {
      if (this.state.scenario === "recuperacao") {
        this.storage.registerSuccess &&
          this.storage.registerSuccess(enemy.label);
      }
    } catch (e) {}
  }

  finish(reason) {
    if (this.state.gameOver) return;
    this.state.gameOver = true;
    this.state.running = false;
    this.state.bossActive = false;
    this.state.boss = null;
    const brokeRecord = this.registerScore({
      allowProgression: reason === "boss",
    });
    if (reason === "boss") {
      this.hud.showOverlay(
        "Chefao derrotado",
        brokeRecord
          ? "Voce salvou a base e fez um novo recorde!"
          : "Voce salvou a base!",
      );
    } else if (reason === "base") {
      this.hud.showOverlay(
        "Base invadida",
        "Use Reiniciar para tentar novamente.",
      );
    } else {
      this.hud.showOverlay(
        "Partida encerrada",
        "Clique em Reiniciar para jogar de novo.",
      );
    }

    // auto-reset mods: restart automatically after a short delay
    if (
      this.mods &&
      (this.mods.autoReset || (this.mods.autoResetOnLoss && reason === "base"))
    ) {
      try {
        setTimeout(() => {
          this.resetRunState();
          this.start();
        }, 800);
      } catch (e) {}
    }
  }

  update(dt) {
    // decrement time; in training allow time to continue decreasing but track elapsed separately
    if (this.isTraining()) {
      this._trainingElapsed += dt;
      this.state.timeLeft -= dt;
    } else {
      this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
      // when time runs out in non-training modes, spawn the boss instead of finishing
      if (!this.state.bossSpawned && this.state.timeLeft <= 0) {
        if (this.settings.bossEnabled) {
          this.spawnBoss();
        } else {
          this.finish("time");
          return;
        }
      }
    }

    if (this.state.matchPowerTimer > 0) {
      this.state.matchPowerTimer = Math.max(0, this.state.matchPowerTimer - dt);
    }

    const pace = this.getPace();
    this.state.nextSpawn = 1 / pace;
    this.updateHud();

    if (!this.state.bossActive) {
      this.state.spawnTimer -= dt;
      if (this.state.spawnTimer <= 0) {
        this.spawnEnemy();
        this.state.spawnTimer = this.state.nextSpawn;
      }
    } else {
      this.state.bossMinionTimer -= dt;
      if (this.state.bossMinionTimer <= 0) {
        this.spawnMinion();
        this.state.bossMinionTimer = randInt(2, 4);
      }
      if (this.state.boss) {
        this.state.boss.wobble += dt * 1.5;
        this.state.boss.y = Math.min(
          this.state.boss.targetY,
          this.state.boss.y + 40 * dt,
        );
        this.state.boss.x += Math.sin(this.state.boss.wobble) * 20 * dt;
        this.state.boss.x = Math.max(
          60,
          Math.min(this.renderer.canvas.width - 60, this.state.boss.x),
        );
      }
    }

    this.state.enemies = this.state.enemies.filter((enemy) => {
      enemy.wobble += dt * 2;
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(enemy.wobble) * enemy.drift * dt;
      enemy.x = Math.max(
        50,
        Math.min(this.renderer.canvas.width - 50, enemy.x),
      );

      if (this.collidesWithPlayer(enemy)) {
        if (enemy.kind === "heart") {
          this.gainLife();
        } else if (this.isHostileKind(enemy.kind)) {
          this.damageBase();
        }
        return false;
      }

      if (enemy.y >= this.renderer.barrierY) {
        if (enemy.kind === "asteroid") {
          this.renderer.showImpactLabel(
            String(enemy.answer),
            enemy.x,
            this.renderer.barrierY,
          );
        }
        if (this.isHostileKind(enemy.kind)) {
          // register missed problem for recovery tracking, but skip in train/sandbox
          try {
            if (
              this.state.scenario !== "train" &&
              this.state.scenario !== "sandbox"
            ) {
              this.storage.registerFailure &&
                this.storage.registerFailure(enemy.label, enemy.answer);
            }
          } catch (e) {}
          this.damageBase();
        }
        return false;
      }
      return true;
    });

    this.state.bullets = this.state.bullets.filter((bullet) => {
      bullet.t += dt;
      if (bullet.targetBoss) {
        const boss = this.state.boss;
        if (!boss) return false;
        const pct = Math.min(1, bullet.t / bullet.duration);
        bullet.x = lerp(this.renderer.player.x, boss.x, pct);
        bullet.y = lerp(
          this.renderer.player.y - this.renderer.player.radius,
          boss.y,
          pct,
        );
        if (pct >= 1) {
          this.hitBoss();
          return false;
        }
        return true;
      }
      const target = this.state.enemies.find((e) => e.id === bullet.targetId);
      if (!target) return false;
      const pct = Math.min(1, bullet.t / bullet.duration);
      bullet.x = lerp(this.renderer.player.x, target.x, pct);
      bullet.y = lerp(
        this.renderer.player.y - this.renderer.player.radius,
        target.y,
        pct,
      );
      if (pct >= 1) {
        this.destroyEnemy(target);
        return false;
      }
      return true;
    });
  }

  updateHud() {
    const paceValue =
      this.state.nextSpawn > 0 ? (1 / this.state.nextSpawn).toFixed(1) : "0";
    const best = this.storage.getBest(this.state.scenario);
    const health = this.getHealthStatus();
    const bossPct =
      this.state.boss && this.state.boss.maxHp > 0
        ? Math.round((this.state.boss.hp / this.state.boss.maxHp) * 100)
        : 0;
    const buffLabel =
      this.state.matchPowerTimer > 0
        ? ` | Iguais ${this.state.matchPowerTimer.toFixed(1)}s`
        : "";
    const matchDuration = Math.max(
      0.0001,
      Number(this.settings.matchPowerDuration || POWER_MATCH_DURATION),
    );
    const matchPowerPct =
      this.state.matchPowerTimer > 0
        ? Math.max(
            0,
            Math.min(100, (this.state.matchPowerTimer / matchDuration) * 100),
          )
        : 0;
    const scenarioLabel = `${this.getScenarioLabel()}${buffLabel}`;
    const baseLife = this.isTraining() ? "INF" : this.state.baseLife;
    const timeDisplay = this.isTraining()
      ? "INF"
      : formatTime(this.state.timeLeft);
    this.hud.update(
      {
        baseLife,
        score: this.state.score,
        timeLeft: this.state.timeLeft,
        scenario: scenarioLabel,
        healthLabel: health.label,
        healthClass: health.cls,
        wave: this.getWave(),
        bossActive: this.state.bossActive,
        bossHpPct: bossPct,
        matchPowerActive: this.state.matchPowerTimer > 0,
        matchPowerPct,
        matchPowerTimeLabel: `${Math.max(0, this.state.matchPowerTimer).toFixed(1)}s`,
      },
      paceValue,
      best,
      timeDisplay,
    );
  }

  step(dt) {
    if (this.state.running && !this.state.gameOver) {
      this.update(dt);
    }
    this.renderer.draw(this.state);
    this.updateHud();
  }
}
