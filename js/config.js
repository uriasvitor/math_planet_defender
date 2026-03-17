export const TOTAL_TIME = 240; // 4 minutos
export const STORAGE_KEY = "mathDefenderHighScores";

export const digitStages = [
  { min: 1, max: 1 }, // comeca com 1 algarismo
  { min: 2, max: 2 }, // fica 2 algarismos
  { min: 4, max: 10 }, // vai ate 4-10 algarismos
];

export const digitStagesByScenario = {
  add: [
    { min: 1, max: 1 },
    { min: 2, max: 2 },
    { min: 3, max: 3 },
  ],
};

export const maxDigitsByScenario = {
  add: 3,
  train: 6,
  sub: 10,
  mul: 6, // limitar para manter resultados seguros
  div: 6,
  sqrt: 6,
};

export const scenarios = {
  add: { name: "Soma", spawn: 1.8, speed: 45 },
  train: { name: "Treino", spawn: 1.8, speed: 45 },
  sandbox: { name: "Sandbox", spawn: 1.8, speed: 45 },
  recuperacao: { name: "Recuperação", spawn: 1.6, speed: 45 },
  sub: { name: "Subtracao", spawn: 2.0, speed: 50 },
  mul: { name: "Multiplicacao", spawn: 2.0, speed: 49 },
  div: { name: "Divisao", spawn: 2.1, speed: 48 },
  sqrt: { name: "Raiz", spawn: 2.2, speed: 45 },
  pow: { name: "Potenciação", spawn: 2.0, speed: 50 },
  percent: { name: "Porcentagem", spawn: 2.0, speed: 50 },
  decimal: { name: "Decimais", spawn: 2.0, speed: 50 },
};

export function formatTime(seconds) {
  const clamped = Math.max(0, Math.ceil(seconds));
  const m = String(Math.floor(clamped / 60)).padStart(2, "0");
  const s = String(clamped % 60).padStart(2, "0");
  return `${m}:${s}`;
}
