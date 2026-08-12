"use strict";

import {
  DEFAULT_ENEMY_COLLISION_DAMAGE,
  DEFAULT_PLAYER_MOVE_INTERVAL,
  DEFAULT_STARTING_LIVES,
  DEFAULT_TARGET_PERCENT,
  INITIAL_ROUND_TIME,
  PLAYER_CONFIG
} from "./config.js";


const DEFAULT_INVULNERABILITY_DURATION = 3;


/*
 * El rodillo empieza pintando una casilla.
 * Cada premio de ampliación suma 1.
 * Máximo: 4 casillas.
 */
const DEFAULT_ROLLER_PAINT_WIDTH = 1;
const MAX_ROLLER_PAINT_WIDTH = 4;


/*
 * Si el rodillo está ampliado,
 * el objetivo del nivel aumenta.
 *
 * Rodillo normal:
 * objetivo base del nivel -> 80%
 *
 * Rodillo ampliado:
 * objetivo -> 85%
 */
const EXPANDED_ROLLER_TARGET_PERCENT = 85;


/* =========================================================
   ESTADOS DEL JUEGO
   ========================================================= */

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


/* =========================================================
   JUGADOR INICIAL
   ========================================================= */

function createInitialPlayerState() {

  return {

    x:
      PLAYER_CONFIG.startX,

    y:
      PLAYER_CONFIG.startY,


    startX:
      PLAYER_CONFIG.startX,

    startY:
      PLAYER_CONFIG.startY,


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

  levelName:
    "Nivel 1",


  /* -------------------------
     TABLERO
     ------------------------- */

  grid: [],

  paintedCells: 0,

  paintedPercent: 0,


  /*
   * Objetivo base del nivel.
   *
   * Normalmente será 80%.
   */
  baseTargetPercent:
    DEFAULT_TARGET_PERCENT,


  /*
   * Objetivo real actual.
   *
   * Puede subir a 85% si
   * el rodillo está ampliado.
   */
  targetPercent:
    DEFAULT_TARGET_PERCENT,


  /* -------------------------
     JUGADOR
     ------------------------- */

  player:
    createInitialPlayerState(),


  /* -------------------------
     ENTIDADES
     ------------------------- */

  enemies: [],

  prizes: [],


  /* -------------------------
     VIDAS
     ------------------------- */

  lives:
    DEFAULT_STARTING_LIVES,


  /* -------------------------
     TIEMPO
     ------------------------- */

  timeLeft:
    INITIAL_ROUND_TIME,


  /* -------------------------
     MOVIMIENTO
     ------------------------- */

  playerMoveInterval:
    DEFAULT_PLAYER_MOVE_INTERVAL,


  /* -------------------------
     DAÑO
     ------------------------- */

  enemyCollisionDamage:
    DEFAULT_ENEMY_COLLISION_DAMAGE,


  /* -------------------------
     INVULNERABILIDAD
     ------------------------- */

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


  /* -------------------------
     RODILLO
     ------------------------- */

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


  /* -------------------------
     VELOCIDAD DE ENEMIGOS
     ------------------------- */

  /*
   * Nivel desde el que empieza
   * a calcularse nuevamente el
   * aumento de velocidad.
   *
   * Ejemplo:
   *
   * enemySpeedResetLevel = 28
   *
   * Nivel 28 -> ×1.00
   * Nivel 29 -> ×1.06
   * Nivel 30 -> ×1.12
   */
  enemySpeedResetLevel: 1,


  /* -------------------------
     ESTADO DE PARTIDA
     ------------------------- */

  running: false,

  gameStatus:
    GAME_STATUS.IDLE,

  actionMode:
    ACTION_MODES.RESTART,


  /* -------------------------
     BUCLE
     ------------------------- */

  lastFrameTime: 0,

  moveAccumulator: 0,

  timerAccumulator: 0
};


/* =========================================================
   OBJETIVO SEGÚN EL RODILLO
   ========================================================= */

/*
 * Actualiza automáticamente el porcentaje
 * necesario para completar el nivel.
 *
 * Rodillo normal:
 * usa el objetivo base del nivel.
 *
 * Rodillo ampliado:
 * mínimo 85%.
 */
function updateTargetPercentForRoller() {

  if (
    gameState.rollerPaintWidth >
    DEFAULT_ROLLER_PAINT_WIDTH
  ) {

    gameState.targetPercent =
      Math.max(
        gameState.baseTargetPercent,
        EXPANDED_ROLLER_TARGET_PERCENT
      );

  } else {

    gameState.targetPercent =
      gameState.baseTargetPercent;
  }


  return gameState.targetPercent;
}


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


  /* -------------------------
     NIVEL
     ------------------------- */

  gameState.currentLevel =
    level.id ?? 1;


  gameState.levelName =
    level.name ??
    `Nivel ${gameState.currentLevel}`;


  /* -------------------------
     TABLERO
     ------------------------- */

  gameState.grid = [];

  gameState.paintedCells = 0;

  gameState.paintedPercent = 0;


  /*
   * Guardamos primero el objetivo
   * NORMAL del nivel.
   *
   * Después, cuando sepamos si el
   * rodillo está ampliado o no,
   * calcularemos el objetivo real.
   */
  gameState.baseTargetPercent =
    level.targetPercent ??
    DEFAULT_TARGET_PERCENT;


  /* -------------------------
     JUGADOR
     ------------------------- */

  gameState.player =
    createInitialPlayerState();


  /* -------------------------
     ENTIDADES
     ------------------------- */

  gameState.enemies = [];

  gameState.prizes = [];


  /* -------------------------
     VIDAS
     ------------------------- */

  if (
    preserveLives
  ) {

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

  if (
    preserveRollerUpgrade
  ) {

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


  /*
   * Ahora que sabemos qué anchura
   * tiene el rodillo, calculamos
   * el objetivo real.
   *
   * Rodillo normal -> 80%
   * Rodillo ampliado -> 85%
   */
  updateTargetPercentForRoller();


  /* -------------------------
     TIEMPO
     ------------------------- */

  gameState.timeLeft =
    level.roundTime ??
    INITIAL_ROUND_TIME;


  /* -------------------------
     MOVIMIENTO
     ------------------------- */

  gameState.playerMoveInterval =
    level.playerMoveInterval ??
    DEFAULT_PLAYER_MOVE_INTERVAL;


  /* -------------------------
     DAÑO
     ------------------------- */

  gameState.enemyCollisionDamage =
    level.enemyCollisionDamage ??
    DEFAULT_ENEMY_COLLISION_DAMAGE;


  /* -------------------------
     INVULNERABILIDAD
     ------------------------- */

  gameState.invulnerabilityDuration =
    level.invulnerabilityDuration ??
    DEFAULT_INVULNERABILITY_DURATION;


  /*
   * Los efectos temporales NO pasan
   * de un nivel al siguiente.
   */
  gameState.invulnerabilityTime = 0;

  gameState.enemyFreezeTime = 0;


  /* -------------------------
     ESTADO
     ------------------------- */

  gameState.running = true;


  gameState.gameStatus =
    GAME_STATUS.PLAYING;


  gameState.actionMode =
    ACTION_MODES.RESTART;


  /* -------------------------
     BUCLE
     ------------------------- */

  gameState.lastFrameTime =
    performance.now();


  gameState.moveAccumulator = 0;

  gameState.timerAccumulator = 0;
}


/* =========================================================
   PROGRESIÓN DE VELOCIDAD DE ENEMIGOS
   ========================================================= */

/**
 * Reinicia la progresión de velocidad
 * a partir de un nivel concreto.
 *
 * Si no indicamos nivel, utiliza
 * automáticamente el nivel actual.
 *
 * Ejemplo:
 *
 * Nivel actual: 28
 *
 * resetEnemySpeedProgression()
 *
 * Resultado:
 *
 * Nivel 28 -> ×1.00
 * Nivel 29 -> ×1.06
 * Nivel 30 -> ×1.12
 */
export function resetEnemySpeedProgression(
  levelNumber =
    gameState.currentLevel
) {

  const numericLevel =
    Math.floor(
      Number(
        levelNumber
      )
    );


  const safeLevel =
    Number.isFinite(
      numericLevel
    )
      ? Math.max(
          1,
          numericLevel
        )
      : Math.max(
          1,
          gameState.currentLevel
        );


  gameState.enemySpeedResetLevel =
    safeLevel;


  return (
    gameState.enemySpeedResetLevel
  );
}


/**
 * Devuelve el nivel desde el que
 * se está contando actualmente
 * el incremento de velocidad.
 */
export function getEnemySpeedResetLevel() {

  return (
    gameState.enemySpeedResetLevel
  );
}


/* =========================================================
   ESTADO DE PARTIDA
   ========================================================= */

export function setGameStatus(
  status,
  actionMode =
    gameState.actionMode
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

  if (
    !gameState.player
  ) {

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
    Number.isFinite(
      amount
    )
      ? Math.max(
          0,
          Math.floor(
            amount
          )
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
    Number.isFinite(
      amount
    )
      ? Math.max(
          0,
          Math.floor(
            amount
          )
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
    Number.isFinite(
      seconds
    )
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
    Number.isFinite(
      seconds
    )
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
    Number.isFinite(
      seconds
    )
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


  return (
    gameState.invulnerabilityTime
  );
}


export function updateInvulnerability(
  deltaTime
) {

  const safeDelta =
    Number.isFinite(
      deltaTime
    )
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


  return (
    gameState.invulnerabilityTime
  );
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
    Number.isFinite(
      seconds
    )
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


  return (
    gameState.enemyFreezeTime
  );
}


/**
 * Reduce el contador de congelación.
 */
export function updateEnemyFreeze(
  deltaTime
) {

  const safeDelta =
    Number.isFinite(
      deltaTime
    )
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


  return (
    gameState.enemyFreezeTime
  );
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
 *
 * En cuanto el rodillo queda ampliado,
 * el objetivo del nivel pasa a 85%.
 */
export function upgradeRollerPaintWidth(
  amount = 1
) {

  const safeAmount =
    Number.isFinite(
      amount
    )
      ? Math.max(
          0,
          Math.floor(
            amount
          )
        )
      : 0;


  gameState.rollerPaintWidth =
    Math.min(
      MAX_ROLLER_PAINT_WIDTH,
      gameState.rollerPaintWidth +
        safeAmount
    );


  /*
   * Una ampliación, dos o tres:
   * mientras el rodillo sea mayor
   * que 1, el objetivo será 85%.
   */
  updateTargetPercentForRoller();


  return (
    gameState.rollerPaintWidth
  );
}


/**
 * El jugador ha perdido una vida.
 *
 * La ampliación desaparece
 * completamente.
 *
 * Al volver el rodillo a tamaño normal,
 * el objetivo vuelve también al
 * porcentaje base del nivel.
 */
export function resetRollerPaintWidth() {

  gameState.rollerPaintWidth =
    DEFAULT_ROLLER_PAINT_WIDTH;


  /*
   * Por ejemplo:
   *
   * 85% -> 80%
   */
  updateTargetPercentForRoller();


  return (
    gameState.rollerPaintWidth
  );
}


/**
 * Devuelve la anchura actual.
 */
export function getRollerPaintWidth() {

  return (
    gameState.rollerPaintWidth
  );
}


/* =========================================================
   CONSTANTES PÚBLICAS
   ========================================================= */

export {
  DEFAULT_ROLLER_PAINT_WIDTH,
  MAX_ROLLER_PAINT_WIDTH
};
