import { AudioManager } from "./js/audio.js";
import { StorageManager } from "./js/storage.js";
import { Renderer } from "./js/renderer.js";
import { Hud } from "./js/hud.js";
import { Game } from "./js/game.js";
import { STORAGE_KEY, scenarios } from "./js/config.js";
import {
  loadRuntimeGameSettings,
  saveStoredGameSettings,
  clearStoredGameSettings,
} from "./js/user-config.js";

const canvas = document.getElementById("arena");
const answerInput = document.getElementById("answer");
const shootBtn = document.getElementById("shootBtn");
const startBtn = document.getElementById("startBtn");
const modsBtn = document.getElementById("modsBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const playAgainBtn = document.getElementById("playAgain");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlaySubtitle = document.getElementById("overlaySubtitle");
const startScreen = document.getElementById("startScreen");
const heroStart = document.getElementById("heroStart");
const modeScreen = document.getElementById("modeScreen");
const modeCards = document.querySelectorAll(".mode-card");
const { config: initialGameConfig, xmlDefaults: xmlGameDefaults } =
  await loadRuntimeGameSettings();
let activeGameConfig = { ...initialGameConfig };
const baseXmlGameConfig = { ...xmlGameDefaults };

// Progression: only unlocked modes are playable
const MODE_ORDER = [
  "add",
  "sub",
  "mul",
  "div",
  "sqrt",
  "pow",
  "percent",
  "decimal",
];
function loadUnlockedModes() {
  try {
    const raw = localStorage.getItem("md_unlockedModes");
    if (!raw) return ["add"];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return ["add"];
    return arr.filter((m) => MODE_ORDER.includes(m));
  } catch (e) {
    return ["add"];
  }
}
function saveUnlockedModes(arr) {
  try {
    localStorage.setItem("md_unlockedModes", JSON.stringify(arr));
  } catch (e) {}
}
let unlockedModes = loadUnlockedModes();

function updateModeLocks() {
  modeCards.forEach((card) => {
    const mode = card.dataset.scenario;
    if (!MODE_ORDER.includes(mode)) return;
    if (unlockedModes.includes(mode)) {
      card.classList.remove("locked-mode");
      card.disabled = false;
    } else {
      card.classList.add("locked-mode");
      card.disabled = true;
    }
  });
}
updateModeLocks();
const trainDigitsInput = document.getElementById("trainDigits");
const trainOperationSelect = document.getElementById("trainOperation");
const trainStartBtn = document.getElementById("trainStartBtn");
const trainConfigPanel = document.getElementById("trainConfigPanel");
const trainBackBtn = document.getElementById("trainBackBtn");
const sandboxPanel = document.getElementById("sandboxPanel");
const sbEntity = document.getElementById("sbEntity");
const sbCount = document.getElementById("sbCount");
const sbDigits = document.getElementById("sbDigits");
const sbOperation = document.getElementById("sbOperation");
const sbSpawnBtn = document.getElementById("sbSpawnBtn");
const sbBackBtn = document.getElementById("sbBackBtn");
const sbStartBtn = document.getElementById("sbStartBtn");
const closeMode = document.getElementById("closeMode");
const modsPanel = document.getElementById("modsPanel");
const resetAllBtn = document.getElementById("resetAllBtn");
const confirmResetModal = document.getElementById("confirmResetModal");
const confirmResetBtn = document.getElementById("confirmResetBtn");
const cancelResetBtn = document.getElementById("cancelResetBtn");
const bossBarEl = document.getElementById("bossBar");
const bossBarFill = document.getElementById("bossBarFill");
const matchPowerBarEl = document.getElementById("matchPowerTimer");
const matchPowerFillEl = document.getElementById("matchPowerFill");
const matchPowerTimeEl = document.getElementById("matchPowerTimeText");

const baseLifeEl = document.getElementById("baseLife");
const scoreEl = document.getElementById("score");
const phaseEl = document.getElementById("phase");
const paceEl = document.getElementById("pace");
const timeLeftEl = document.getElementById("timeLeft");
const bestScoreEl = document.getElementById("bestScore");

const audio = new AudioManager();
const storage = new StorageManager(STORAGE_KEY);
const renderer = new Renderer(canvas);
const waveEl = document.getElementById("wave");
const healthEl = document.getElementById("healthStatus");

const hud = new Hud({
  baseLifeEl,
  scoreEl,
  paceEl,
  timeLeftEl,
  phaseEl,
  bestScoreEl,
  overlay,
  overlayTitle,
  overlaySubtitle,
  healthEl,
  waveEl,
  bossBarEl,
  bossBarFill,
  matchPowerBarEl,
  matchPowerFill: matchPowerFillEl,
  matchPowerTimeEl,
  options: {
    bossBarEnabled: activeGameConfig.bossBarEnabled !== false,
  },
});
const game = new Game({
  renderer,
  hud,
  audio,
  storage,
  answerInput,
  gameConfig: activeGameConfig,
  onRunStart: () => {
    sessionAttempts++;
    updateAttemptsDisplay();
  },
});

// attempt counter for current session
const attemptsCounterEl = document.getElementById("attemptsCounter");
const attemptHistoryListEl = document.getElementById("attemptHistoryList");
let sessionAttempts = 0;
let attemptHistory = [];
let lastGameOverState = false;
let toastTimeoutId = null;
const MODAL_ANIM_MS = 260;

function showToast(message, type = "success", duration = 2200) {
  let toastEl = document.getElementById("appToast");
  if (!toastEl) {
    toastEl = document.createElement("div");
    toastEl.id = "appToast";
    toastEl.className = "app-toast";
    document.body.appendChild(toastEl);
  }

  toastEl.textContent = String(message || "");
  toastEl.classList.remove("is-success", "is-error", "is-visible");
  toastEl.classList.add(type === "error" ? "is-error" : "is-success");
  // force reflow to replay transition when clicked repeatedly
  void toastEl.offsetWidth;
  toastEl.classList.add("is-visible");

  if (toastTimeoutId) {
    clearTimeout(toastTimeoutId);
    toastTimeoutId = null;
  }
  toastTimeoutId = setTimeout(() => {
    toastEl.classList.remove("is-visible");
    toastTimeoutId = null;
  }, Math.max(800, Number(duration) || 2200));
}

function showModal(el) {
  if (!el) return;
  if (el.__modalHideTimer) {
    clearTimeout(el.__modalHideTimer);
    el.__modalHideTimer = null;
  }
  if (el.__modalOpenTimer) {
    clearTimeout(el.__modalOpenTimer);
    el.__modalOpenTimer = null;
  }
  el.classList.remove("hidden", "modal-closing");
  el.classList.add("modal-opening");
  el.__modalOpenTimer = setTimeout(() => {
    el.classList.remove("modal-opening");
    el.__modalOpenTimer = null;
  }, MODAL_ANIM_MS);
}

function hideModal(el) {
  if (!el) return;
  if (el.classList.contains("hidden")) return;
  if (el.__modalHideTimer) {
    clearTimeout(el.__modalHideTimer);
    el.__modalHideTimer = null;
  }
  if (el.__modalOpenTimer) {
    clearTimeout(el.__modalOpenTimer);
    el.__modalOpenTimer = null;
  }
  el.classList.remove("modal-opening");
  el.classList.add("modal-closing");
  el.__modalHideTimer = setTimeout(() => {
    el.classList.add("hidden");
    el.classList.remove("modal-closing");
    el.__modalHideTimer = null;
  }, MODAL_ANIM_MS);
}

function updateAttemptsDisplay() {
  if (!attemptsCounterEl) return;
  attemptsCounterEl.textContent = `Tentativas: ${sessionAttempts}`;
}

function readNumberInput(el, fallback) {
  if (!el) return fallback;
  const value = Number(el.value);
  return Number.isFinite(value) ? value : fallback;
}

function writeGameConfigToInputs(config) {
  const profiles = config.difficultyProfiles || {};
  if (cfgDifficultyEl) cfgDifficultyEl.value = String(config.difficultyLevel || "normal");
  if (cfgDifficultyMultiplierEl)
    cfgDifficultyMultiplierEl.value = String(config.difficultyMultiplier ?? 1);
  if (cfgBaseLifeEl) cfgBaseLifeEl.value = String(config.baseLife ?? 3);
  if (cfgMaxLifeEl) cfgMaxLifeEl.value = String(config.maxLife ?? 0);
  if (cfgBossHpEl) cfgBossHpEl.value = String(config.bossHp ?? 300);
  if (cfgBossDamageEl)
    cfgBossDamageEl.value = String(config.bossDamagePerHit ?? 30);
  if (cfgHeartSpawnChanceEl)
    cfgHeartSpawnChanceEl.value = String(config.heartSpawnChance ?? 0.06);
  if (cfgPowerUpSpawnChanceEl)
    cfgPowerUpSpawnChanceEl.value = String(config.powerUpSpawnChance ?? 0.018);
  if (cfgMatchPowerDurationEl)
    cfgMatchPowerDurationEl.value = String(config.matchPowerDuration ?? 5);
  if (cfgPaceMultiplierEl)
    cfgPaceMultiplierEl.value = String(config.paceMultiplier ?? 1);
  if (cfgEnemySpeedMultiplierEl)
    cfgEnemySpeedMultiplierEl.value = String(config.enemySpeedMultiplier ?? 1);
  if (cfgScoreMultiplierEl)
    cfgScoreMultiplierEl.value = String(config.scoreMultiplier ?? 1);
  if (cfgBossBarEnabledEl)
    cfgBossBarEnabledEl.checked = config.bossBarEnabled !== false;
  if (cfgBossEnabledEl) cfgBossEnabledEl.checked = config.bossEnabled !== false;
  if (cfgHeartsEnabledEl)
    cfgHeartsEnabledEl.checked = config.heartsEnabled !== false;
  if (cfgLifePerHeartEl)
    cfgLifePerHeartEl.value = String(config.lifePerHeart ?? 1);
  if (cfgPowerUpsEnabledEl)
    cfgPowerUpsEnabledEl.checked = config.powerUpsEnabled !== false;
  if (cfgPowerMatchEnabledEl)
    cfgPowerMatchEnabledEl.checked = config.powerMatchEnabled !== false;
  if (cfgPowerClearEnabledEl)
    cfgPowerClearEnabledEl.checked = config.powerClearEnabled !== false;
  if (cfgPowerMatchChanceEl)
    cfgPowerMatchChanceEl.value = String(config.powerMatchChance ?? 0.5);
  if (cfgPowerClearChanceEl)
    cfgPowerClearChanceEl.value = String(config.powerClearChance ?? 0.5);
  if (cfgDifficultyEasyEl)
    cfgDifficultyEasyEl.value = String(profiles.easy ?? 0.85);
  if (cfgDifficultyNormalEl)
    cfgDifficultyNormalEl.value = String(profiles.normal ?? 1);
  if (cfgDifficultyHardEl)
    cfgDifficultyHardEl.value = String(profiles.hard ?? 1.2);
  if (cfgDifficultyInsaneEl)
    cfgDifficultyInsaneEl.value = String(profiles.insane ?? 1.4);
}

function readGameConfigFromInputs() {
  return {
    ...activeGameConfig,
    difficultyLevel: cfgDifficultyEl?.value || "normal",
    difficultyMultiplier: readNumberInput(cfgDifficultyMultiplierEl, 1),
    baseLife: readNumberInput(cfgBaseLifeEl, 3),
    maxLife: readNumberInput(cfgMaxLifeEl, 0),
    bossHp: readNumberInput(cfgBossHpEl, 300),
    bossDamagePerHit: readNumberInput(cfgBossDamageEl, 30),
    bossEnabled: !!cfgBossEnabledEl?.checked,
    heartsEnabled: !!cfgHeartsEnabledEl?.checked,
    lifePerHeart: readNumberInput(cfgLifePerHeartEl, 1),
    powerUpsEnabled: !!cfgPowerUpsEnabledEl?.checked,
    powerMatchEnabled: !!cfgPowerMatchEnabledEl?.checked,
    powerClearEnabled: !!cfgPowerClearEnabledEl?.checked,
    heartSpawnChance: readNumberInput(cfgHeartSpawnChanceEl, 0.06),
    powerUpSpawnChance: readNumberInput(cfgPowerUpSpawnChanceEl, 0.018),
    powerMatchChance: readNumberInput(cfgPowerMatchChanceEl, 0.5),
    powerClearChance: readNumberInput(cfgPowerClearChanceEl, 0.5),
    matchPowerDuration: readNumberInput(cfgMatchPowerDurationEl, 5),
    paceMultiplier: readNumberInput(cfgPaceMultiplierEl, 1),
    enemySpeedMultiplier: readNumberInput(cfgEnemySpeedMultiplierEl, 1),
    scoreMultiplier: readNumberInput(cfgScoreMultiplierEl, 1),
    bossBarEnabled: !!cfgBossBarEnabledEl?.checked,
    difficultyProfiles: {
      easy: readNumberInput(cfgDifficultyEasyEl, 0.85),
      normal: readNumberInput(cfgDifficultyNormalEl, 1),
      hard: readNumberInput(cfgDifficultyHardEl, 1.2),
      insane: readNumberInput(cfgDifficultyInsaneEl, 1.4),
    },
  };
}

function applyGameConfig(nextConfig, { persist = true } = {}) {
  activeGameConfig = { ...nextConfig };
  game.setGameConfig && game.setGameConfig(activeGameConfig);
  hud.setOptions &&
    hud.setOptions({ bossBarEnabled: activeGameConfig.bossBarEnabled !== false });
  if (persist) {
    saveStoredGameSettings(activeGameConfig);
  }
  writeGameConfigToInputs(activeGameConfig);
}

function updateAttemptHistoryDisplay() {
  if (!attemptHistoryListEl) return;
  if (!attemptHistory.length) {
    attemptHistoryListEl.innerHTML = `<li class="empty">Sem tentativas ainda.</li>`;
    return;
  }
  attemptHistoryListEl.innerHTML = attemptHistory
    .map(
      (entry) =>
        `<li>Tentativa ${entry.attempt}: <strong>${entry.score}</strong> pts</li>`,
    )
    .join("");
}

function clearAttemptHistory() {
  attemptHistory = [];
  updateAttemptHistoryDisplay();
}

function registerFinishedAttempt() {
  if (!sessionAttempts) return;
  const score = Number(game?.state?.score || 0);
  attemptHistory.unshift({ attempt: sessionAttempts, score });
  if (attemptHistory.length > 10) {
    attemptHistory.length = 10;
  }
  updateAttemptHistoryDisplay();
}

// load mods from localStorage
const modAutoResetEl = document.getElementById("modAutoReset");
const modAutoResetOnLossEl = document.getElementById("modAutoResetOnLoss");
const modOneStrikeEl = document.getElementById("modOneStrike");
const modsCloseBtn = document.getElementById("modsCloseBtn");
const cfgDifficultyEl = document.getElementById("cfgDifficulty");
const cfgDifficultyMultiplierEl = document.getElementById(
  "cfgDifficultyMultiplier",
);
const cfgBaseLifeEl = document.getElementById("cfgBaseLife");
const cfgMaxLifeEl = document.getElementById("cfgMaxLife");
const cfgBossHpEl = document.getElementById("cfgBossHp");
const cfgBossDamageEl = document.getElementById("cfgBossDamage");
const cfgHeartSpawnChanceEl = document.getElementById("cfgHeartSpawnChance");
const cfgPowerUpSpawnChanceEl = document.getElementById("cfgPowerUpSpawnChance");
const cfgMatchPowerDurationEl = document.getElementById("cfgMatchPowerDuration");
const cfgPaceMultiplierEl = document.getElementById("cfgPaceMultiplier");
const cfgEnemySpeedMultiplierEl = document.getElementById(
  "cfgEnemySpeedMultiplier",
);
const cfgScoreMultiplierEl = document.getElementById("cfgScoreMultiplier");
const cfgBossBarEnabledEl = document.getElementById("cfgBossBarEnabled");
const cfgBossEnabledEl = document.getElementById("cfgBossEnabled");
const cfgHeartsEnabledEl = document.getElementById("cfgHeartsEnabled");
const cfgLifePerHeartEl = document.getElementById("cfgLifePerHeart");
const cfgPowerUpsEnabledEl = document.getElementById("cfgPowerUpsEnabled");
const cfgPowerMatchEnabledEl = document.getElementById("cfgPowerMatchEnabled");
const cfgPowerClearEnabledEl = document.getElementById("cfgPowerClearEnabled");
const cfgPowerMatchChanceEl = document.getElementById("cfgPowerMatchChance");
const cfgPowerClearChanceEl = document.getElementById("cfgPowerClearChance");
const cfgDifficultyEasyEl = document.getElementById("cfgDifficultyEasy");
const cfgDifficultyNormalEl = document.getElementById("cfgDifficultyNormal");
const cfgDifficultyHardEl = document.getElementById("cfgDifficultyHard");
const cfgDifficultyInsaneEl = document.getElementById("cfgDifficultyInsane");
const cfgSaveBtn = document.getElementById("cfgSaveBtn");
const cfgResetBtn = document.getElementById("cfgResetBtn");
function loadMods() {
  try {
    const raw = localStorage.getItem("md_mods");
    if (!raw)
      return { autoReset: false, autoResetOnLoss: false, oneStrike: false };
    return JSON.parse(raw);
  } catch (e) {
    return { autoReset: false, autoResetOnLoss: false, oneStrike: false };
  }
}
function saveMods(mods) {
  try {
    localStorage.setItem("md_mods", JSON.stringify(mods));
  } catch (e) {}
}
const initialMods = loadMods();
if (modAutoResetEl) modAutoResetEl.checked = !!initialMods.autoReset;
if (modAutoResetOnLossEl)
  modAutoResetOnLossEl.checked = !!initialMods.autoResetOnLoss;
if (modOneStrikeEl) modOneStrikeEl.checked = !!initialMods.oneStrike;
game.setMods && game.setMods(initialMods);
applyGameConfig(activeGameConfig, { persist: false });

function openModeSelection() {
  resetModePanels();
  hideModal(startScreen);
  showModal(modeScreen);
}

function closeModeSelection() {
  hideModal(modeScreen);
  // remove scenario-only filter when closing
  if (modeScreen) modeScreen.classList.remove("scenario-only");
  // ensure we return to the start screen (do not reveal a paused game)
  if (startScreen) showModal(startScreen);
  resetModePanels();
  // reset the game so the arena is not left paused in the background
  try {
    game.reset();
  } catch (e) {}
}

function resetModePanels() {
  if (trainConfigPanel) trainConfigPanel.classList.add("hidden");
  if (sandboxPanel) sandboxPanel.classList.add("hidden");
  if (modsPanel) modsPanel.classList.add("hidden");
  const grid = modeScreen?.querySelector(".mode-grid");
  if (grid) grid.classList.remove("hidden");
  if (closeMode) closeMode.classList.remove("hidden");
}

function openModsPanel() {
  if (!modeScreen || modeScreen.classList.contains("hidden")) return;
  if (trainConfigPanel) trainConfigPanel.classList.add("hidden");
  if (sandboxPanel) sandboxPanel.classList.add("hidden");
  const grid = modeScreen.querySelector(".mode-grid");
  if (grid) grid.classList.add("hidden");
  if (modsPanel) modsPanel.classList.remove("hidden");
  if (closeMode) closeMode.classList.add("hidden");
}

function getTrainingDigits() {
  if (!trainDigitsInput) return undefined;
  const raw = Number.parseInt(trainDigitsInput.value, 10);
  const min = Number.parseInt(trainDigitsInput.min, 10) || 1;
  const max = Number.parseInt(trainDigitsInput.max, 10) || 9;
  const value = Number.isFinite(raw) ? raw : min;
  const clamped = Math.max(min, Math.min(max, value));
  trainDigitsInput.value = String(clamped);
  return clamped;
}

function getTrainingOperation() {
  if (!trainOperationSelect) return "add";
  const v = String(trainOperationSelect.value || "add");
  const allowed = new Set(["add", "sub", "mul", "div", "sqrt"]);
  // allow new operations: potenciação (pow), porcentagem (percent), decimais
  allowed.add("pow");
  allowed.add("percent");
  allowed.add("decimal");
  return allowed.has(v) ? v : "add";
}

function pickScenario(mode) {
  audio.ensure();
  if (mode === "train") {
    const digits = getTrainingDigits();
    const operation = getTrainingOperation();
    game.setScenario(mode, { digits, operation });
  } else {
    game.setScenario(mode);
  }
  if (scorePanel) hideModal(scorePanel);
  game.start();
  // hide the mode screen without triggering the 'back to start' reset
  if (modeScreen) hideModal(modeScreen);
  hideModal(startScreen);
  answerInput.focus();
}

function openSandboxSetup() {
  audio.ensure();
  game.setScenario("sandbox");
  if (trainConfigPanel) trainConfigPanel.classList.add("hidden");
  if (modsPanel) modsPanel.classList.add("hidden");
  if (sandboxPanel) sandboxPanel.classList.remove("hidden");
  const grid = modeScreen.querySelector(".mode-grid");
  if (grid) grid.classList.add("hidden");
  if (closeMode) closeMode.classList.remove("hidden");
  showModal(modeScreen);
  sbEntity?.focus();
}

shootBtn.addEventListener("click", () => game.handleShot(answerInput.value));
document.addEventListener("keydown", (event) => {
  const k = event.key;
  // Enter: either submit shot or, when overlay is visible, reset+start
  if (k === "Enter") {
    if (!overlay.classList.contains("hidden")) {
      game.reset();
      game.start();
      event.preventDefault();
      return;
    }
    game.handleShot(answerInput.value);
    return;
  }

  // 'f' (case-insensitive) opens the mode selection screen
  if (k.toLowerCase && k.toLowerCase() === "f") {
    openModeSelection();
    event.preventDefault();
    return;
  }

  // Single-quote (') — always reset and immediately start the game
  if (k === "'") {
    try {
      game.reset();
      game.start();
      event.preventDefault();
    } catch (err) {}
    return;
  }
});

startBtn.addEventListener("click", openModeSelection);
if (heroStart) heroStart.addEventListener("click", openModeSelection);
closeMode.addEventListener("click", closeModeSelection);
modeCards.forEach((card) => {
  card.addEventListener("click", () => {
    const mode = card.dataset.scenario;
    if (card.classList.contains("locked-mode")) return;
    if (mode === "train") {
      if (trainConfigPanel) trainConfigPanel.classList.remove("hidden");
      const grid = modeScreen.querySelector(".mode-grid");
      if (grid) grid.classList.add("hidden");
      if (closeMode) closeMode.classList.add("hidden");
      showModal(modeScreen);
      trainDigitsInput?.focus();
      return;
    } else if (mode === "sandbox") {
      openSandboxSetup();
      return;
    }
    pickScenario(mode);
  });
});

if (trainStartBtn) {
  trainStartBtn.addEventListener("click", () => pickScenario("train"));
}

if (trainBackBtn) {
  trainBackBtn.addEventListener("click", () => {
    if (trainConfigPanel) trainConfigPanel.classList.add("hidden");
    const grid = modeScreen.querySelector(".mode-grid");
    if (grid) grid.classList.remove("hidden");
    if (closeMode) closeMode.classList.remove("hidden");
  });
}
if (sbBackBtn) {
  sbBackBtn.addEventListener("click", () => {
    if (sandboxPanel) sandboxPanel.classList.add("hidden");
    const grid = modeScreen.querySelector(".mode-grid");
    if (grid) grid.classList.remove("hidden");
    if (closeMode) closeMode.classList.remove("hidden");
  });
}

// mods close handler
if (modsCloseBtn) {
  modsCloseBtn.addEventListener("click", () => {
    if (modsPanel) modsPanel.classList.add("hidden");
    const grid = modeScreen.querySelector(".mode-grid");
    if (grid) grid.classList.remove("hidden");
    if (closeMode) closeMode.classList.remove("hidden");
  });
}

if (cfgSaveBtn) {
  cfgSaveBtn.addEventListener("click", () => {
    try {
      const newConfig = readGameConfigFromInputs();
      applyGameConfig(newConfig, { persist: true });
      showToast("Configuracoes salvas com sucesso.", "success", 2200);
    } catch (error) {
      showToast("Falha ao salvar configuracoes.", "error", 2600);
    }
  });
}

if (cfgResetBtn) {
  cfgResetBtn.addEventListener("click", () => {
    clearStoredGameSettings();
    applyGameConfig({ ...baseXmlGameConfig }, { persist: false });
  });
}

// wire mod toggles
if (modAutoResetEl) {
  modAutoResetEl.addEventListener("change", () => {
    const mods = {
      autoReset: !!modAutoResetEl.checked,
      autoResetOnLoss: !!modAutoResetOnLossEl?.checked,
      oneStrike: !!modOneStrikeEl.checked,
    };
    saveMods(mods);
    game.setMods && game.setMods(mods);
  });
}
if (modOneStrikeEl) {
  modOneStrikeEl.addEventListener("change", () => {
    const mods = {
      autoReset: !!modAutoResetEl.checked,
      autoResetOnLoss: !!modAutoResetOnLossEl?.checked,
      oneStrike: !!modOneStrikeEl.checked,
    };
    saveMods(mods);
    game.setMods && game.setMods(mods);
  });
}
if (modAutoResetOnLossEl) {
  modAutoResetOnLossEl.addEventListener("change", () => {
    const mods = {
      autoReset: !!modAutoResetEl.checked,
      autoResetOnLoss: !!modAutoResetOnLossEl.checked,
      oneStrike: !!modOneStrikeEl.checked,
    };
    saveMods(mods);
    game.setMods && game.setMods(mods);
  });
}

if (sbSpawnBtn) {
  sbSpawnBtn.addEventListener("click", () => {
    const kind = sbEntity.value || "asteroid";
    const count = Math.max(1, Number.parseInt(sbCount.value, 10) || 1);
    const digits = Math.max(1, Number.parseInt(sbDigits.value, 10) || 1);
    const operation = sbOperation.value || "add";
    for (let i = 0; i < count; i++) {
      game.spawnCustom(kind, { digits, operation, force: true });
    }
    audio.playSpawn();
  });
}

// open Mods panel from mode screen via keyboard shortcut 'M' or add a small click target
document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented) return;
  const activeTag = document.activeElement?.tagName || "";
  const isTypingField =
    activeTag === "INPUT" ||
    activeTag === "TEXTAREA" ||
    document.activeElement?.isContentEditable;

  if (e.key.toLowerCase() === "m") {
    if (isTypingField) return;
    if (modeScreen?.classList.contains("hidden")) return;
    openModsPanel();
  }
});

if (modsBtn) {
  modsBtn.addEventListener("click", () => {
    // show mode screen and open mods panel
    hideModal(startScreen);
    showModal(modeScreen);
    openModsPanel();
  });
}

updateAttemptsDisplay();
updateAttemptHistoryDisplay();

if (sbStartBtn) {
  sbStartBtn.addEventListener("click", () => {
    audio.ensure();
    if (game.state?.scenario !== "sandbox") {
      game.setScenario("sandbox");
    }
    game.start();
    if (sandboxPanel) sandboxPanel.classList.add("hidden");
    if (modeScreen) hideModal(modeScreen);
    if (startScreen) hideModal(startScreen);
    answerInput.focus();
  });
}

// Main menu buttons
const menuStart = document.getElementById("menuStart");
const menuScenario = document.getElementById("menuScenario");
const menuSettings = document.getElementById("menuSettings");
const menuScore = document.getElementById("menuScore");
const scorePanel = document.getElementById("scorePanel");
const scoreCloseBtn = document.getElementById("scoreCloseBtn");

function startRandomUnlockedScenario() {
  unlockedModes = loadUnlockedModes();
  const eligible = unlockedModes.filter((mode) => MODE_ORDER.includes(mode));
  if (eligible.length <= 1) {
    showToast("Desbloqueie mais fases para iniciar aleatorio.", "error", 1800);
    return false;
  }
  const idx = Math.floor(Math.random() * eligible.length);
  const mode = eligible[idx] || eligible[0];
  if (!mode) return false;
  pickScenario(mode);
  showToast(`Modo aleatorio: ${scenarios[mode]?.name || mode}`, "success", 1600);
  return true;
}

if (menuStart)
  menuStart.addEventListener("click", () => {
    // open full mode selection (no scenario-only filter)
    hideModal(startScreen);
    showModal(modeScreen);
    resetModePanels();
    modeScreen.classList.remove("scenario-only");
    // update locks every time menu is opened
    unlockedModes = loadUnlockedModes();
    updateModeLocks();
  });
if (startScreen) {
  startScreen.addEventListener("click", (event) => {
    if (startScreen.classList.contains("hidden")) return;
    if (event.target !== startScreen) return;
    startRandomUnlockedScenario();
  });
}
if (menuScenario)
  menuScenario.addEventListener("click", () => {
    // show only train and sandbox options
    hideModal(startScreen);
    showModal(modeScreen);
    resetModePanels();
    modeScreen.classList.add("scenario-only");
  });
if (menuSettings)
  menuSettings.addEventListener("click", () => {
    // open mods/settings panel
    hideModal(startScreen);
    showModal(modeScreen);
    modeScreen.classList.remove("scenario-only");
    openModsPanel();
  });
if (menuScore)
  menuScore.addEventListener("click", () => {
    try {
      if (scorePanel) showModal(scorePanel);
      // populate best scores
      const bAdd = document.getElementById("best_add");
      const bSub = document.getElementById("best_sub");
      const bMul = document.getElementById("best_mul");
      const bDiv = document.getElementById("best_div");
      if (bAdd) bAdd.textContent = String(storage.getBest("add") || 0);
      if (bSub) bSub.textContent = String(storage.getBest("sub") || 0);
      if (bMul) bMul.textContent = String(storage.getBest("mul") || 0);
      if (bDiv) bDiv.textContent = String(storage.getBest("div") || 0);
    } catch (e) {}
  });
if (scoreCloseBtn)
  scoreCloseBtn.addEventListener("click", () => {
    if (scorePanel) hideModal(scorePanel);
  });

pauseBtn.addEventListener("click", () => game.pause());

resetBtn.addEventListener("click", () => {
  game.reset();
  // reset session attempts and update display
  sessionAttempts = 0;
  updateAttemptsDisplay();
  clearAttemptHistory();
  openModeSelection();
});

playAgainBtn.addEventListener("click", () => {
  game.reset();
  // also reset attempts when explicitly choosing to play again
  sessionAttempts = 0;
  updateAttemptsDisplay();
  clearAttemptHistory();
  openModeSelection();
});

if (resetAllBtn) {
  resetAllBtn.addEventListener("click", () => {
    if (confirmResetModal) showModal(confirmResetModal);
  });
}

if (cancelResetBtn) {
  cancelResetBtn.addEventListener("click", () => {
    if (confirmResetModal) hideModal(confirmResetModal);
  });
}

if (confirmResetBtn) {
  confirmResetBtn.addEventListener("click", () => {
    try {
      storage.clearAll();
      localStorage.removeItem("md_mods");
      clearStoredGameSettings();
    } catch (e) {}
    applyGameConfig({ ...baseXmlGameConfig }, { persist: false });
    sessionAttempts = 0;
    updateAttemptsDisplay();
    clearAttemptHistory();
    try {
      if (confirmResetModal) hideModal(confirmResetModal);
    } catch (e) {}
    game.reset();
    openModeSelection();
  });
}

window.addEventListener(
  "pointerdown",
  () => {
    audio.ensure();
    audio.resume();
  },
  { once: true },
);

game.reset();

let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  game.step(dt);
  const isGameOver = !!game.state?.gameOver;
  if (!lastGameOverState && isGameOver) {
    registerFinishedAttempt();
  }
  lastGameOverState = isGameOver;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
showModal(startScreen);
