export const USER_GAME_SETTINGS_STORAGE_KEY = "md_userGameConfig";
export const USER_GAME_SETTINGS_XML_PATH = "config/game-settings.xml";

export const USER_GAME_SETTINGS_DEFAULTS = {
  difficultyLevel: "normal",
  difficultyMultiplier: 1,
  difficultyProfiles: {
    easy: 0.85,
    normal: 1,
    hard: 1.2,
    insane: 1.4,
  },
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
  heartSpawnChance: 0.06,
  powerUpSpawnChance: 0.018,
  powerMatchChance: 0.5,
  powerClearChance: 0.5,
  matchPowerDuration: 5,
  paceMultiplier: 1,
  enemySpeedMultiplier: 1,
  scoreMultiplier: 1,
};

function parseNumber(text, fallback) {
  const value = Number(text);
  return Number.isFinite(value) ? value : fallback;
}

function parseBoolean(text, fallback) {
  if (typeof text !== "string") return fallback;
  const normalized = text.trim().toLowerCase();
  if (["1", "true", "yes", "sim", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "nao", "não", "off"].includes(normalized))
    return false;
  return fallback;
}

function readText(doc, selector, fallback = "") {
  const el = doc.querySelector(selector);
  if (!el || typeof el.textContent !== "string") return fallback;
  return el.textContent.trim();
}

function parseXmlConfig(xmlText) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) return { ...USER_GAME_SETTINGS_DEFAULTS };

  return {
    difficultyLevel: readText(
      doc,
      "gameSettings > difficulty > level",
      USER_GAME_SETTINGS_DEFAULTS.difficultyLevel,
    ),
    difficultyMultiplier: parseNumber(
      readText(doc, "gameSettings > difficulty > multiplier", ""),
      USER_GAME_SETTINGS_DEFAULTS.difficultyMultiplier,
    ),
    difficultyProfiles: {
      easy: parseNumber(
        readText(doc, "gameSettings > difficulty > profiles > easy", ""),
        USER_GAME_SETTINGS_DEFAULTS.difficultyProfiles.easy,
      ),
      normal: parseNumber(
        readText(doc, "gameSettings > difficulty > profiles > normal", ""),
        USER_GAME_SETTINGS_DEFAULTS.difficultyProfiles.normal,
      ),
      hard: parseNumber(
        readText(doc, "gameSettings > difficulty > profiles > hard", ""),
        USER_GAME_SETTINGS_DEFAULTS.difficultyProfiles.hard,
      ),
      insane: parseNumber(
        readText(doc, "gameSettings > difficulty > profiles > insane", ""),
        USER_GAME_SETTINGS_DEFAULTS.difficultyProfiles.insane,
      ),
    },
    heartsEnabled: parseBoolean(
      readText(doc, "gameSettings > features > heartsEnabled", ""),
      USER_GAME_SETTINGS_DEFAULTS.heartsEnabled,
    ),
    lifePerHeart: parseNumber(
      readText(doc, "gameSettings > player > lifePerHeart", ""),
      USER_GAME_SETTINGS_DEFAULTS.lifePerHeart,
    ),
    bossEnabled: parseBoolean(
      readText(doc, "gameSettings > boss > enabled", ""),
      USER_GAME_SETTINGS_DEFAULTS.bossEnabled,
    ),
    baseLife: parseNumber(
      readText(doc, "gameSettings > player > baseLife", ""),
      USER_GAME_SETTINGS_DEFAULTS.baseLife,
    ),
    maxLife: parseNumber(
      readText(doc, "gameSettings > player > maxLife", ""),
      USER_GAME_SETTINGS_DEFAULTS.maxLife,
    ),
    bossHp: parseNumber(
      readText(doc, "gameSettings > boss > hp", ""),
      USER_GAME_SETTINGS_DEFAULTS.bossHp,
    ),
    bossDamagePerHit: parseNumber(
      readText(doc, "gameSettings > boss > damagePerHit", ""),
      USER_GAME_SETTINGS_DEFAULTS.bossDamagePerHit,
    ),
    bossBarEnabled: parseBoolean(
      readText(doc, "gameSettings > boss > showBar", ""),
      USER_GAME_SETTINGS_DEFAULTS.bossBarEnabled,
    ),
    powerUpsEnabled: parseBoolean(
      readText(doc, "gameSettings > features > powerUpsEnabled", ""),
      USER_GAME_SETTINGS_DEFAULTS.powerUpsEnabled,
    ),
    powerMatchEnabled: parseBoolean(
      readText(doc, "gameSettings > features > powerMatchEnabled", ""),
      USER_GAME_SETTINGS_DEFAULTS.powerMatchEnabled,
    ),
    powerClearEnabled: parseBoolean(
      readText(doc, "gameSettings > features > powerClearEnabled", ""),
      USER_GAME_SETTINGS_DEFAULTS.powerClearEnabled,
    ),
    heartSpawnChance: parseNumber(
      readText(doc, "gameSettings > spawn > heartChance", ""),
      USER_GAME_SETTINGS_DEFAULTS.heartSpawnChance,
    ),
    powerUpSpawnChance: parseNumber(
      readText(doc, "gameSettings > spawn > powerUpChance", ""),
      USER_GAME_SETTINGS_DEFAULTS.powerUpSpawnChance,
    ),
    powerMatchChance: parseNumber(
      readText(doc, "gameSettings > spawn > powerMatchChance", ""),
      USER_GAME_SETTINGS_DEFAULTS.powerMatchChance,
    ),
    powerClearChance: parseNumber(
      readText(doc, "gameSettings > spawn > powerClearChance", ""),
      USER_GAME_SETTINGS_DEFAULTS.powerClearChance,
    ),
    matchPowerDuration: parseNumber(
      readText(doc, "gameSettings > powerUps > matchDuration", ""),
      USER_GAME_SETTINGS_DEFAULTS.matchPowerDuration,
    ),
    paceMultiplier: parseNumber(
      readText(doc, "gameSettings > spawn > paceMultiplier", ""),
      USER_GAME_SETTINGS_DEFAULTS.paceMultiplier,
    ),
    enemySpeedMultiplier: parseNumber(
      readText(doc, "gameSettings > spawn > enemySpeedMultiplier", ""),
      USER_GAME_SETTINGS_DEFAULTS.enemySpeedMultiplier,
    ),
    scoreMultiplier: parseNumber(
      readText(doc, "gameSettings > score > multiplier", ""),
      USER_GAME_SETTINGS_DEFAULTS.scoreMultiplier,
    ),
  };
}

export async function loadXmlGameSettings(path = USER_GAME_SETTINGS_XML_PATH) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return { ...USER_GAME_SETTINGS_DEFAULTS };
    const xmlText = await response.text();
    return {
      ...USER_GAME_SETTINGS_DEFAULTS,
      ...parseXmlConfig(xmlText),
    };
  } catch (error) {
    return { ...USER_GAME_SETTINGS_DEFAULTS };
  }
}

export function loadStoredGameSettings() {
  try {
    const raw = localStorage.getItem(USER_GAME_SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch (error) {
    return null;
  }
}

export function saveStoredGameSettings(config) {
  localStorage.setItem(
    USER_GAME_SETTINGS_STORAGE_KEY,
    JSON.stringify(config || {}),
  );
}

export function clearStoredGameSettings() {
  localStorage.removeItem(USER_GAME_SETTINGS_STORAGE_KEY);
}

export async function loadRuntimeGameSettings(
  xmlPath = USER_GAME_SETTINGS_XML_PATH,
) {
  const xmlDefaults = await loadXmlGameSettings(xmlPath);
  const stored = loadStoredGameSettings();
  const merged = {
    ...xmlDefaults,
    ...(stored || {}),
  };
  return {
    config: merged,
    xmlDefaults,
    stored,
  };
}
