"use strict";

import {
  MAX_DELTA_TIME,
  PLAYER_CONFIG,
  TIMER_UPDATE_INTERVAL
} from "./config.js";

import {
  GAME_STATUS,
  addLives,
  addTime,
  areEnemiesFrozen,
  gameState,
  getEnemySpeedResetLevel,
  isGameRunning,
  isPlayerInvulnerable,
  removeLives,
  removeTime,
  resetEnemySpeedProgression,
  resetRollerPaintWidth,
  resetStateForLevel,
  setEnemyFreeze,
  setEnemySlow,
  setGameStatus,
  setInvulnerability,
  updateEnemyFreeze,
  updateEnemySlow,
  updateInvulnerability,
  upgradeRollerPaintWidth
} from "./state.js";

import {
  clearBoardImage,
  loadBoardImage,
  resetBoard
} from "./board.js";

import {
  getRollerCenter,
  moveRoller,
  resetRoller,
  respawnRoller
} from "./roller.js";

import {
  playHitSound,
  playLevelSound,
  playPaintSound,
  playPrizeSound,
  toggleMuted,
  isMuted
} from "./audio.js";

import {
  clearInput,
  disableInput,
  enableInput,
  getMovementDirection,
  initializeInput
} from "./input.js";

import {
  createEnemies,
  updateEnemies
} from "./enemies.js";

import {
  collectPrizeAtPlayer,
  createPrizes
} from "./prizes.js";

import {
  getLevel,
  hasNextLevel
} from "./levels.js";

import {
  hideMessage,
  initializeHud,
  showDefeat,
  showGameCompleted,
  showLevelCompleted,
  updateHud
} from "./hud.js";

import {
  renderFrame
} from "./renderer.js";


/* =========================================================
   DIFICULTAD DINÁMICA
   ========================================================= */

/*
 * Cada nivel superado desde el último
 * reinicio aumenta la velocidad un 6%.
 */
const ENEMY_SPEED_INCREASE_PER_LEVEL =
  0.06;


/*
 * Conservamos un techo de seguridad.
 *
 * Normalmente el jugador perderá una vida
 * y reiniciará la progresión mucho antes.
 */
const MAX_ENEMY_SPEED_MULTIPLIER =
  3.5;


/*
 * En estos niveles la velocidad vuelve
 * automáticamente a ×1.
 *
 * 5  -> aparece tercer enemigo
 * 11 -> aparece cuarto enemigo
 * 18 -> aparece quinto enemigo
 * 22 -> último reinicio programado
 */
const AUTOMATIC_SPEED_RESET_LEVELS =
  Object.freeze([
    1,
    5,
    11,
    18,
    22
  ]);


/* =========================================================
   ELEMENTOS HTML
   ========================================================= */

const canvas =
  document.getElementById("game");

if (!canvas) {
  throw new Error(
    "No se ha encontrado el canvas #game."
  );
}


const context =
  canvas.getContext("2d");

if (!context) {
  throw new Error(
    "No se pudo obtener el contexto 2D del canvas."
  );
}


const gameShell =
  canvas.closest(".game-shell");


const messageElement =
  document.getElementById("message");

const pauseButton =
  document.getElementById("pause");

const muteButton =
  document.getElementById("mute");

const fullscreenButton =
  document.getElementById("fullscreen");


/* =========================================================
   ESTADO LOCAL
   ========================================================= */

let waitingToStart = false;
let paused = false;


/*
 * Acción pendiente al tocar el tablero.
 *
 * null
 * "nextLevel"
 * "retryLevel"
 * "restartGame"
 */
let boardTouchAction = null;

let boardTouchReady = false;
let boardTouchInProgress = false;
let boardTouchTimeout = null;


/* =========================================================
   VELOCIDAD DINÁMICA DE ENEMIGOS
   ========================================================= */

function isAutomaticSpeedResetLevel(
  levelNumber
) {

  return (
    AUTOMATIC_SPEED_RESET_LEVELS
      .includes(
        levelNumber
      )
  );
}


/*
 * Calcula el multiplicador según la distancia
 * desde el último nivel de reinicio.
 *
 * Ejemplo:
 *
 * reset = 22
 *
 * 22 -> ×1.00
 * 23 -> ×1.06
 * 24 -> ×1.12
 * 25 -> ×1.18
 */
function getCurrentEnemySpeedMultiplier(
  levelNumber =
    gameState.currentLevel
) {

  const resetLevel =
    getEnemySpeedResetLevel();


  const levelsSinceReset =
    Math.max(
      0,
      levelNumber -
        resetLevel
    );


  const multiplier =
    1 +
    levelsSinceReset *
      ENEMY_SPEED_INCREASE_PER_LEVEL;


  return Math.min(
    MAX_ENEMY_SPEED_MULTIPLIER,
    multiplier
  );
}


/*
 * Devuelve una copia de las configuraciones
 * de enemigos aplicando el multiplicador
 * actual.
 */
function getScaledEnemyConfigurations(
  enemies,
  levelNumber
) {

  const safeEnemies =
    Array.isArray(
      enemies
    )
      ? enemies
      : [];


  const multiplier =
    getCurrentEnemySpeedMultiplier(
      levelNumber
    );


  return safeEnemies.map(
    (enemy) => ({

      ...enemy,

      vx:
        enemy.vx *
        multiplier,

      vy:
        enemy.vy *
        multiplier
    })
  );
}


/*
 * Al perder una vida NO reiniciamos
 * el tablero ni recolocamos los enemigos.
 *
 * Conservamos sus posiciones y direcciones,
 * pero devolvemos su velocidad a ×1.
 */
function resetCurrentEnemySpeed() {

  const multiplier =
    getCurrentEnemySpeedMultiplier(
      gameState.currentLevel
    );


  /*
   * Marcamos el nivel actual como
   * nuevo punto ×1.
   */
  resetEnemySpeedProgression(
    gameState.currentLevel
  );


  /*
   * Si ya estaban a ×1 no tenemos
   * que modificar nada.
   */
  if (
    multiplier <= 1
  ) {
    return;
  }


  if (
    !Array.isArray(
      gameState.enemies
    )
  ) {
    return;
  }


  /*
   * Dividimos por el multiplicador que
   * tenían actualmente.
   *
   * Esto conserva:
   *
   * - posición;
   * - dirección;
   * - rebotes actuales.
   */
  for (
    const enemy
    of gameState.enemies
  ) {

    enemy.vx /=
      multiplier;

    enemy.vy /=
      multiplier;
  }
}


/* =========================================================
   HUD
   ========================================================= */

function refreshHud() {

  updateHud({

    lives:
      gameState.lives,

    percent:
      gameState.paintedPercent,

    targetPercent:
      gameState.targetPercent,

    timeLeft:
      gameState.timeLeft,

    levelNumber:
      gameState.currentLevel,

    levelName:
      gameState.levelName
  });
}


/* =========================================================
   SONIDO
   ========================================================= */

function refreshMuteButton() {

  if (!muteButton) {
    return;
  }


  if (
    isMuted()
  ) {

    muteButton.textContent =
      "🔇";

  } else {

    muteButton.textContent =
      "🔊";
  }
}


function toggleSound() {

  toggleMuted();

  refreshMuteButton();
}


/* =========================================================
   PANTALLA COMPLETA
   ========================================================= */

function refreshFullscreenButton() {

  if (!fullscreenButton) {
    return;
  }


  if (
    document.fullscreenElement
  ) {

    fullscreenButton.textContent =
      "🗗";

    fullscreenButton.title =
      "Salir de pantalla completa";

    fullscreenButton.setAttribute(
      "aria-label",
      "Salir de pantalla completa"
    );

  } else {

    fullscreenButton.textContent =
      "⛶";

    fullscreenButton.title =
      "Pantalla completa";

    fullscreenButton.setAttribute(
      "aria-label",
      "Pantalla completa"
    );
  }
}


async function toggleFullscreen() {

  try {

    if (
      !document.fullscreenElement
    ) {

      await document.documentElement
        .requestFullscreen();

    } else {

      await document.exitFullscreen();
    }

  } catch (error) {

    console.warn(
      "No se pudo cambiar el modo de pantalla completa.",
      error
    );
  }
}


/* =========================================================
   PAUSA
   ========================================================= */

function refreshPauseButton() {

  if (!pauseButton) {
    return;
  }


  if (
    waitingToStart
  ) {

    pauseButton.textContent =
      "⏸";

    pauseButton.disabled = true;

    return;
  }


  if (
    !isGameRunning()
  ) {

    pauseButton.textContent =
      "⏸";

    pauseButton.disabled = true;

    return;
  }


  pauseButton.disabled = false;


  if (
    paused
  ) {

    pauseButton.textContent =
      "▶";

  } else {

    pauseButton.textContent =
      "⏸";
  }
}


/* =========================================================
   MENSAJE DE PAUSA
   ========================================================= */

function showPauseMessage() {

  if (!messageElement) {
    return;
  }


  messageElement.innerHTML = `
    <div>

      <div>
        ⏸ PAUSA
      </div>

      <div
        style="
          margin-top: 14px;
          font-size: 0.45em;
          font-weight: 700;
        "
      >
        Pulsa Continuar para seguir
      </div>

    </div>
  `;


  messageElement.classList.remove(
    "hidden"
  );

  messageElement.setAttribute(
    "aria-hidden",
    "false"
  );
}


/* =========================================================
   PAUSAR / CONTINUAR
   ========================================================= */

function pauseGame() {

  if (
    waitingToStart ||
    paused ||
    !isGameRunning()
  ) {
    return;
  }


  paused = true;


  clearInput();
  disableInput();


  showPauseMessage();

  refreshPauseButton();
}


function resumeGame() {

  if (
    waitingToStart ||
    !paused ||
    !isGameRunning()
  ) {
    return;
  }


  paused = false;


  hideMessage();

  clearInput();
  enableInput();


  gameState.lastFrameTime =
    performance.now();


  refreshPauseButton();
}


function togglePause() {

  if (
    paused
  ) {

    resumeGame();

  } else {

    pauseGame();
  }
}


/* =========================================================
   CONTROL DEL TOQUE DEL TABLERO
   ========================================================= */

function resetBoardTouchAction() {

  boardTouchAction = null;

  boardTouchReady = false;
  boardTouchInProgress = false;


  if (
    boardTouchTimeout !== null
  ) {

    clearTimeout(
      boardTouchTimeout
    );

    boardTouchTimeout = null;
  }
}


/*
 * Prepara una acción que podrá realizarse
 * tocando el tablero después de 2 segundos.
 */
function prepareBoardTouchAction(
  action,
  readyMessage
) {

  resetBoardTouchAction();


  boardTouchAction =
    action;


  boardTouchTimeout =
    setTimeout(
      () => {

        boardTouchTimeout = null;

        boardTouchReady = true;


        if (
          messageElement
        ) {

          messageElement.textContent =
            readyMessage;
        }

      },
      2000
    );
}


/* =========================================================
   TOCAR TABLERO
   ========================================================= */

async function handleBoardPointerDown(
  event
) {

  if (
    !boardTouchReady ||
    boardTouchInProgress ||
    !boardTouchAction
  ) {
    return;
  }


  event.preventDefault();


  const action =
    boardTouchAction;


  boardTouchReady = false;
  boardTouchInProgress = true;


  /* -------------------------
     SIGUIENTE NIVEL
     ------------------------- */

  if (
    action === "nextLevel"
  ) {

    await loadLevel(
      gameState.currentLevel + 1,
      {
        preserveLives: true,
        preserveRollerUpgrade: true,
        waitForStart: false
      }
    );


    return;
  }


  /* -------------------------
     REPETIR POR TIEMPO
     ------------------------- */

  if (
    action === "retryLevel"
  ) {

    /*
     * El nuevo intento comienza
     * a velocidad ×1.
     */
    resetEnemySpeedProgression(
      gameState.currentLevel
    );


    await loadLevel(
      gameState.currentLevel,
      {
        preserveLives: true,
        preserveRollerUpgrade: true,
        waitForStart: false
      }
    );


    return;
  }


  /* -------------------------
     NUEVA PARTIDA
     ------------------------- */

  if (
    action === "restartGame"
  ) {

    /*
     * Partida completamente nueva:
     * la progresión vuelve al nivel 1.
     */
    resetEnemySpeedProgression(
      1
    );


    await loadLevel(
      1,
      {
        preserveLives: false,
        preserveRollerUpgrade: false,
        waitForStart: false
      }
    );
  }
}


/* =========================================================
   PANTALLA INICIAL
   ========================================================= */

function showStartScreen() {

  waitingToStart = true;
  paused = false;


  resetBoardTouchAction();


  clearInput();
  disableInput();


  if (
    messageElement
  ) {

    messageElement.innerHTML = `
      <div>

        <div>
          ESQUIVA Y PINTA
        </div>

        <div
          style="
            margin-top: 14px;
            font-size: 0.38em;
            font-weight: 600;
            line-height: 1.4;
          "
        >
          Descubre el porcentaje objetivo de la imagen
          sin quedarte sin vidas.
        </div>

        <button
          id="start-game"
          type="button"
          style="
            margin-top: 22px;
            font-size: 0.42em;
          "
        >
          ▶ Empezar
        </button>

      </div>
    `;


    messageElement.classList.remove(
      "hidden"
    );


    messageElement.setAttribute(
      "aria-hidden",
      "false"
    );


    const startButton =
      document.getElementById(
        "start-game"
      );


    if (
      startButton
    ) {

      startButton.addEventListener(
        "click",
        startGame
      );
    }
  }


  refreshPauseButton();
}


function startGame() {

  if (
    !waitingToStart
  ) {
    return;
  }


  waitingToStart = false;
  paused = false;


  resetBoardTouchAction();


  if (
    messageElement
  ) {

    messageElement.classList.remove(
      "level-completed"
    );
  }


  hideMessage();


  clearInput();
  enableInput();


  gameState.lastFrameTime =
    performance.now();


  gameState.timerAccumulator = 0;
  gameState.moveAccumulator = 0;


  refreshPauseButton();
}


/* =========================================================
   CARGA DE NIVEL
   ========================================================= */

async function loadLevel(
  levelNumber,
  {
    preserveLives = false,
    preserveRollerUpgrade = false,
    waitForStart = false
  } = {}
) {

  const level =
    getLevel(
      levelNumber
    );


  if (!level) {
    return false;
  }


  resetBoardTouchAction();


  waitingToStart = false;
  paused = false;


  /*
   * Los niveles especiales comienzan
   * siempre a ×1.
   */
  if (
    isAutomaticSpeedResetLevel(
      levelNumber
    )
  ) {

    resetEnemySpeedProgression(
      levelNumber
    );
  }


  if (
    messageElement
  ) {

    messageElement.classList.remove(
      "level-completed"
    );
  }


  disableInput();


  resetStateForLevel(
    level,
    {
      preserveLives,
      preserveRollerUpgrade
    }
  );


  resetBoard();


  const initialPaint =
    resetRoller();


  /*
   * levels.js entrega velocidades base.
   *
   * Aquí aplicamos el multiplicador
   * dinámico correspondiente.
   */
  const scaledEnemies =
    getScaledEnemyConfigurations(
      level.enemies,
      levelNumber
    );


  createEnemies(
    scaledEnemies
  );


  createPrizes(
    level.prizes
  );


  /* -------------------------
     FONDO
     ------------------------- */

  clearBoardImage();


  if (
    level.image
  ) {

    try {

      await loadBoardImage(
        level.image
      );

    } catch (error) {

      console.warn(
        error
      );
    }
  }


  /* -------------------------
     PREPARAR NIVEL
     ------------------------- */

  gameState.lastFrameTime =
    performance.now();


  gameState.timerAccumulator = 0;
  gameState.moveAccumulator = 0;


  clearInput();


  refreshHud();


  if (
    initialPaint.targetReached
  ) {

    finishLevel();

    return true;
  }


  if (
    waitForStart
  ) {

    showStartScreen();

  } else {

    hideMessage();

    enableInput();

    refreshPauseButton();
  }


  return true;
}


/* =========================================================
   PINTURA
   ========================================================= */

function handlePaintResult(
  result
) {

  if (!result) {
    return;
  }


  if (
    result.painted ||
    result.paintedCells > 0
  ) {

    playPaintSound();

    refreshHud();
  }


  if (
    result.targetReached &&
    isGameRunning()
  ) {

    finishLevel();
  }
}


/* =========================================================
   RODILLO
   ========================================================= */

function updatePlayerMovement(
  deltaTime
) {

  gameState.moveAccumulator +=
    deltaTime;


  while (
    gameState.moveAccumulator >=
    gameState.playerMoveInterval
  ) {

    gameState.moveAccumulator -=
      gameState.playerMoveInterval;


    const direction =
      getMovementDirection();


    if (!direction) {
      continue;
    }


    const result =
      moveRoller(
        direction
      );


    handlePaintResult(
      result
    );


    if (
      !isGameRunning()
    ) {
      return;
    }
  }
}


/* =========================================================
   ENEMIGOS
   ========================================================= */

function updateEnemySystem(
  deltaTime
) {

  if (
    areEnemiesFrozen()
  ) {
    return;
  }


  const result =
    updateEnemies(
      deltaTime,
      {

        targetCenter:
          getRollerCenter(),

        targetRadius:
          PLAYER_CONFIG
            .collisionRadius,

        detectCollisions:
          !isPlayerInvulnerable()
      }
    );


  if (
    result.collision
  ) {

    damagePlayer();
  }
}


/* =========================================================
   DAÑO
   ========================================================= */

function damagePlayer() {

  if (
    !isGameRunning() ||
    isPlayerInvulnerable()
  ) {
    return;
  }


  removeLives(
    gameState
      .enemyCollisionDamage
  );


  playHitSound();


  resetRollerPaintWidth();


  /*
   * Una sola vida perdida reinicia
   * inmediatamente la velocidad de
   * todos los enemigos a ×1.
   *
   * No reiniciamos:
   *
   * - tablero;
   * - porcentaje;
   * - tiempo;
   * - posiciones de enemigos.
   */
  resetCurrentEnemySpeed();


  respawnRoller();


  setInvulnerability(
    gameState
      .invulnerabilityDuration
  );


  refreshHud();


  if (
    gameState.lives <= 0
  ) {

    loseGame(
      "lives"
    );
  }
}


/* =========================================================
   PREMIOS
   ========================================================= */

function updatePrizeSystem() {

  const result =
    collectPrizeAtPlayer(
      getRollerCenter(),
      PLAYER_CONFIG
        .collisionRadius
    );


  if (
    !result.collected ||
    !result.effect
  ) {
    return;
  }


  /*
   * Reproduce el sonido correspondiente
   * al tipo de premio recogido.
   */
  playPrizeSound(
    result.prize?.type
  );


  const effect =
    result.effect;


  /* -------------------------
     VIDA EXTRA
     ------------------------- */

  if (
    effect.extraLives > 0
  ) {

    addLives(
      effect.extraLives
    );
  }


  /* -------------------------
     TIEMPO EXTRA
     ------------------------- */

  if (
    effect.extraTime > 0
  ) {

    addTime(
      effect.extraTime
    );
  }


  /* -------------------------
     INVULNERABILIDAD
     ------------------------- */

  if (
    effect.invulnerabilityTime > 0
  ) {

    setInvulnerability(
      effect.invulnerabilityTime
    );
  }


  /* -------------------------
     CONGELAR ENEMIGOS
     ------------------------- */

  if (
    effect.freezeEnemiesTime > 0
  ) {

    setEnemyFreeze(
      effect.freezeEnemiesTime
    );
  }


  /* -------------------------
     CARACOL
     ------------------------- */

  if (
    effect.slowEnemiesTime > 0
  ) {

    setEnemySlow(
      effect.slowEnemiesTime
    );
  }


  /* -------------------------
     AMPLIACIÓN DEL RODILLO
     ------------------------- */

  if (
    effect.rollerUpgrade > 0
  ) {

    upgradeRollerPaintWidth(
      effect.rollerUpgrade
    );
  }


  /* -------------------------
     EXPLOSIÓN DE PINTURA
     ------------------------- */

  if (
    effect.paintResult
  ) {

    handlePaintResult(
      effect.paintResult
    );
  }


  refreshHud();
}
/* =========================================================
   TEMPORIZADOR
   ========================================================= */

function updateTimer(
  deltaTime
) {

  gameState.timerAccumulator +=
    deltaTime;


  if (
    gameState.timerAccumulator <
    TIMER_UPDATE_INTERVAL
  ) {
    return;
  }


  removeTime(
    gameState.timerAccumulator
  );


  gameState.timerAccumulator = 0;


  refreshHud();


  if (
    gameState.timeLeft <= 0
  ) {

    /*
     * El nivel repetido empezará a ×1.
     */
    resetEnemySpeedProgression(
      gameState.currentLevel
    );


    loseGame(
      "time"
    );
  }
}


/* =========================================================
   UPDATE
   ========================================================= */

function update(
  deltaTime
) {

  if (
    waitingToStart ||
    paused
  ) {
    return;
  }


  if (
    !isGameRunning()
  ) {
    return;
  }


  updateInvulnerability(
    deltaTime
  );


  updateEnemyFreeze(
    deltaTime
  );


  /*
   * Descontamos el tiempo del caracol.
   *
   * Igual que los demás efectos temporales,
   * no avanza mientras el juego está
   * pausado o detenido.
   */
  updateEnemySlow(
    deltaTime
  );


  updatePlayerMovement(
    deltaTime
  );


  if (
    !isGameRunning()
  ) {
    return;
  }


  updateEnemySystem(
    deltaTime
  );


  if (
    !isGameRunning()
  ) {
    return;
  }


  updatePrizeSystem();


  if (
    !isGameRunning()
  ) {
    return;
  }


  updateTimer(
    deltaTime
  );
}


/* =========================================================
   NIVEL COMPLETADO
   ========================================================= */

function finishLevel() {

  playLevelSound();


  paused = false;


  disableInput();


  if (
    messageElement
  ) {

    messageElement.classList.add(
      "level-completed"
    );
  }


  if (
    hasNextLevel(
      gameState.currentLevel
    )
  ) {

    setGameStatus(
      GAME_STATUS.WON
    );


    showLevelCompleted();


    prepareBoardTouchAction(
      "nextLevel",
      "¡Nivel completado! Toca para continuar."
    );


    refreshPauseButton();


    return;
  }


  resetBoardTouchAction();


  setGameStatus(
    GAME_STATUS.COMPLETED
  );


  showGameCompleted();


  refreshPauseButton();
}


/* =========================================================
   DERROTA
   ========================================================= */

function loseGame(
  reason
) {

  waitingToStart = false;
  paused = false;


  resetBoardTouchAction();


  disableInput();


  setGameStatus(
    GAME_STATUS.LOST
  );


  showDefeat(
    reason
  );


  /* -------------------------
     TIEMPO AGOTADO
     ------------------------- */

  if (
    reason === "time"
  ) {

    prepareBoardTouchAction(
      "retryLevel",
      "Tiempo agotado. Toca para repetir."
    );


    refreshPauseButton();

    return;
  }


  /* -------------------------
     SIN VIDAS
     ------------------------- */

  if (
    reason === "lives"
  ) {

    prepareBoardTouchAction(
      "restartGame",
      "Sin vidas. Toca para volver a empezar."
    );


    refreshPauseButton();

    return;
  }


  refreshPauseButton();
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

  renderFrame(
    context,
    canvas,
    {

      invulnerabilityTime:
        gameState
          .invulnerabilityTime,

      enemyFreezeTime:
        gameState
          .enemyFreezeTime,

      rollerPaintWidth:
        gameState
          .rollerPaintWidth
    }
  );
}


/* =========================================================
   BUCLE PRINCIPAL
   ========================================================= */

function frame(
  currentTime
) {

  const elapsedTime =
    (
      currentTime -
      gameState.lastFrameTime
    ) /
    1000;


  const deltaTime =
    Math.min(
      MAX_DELTA_TIME,
      Math.max(
        0,
        elapsedTime
      )
    );


  gameState.lastFrameTime =
    currentTime;


  update(
    deltaTime
  );


  render();


  requestAnimationFrame(
    frame
  );
}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

async function initializeGame() {

  initializeHud();

  initializeInput();


  if (
    pauseButton
  ) {

    pauseButton.addEventListener(
      "click",
      togglePause
    );
  }


  if (
    muteButton
  ) {

    muteButton.addEventListener(
      "click",
      toggleSound
    );
  }


  if (
    fullscreenButton
  ) {

    fullscreenButton.addEventListener(
      "click",
      toggleFullscreen
    );
  }


  if (
    gameShell
  ) {

    gameShell.addEventListener(
      "pointerdown",
      handleBoardPointerDown
    );
  }


  document.addEventListener(
    "fullscreenchange",
    refreshFullscreenButton
  );


  refreshMuteButton();

  refreshFullscreenButton();


  /*
   * Toda partida nueva empieza
   * con velocidad ×1 desde nivel 1.
   */
  resetEnemySpeedProgression(
    1
  );


  await loadLevel(
    1,
    {
      preserveLives: false,
      preserveRollerUpgrade: false,
      waitForStart: true
    }
  );


  requestAnimationFrame(
    frame
  );
}


initializeGame();
