"use strict";

export const BUTTON_MODES = Object.freeze({
  RESTART: "restart",
  NEXT_LEVEL: "nextLevel",
  RESTART_GAME: "restartGame"
});

const BUTTON_TEXT = Object.freeze({
  [BUTTON_MODES.RESTART]: "Reiniciar partida",
  [BUTTON_MODES.NEXT_LEVEL]: "Siguiente nivel",
  [BUTTON_MODES.RESTART_GAME]: "Volver a empezar"
});

let elements = null;
let buttonMode = BUTTON_MODES.RESTART;
let initialized = false;
let mainButtonHandler = null;

function required(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Falta el elemento del HUD #${id}.`);
  return element;
}

function optional(id) {
  return document.getElementById(id);
}

export function initializeHud() {
  if (initialized) return;

  elements = {
    lives: required("lives"),
    percent: required("percent"),
    time: required("time"),
    message: required("message"),
    mainButton: required("restart"),
    target: optional("target"),
    levelNumber: optional("level-number"),
    levelName: optional("level-name")
  };

  initialized = true;
  setButtonMode(BUTTON_MODES.RESTART);
  hideMessage();
}

function ensureInitialized() {
  if (!initialized) initializeHud();
}

export function updateHud(values = {}) {
  ensureInitialized();

  if (values.lives !== undefined) {
    elements.lives.textContent = String(Math.max(0, Math.floor(values.lives)));
  }

  if (values.percent !== undefined) {
    const percent = Math.max(0, Math.min(100, Number(values.percent) || 0));
    elements.percent.textContent = `${percent.toFixed(1)}%`;
  }

  if (values.timeLeft !== undefined) {
    elements.time.textContent = String(Math.max(0, Math.ceil(Number(values.timeLeft) || 0)));
  }

  if (elements.target && values.targetPercent !== undefined) {
    elements.target.textContent = `${Math.max(0, Math.min(100, Number(values.targetPercent) || 0))}%`;
  }

  if (elements.levelNumber && values.levelNumber !== undefined) {
    elements.levelNumber.textContent = String(values.levelNumber);
  }

  if (elements.levelName && values.levelName !== undefined) {
    elements.levelName.textContent = String(values.levelName ?? "");
  }
}

export function showMessage(text) {
  ensureInitialized();
  elements.message.textContent = String(text ?? "");
  elements.message.classList.remove("hidden");
  elements.message.setAttribute("aria-hidden", "false");
}

export function hideMessage() {
  ensureInitialized();
  elements.message.classList.add("hidden");
  elements.message.setAttribute("aria-hidden", "true");
}

export function showLevelCompleted(targetPercent) {
  showMessage(`¡Nivel completado! Has pintado el ${targetPercent}%.`);
}

export function showDefeat(reason = "") {
  if (reason === "time") {
    showMessage("Se ha agotado el tiempo.");
  } else if (reason === "lives") {
    showMessage("Te has quedado sin vidas.");
  } else {
    showMessage("Fin de la partida.");
  }
}

export function showGameCompleted() {
  showMessage("¡Has completado todos los niveles!");
}

export function setButtonMode(mode) {
  ensureInitialized();
  if (!Object.values(BUTTON_MODES).includes(mode)) {
    throw new Error(`Modo de botón desconocido: ${mode}`);
  }
  buttonMode = mode;
  elements.mainButton.textContent = BUTTON_TEXT[mode];
  elements.mainButton.dataset.mode = mode;
}

export function getButtonMode() {
  return buttonMode;
}

export function setMainButtonHandler(callback) {
  ensureInitialized();
  if (typeof callback !== "function") {
    throw new TypeError("setMainButtonHandler necesita una función.");
  }

  if (mainButtonHandler) {
    elements.mainButton.removeEventListener("click", mainButtonHandler);
  }

  mainButtonHandler = (event) => callback(buttonMode, event);
  elements.mainButton.addEventListener("click", mainButtonHandler);
}
