"use strict";

import {
  DEFAULT_ENEMY_COLLISION_DAMAGE,
  DEFAULT_PLAYER_MOVE_INTERVAL,
  DEFAULT_STARTING_LIVES,
  DEFAULT_TARGET_PERCENT,
  INITIAL_ROUND_TIME,
  PLAYER_CONFIG
} from "./config.js";

const DEFAULT_INVULNERABILITY_DURATION = 1.5;

/*
 * El rodillo empieza pintando una casilla.
 * Cada premio de ampliación suma 1.
 * Máximo: 4 casillas.
 */
const DEFAULT_ROLLER_PAINT_WIDTH = 1;
const MAX_ROLLER_PAINT_WIDTH = 4;


export const GAME_STATUS = Object.freeze({
  IDLE: "idle",
  PLAYING: "playing",
  WON: "won",
  LOST: "lost",
  COMPLETED: "completed"
});


export const ACTION_MODES = Object.freeze({
  RESTART: "restart",
  NEXT_LEVEL: "nextLevel",
  RESTART_GAME: "restartGame"
});


function createInitialPlayerState() {
  return {
    x: PLAYER_CONFIG.startX,
    y: PLAYER_CONFIG.startY,

    startX: PLAYER_CONFIG.startX,
    startY: PLAYER_CONFIG.startY,

    direction: {
      ...PLAYER_CONFIG.initialDirection
    }
  };
}


/* =========================================================
   ESTADO GENERAL
   ========================================================= */

export const gameState = {

  currentLevel: 1,
  levelName: "Nivel 1",

  grid: [],
  paintedCells: 0,
  paintedPercent: 0,
  targetPercent:
    DEFAULT_TARGET_PERCENT,

  player:
    createInitialPlayerState(),

  enemies: [],
  prizes: [],

  lives:
    DEFAULT_STARTING_LIVES,

  timeLeft:
    INITIAL_ROUND_TIME,

  playerMoveInterval:
    DEFAULT_PLAYER_MOVE_INTERVAL,

  enemyCollisionDamage:
    DEFAULT_ENEMY_COLLISION_DAMAGE,

  invulnerabilityDuration:
    DEFAULT_INVULNERABILITY_DURATION,

  /*
   * Tiempo restante de
   * invulnerabilidad.
   */
  invulnerabilityTime: 0,

  /*
   * Tiempo restante de
   * congelación de enemigos.
   */
  enemyFreezeTime: 0,

  /*
   * Anchura actual de pintado.
   *
   * 1 = normal
   * 2 = primera ampliación
   * 3 = segunda ampliación
   * 4 = máximo
   */
  rollerPaintWidth:
    DEFAULT_ROLLER_PAINT_WIDTH,

  running: false,

  gameStatus:
    GAME_STATUS.IDLE,

  actionMode:
    ACTION_MODES.RESTART,

  lastFrameTime: 0,
  moveAccumulator: 0,
  timerAccumulator: 0
};


/* =========================================================
   REINICIO / CAMBIO DE NIVEL
   ========================================================= */

/**
 * Carga el estado necesario para un nivel.
 *
 * preserveLives:
 * conserva las vidas al avanzar.
 *
 * preserveRollerUpgrade:
 * conserva la ampliación del rodillo
 * al avanzar de nivel.
 */
export function resetStateForLevel(
  level,
  {
    preserveLives = false,
    preserveRollerUpgrade = false
  } = {}
) {

  if (
    !level ||
    typeof level !== "object"
  ) {
    throw new TypeError(
      "resetStateForLevel necesita una configuración de nivel válida."
    );
  }


  /*
   * Guardamos estos valores antes
   * de reiniciar el nivel.
   */
  const previousLives =
    gameState.lives;

  const previousRollerPaintWidth =
    gameState.rollerPaintWidth;


  gameState.currentLevel =
    level.id ?? 1;

  gameState.levelName =
    level.name ??
    `Nivel ${gameState.currentLevel}`;


  gameState.grid = [];

  gameState.paintedCells = 0;
  gameState.paintedPercent = 0;


  gameState.targetPercent =
    level.targetPercent ??
    DEFAULT_TARGET_PERCENT;


  gameState.player =
    createInitialPlayerState();


  gameState.enemies = [];
  gameState.prizes = [];


  /* -------------------------
     VIDAS
     ------------------------- */

  if (preserveLives) {

    gameState.lives =
      Math.max(
        0,
        previousLives
      );

  } else {

    gameState.lives =
      level.startingLives ??
      DEFAULT_STARTING_LIVES;
  }


  /* -------------------------
     AMPLIACIÓN DEL RODILLO
     ------------------------- */

  if (preserveRollerUpgrade) {

    gameState.rollerPaintWidth =
      Math.min(
        MAX_ROLLER_PAINT_WIDTH,
        Math.max(
          DEFAULT_ROLLER_PAINT_WIDTH,
          previousRollerPaintWidth
        )
      );

  } else {

    gameState.rollerPaintWidth =
      DEFAULT_ROLLER_PAINT_WIDTH;
  }


  gameState.timeLeft =
    level.roundTime ??
    INITIAL_ROUND_TIME;


  gameState.playerMoveInterval =
    level.playerMoveInterval ??
    DEFAULT_PLAYER_MOVE_INTERVAL;


  gameState.enemyCollisionDamage =
    level.enemyCollisionDamage ??
    DEFAULT_ENEMY_COLLISION_DAMAGE;


  gameState.invulnerabilityDuration =
    level.invulnerabilityDuration ??
    DEFAULT_INVULNERABILITY_DURATION;


  /*
   * Los efectos temporales NO pasan
   * de un nivel al siguiente.
   */
  gameState.invulnerabilityTime = 0;
  gameState.enemyFreezeTime = 0;


  gameState.running = true;

  gameState.gameStatus =
    GAME_STATUS.PLAYING;

  gameState.actionMode =
    ACTION_MODES.RESTART;


  gameState.lastFrameTime =
    performance.now();

  gameState.moveAccumulator = 0;
  gameState.timerAccumulator = 0;
}


/* =========================================================
   ESTADO DE PARTIDA
   ========================================================= */

export function setGameStatus(
  status,
  actionMode = gameState.actionMode
) {

  gameState.gameStatus =
    status;

  gameState.running =
    status ===
    GAME_STATUS.PLAYING;

  gameState.actionMode =
    actionMode;
}


export function isGameRunning() {

  return (
    gameState.running &&
    gameState.gameStatus ===
      GAME_STATUS.PLAYING
  );
}


/* =========================================================
   JUGADOR
   ========================================================= */

export function resetPlayerPosition() {

  if (!gameState.player) {

    gameState.player =
      createInitialPlayerState();

    return;
  }


  gameState.player.x =
    gameState.player.startX;

  gameState.player.y =
    gameState.player.startY;


  gameState.player.direction = {
    ...PLAYER_CONFIG.initialDirection
  };
}


/* =========================================================
   VIDAS
   ========================================================= */

export function addLives(
  amount = 1
) {

  const safeAmount =
    Number.isFinite(amount)
      ? Math.max(
          0,
          Math.floor(amount)
        )
      : 0;


  gameState.lives +=
    safeAmount;


  return gameState.lives;
}


export function removeLives(
  amount = 1
) {

  const safeAmount =
    Number.isFinite(amount)
      ? Math.max(
          0,
          Math.floor(amount)
        )
      : 0;


  gameState.lives =
    Math.max(
      0,
      gameState.lives -
        safeAmount
    );


  return gameState.lives;
}


/* =========================================================
   TIEMPO
   ========================================================= */

export function addTime(
  seconds
) {

  const safeSeconds =
    Number.isFinite(seconds)
      ? Math.max(
          0,
          seconds
        )
      : 0;


  gameState.timeLeft +=
    safeSeconds;


  return gameState.timeLeft;
}


export function removeTime(
  seconds
) {

  const safeSeconds =
    Number.isFinite(seconds)
      ? Math.max(
          0,
          seconds
        )
      : 0;


  gameState.timeLeft =
    Math.max(
      0,
      gameState.timeLeft -
        safeSeconds
    );


  return gameState.timeLeft;
}


/* =========================================================
   INVULNERABILIDAD
   ========================================================= */

export function setInvulnerability(
  seconds
) {

  const safeSeconds =
    Number.isFinite(seconds)
      ? Math.max(
          0,
          seconds
        )
      : 0;


  gameState.invulnerabilityTime =
    Math.max(
      gameState.invulnerabilityTime,
      safeSeconds
    );


  return gameState.invulnerabilityTime;
}


export function updateInvulnerability(
  deltaTime
) {

  const safeDelta =
    Number.isFinite(deltaTime)
      ? Math.max(
          0,
          deltaTime
        )
      : 0;


  gameState.invulnerabilityTime =
    Math.max(
      0,
      gameState.invulnerabilityTime -
        safeDelta
    );


  return gameState.invulnerabilityTime;
}


export function isPlayerInvulnerable() {

  return (
    gameState.invulnerabilityTime >
    0
  );
}


/* =========================================================
   CONGELACIÓN DE ENEMIGOS
   ========================================================= */

/**
 * Activa la congelación.
 *
 * Si ya estaban congelados y queda
 * más tiempo del solicitado,
 * conservamos el tiempo mayor.
 */
export function setEnemyFreeze(
  seconds
) {

  const safeSeconds =
    Number.isFinite(seconds)
      ? Math.max(
          0,
          seconds
        )
      : 0;


  gameState.enemyFreezeTime =
    Math.max(
      gameState.enemyFreezeTime,
      safeSeconds
    );


  return gameState.enemyFreezeTime;
}


/**
 * Reduce el contador de congelación.
 */
export function updateEnemyFreeze(
  deltaTime
) {

  const safeDelta =
    Number.isFinite(deltaTime)
      ? Math.max(
          0,
          deltaTime
        )
      : 0;


  gameState.enemyFreezeTime =
    Math.max(
      0,
      gameState.enemyFreezeTime -
        safeDelta
    );


  return gameState.enemyFreezeTime;
}


/**
 * Indica si los enemigos
 * están congelados.
 */
export function areEnemiesFrozen() {

  return (
    gameState.enemyFreezeTime >
    0
  );
}


/* =========================================================
   AMPLIACIÓN DEL RODILLO
   ========================================================= */

/**
 * Aumenta en un nivel la anchura
 * del rodillo.
 *
 * Máximo: 4.
 */
export function upgradeRollerPaintWidth(
  amount = 1
) {

  const safeAmount =
    Number.isFinite(amount)
      ? Math.max(
          0,
          Math.floor(amount)
        )
      : 0;


  gameState.rollerPaintWidth =
    Math.min(
      MAX_ROLLER_PAINT_WIDTH,
      gameState.rollerPaintWidth +
        safeAmount
    );


  return gameState.rollerPaintWidth;
}


/**
 * El jugador ha perdido una vida.
 *
 * La ampliación desaparece
 * completamente.
 */
export function resetRollerPaintWidth() {

  gameState.rollerPaintWidth =
    DEFAULT_ROLLER_PAINT_WIDTH;


  return gameState.rollerPaintWidth;
}


/**
 * Devuelve la anchura actual.
 */
export function getRollerPaintWidth() {

  return gameState.rollerPaintWidth;
}


/* =========================================================
   CONSTANTES PÚBLICAS
   ========================================================= */

export {
  DEFAULT_ROLLER_PAINT_WIDTH,
  MAX_ROLLER_PAINT_WIDTH
};