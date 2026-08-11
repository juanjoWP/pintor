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
  isGameRunning,
  isPlayerInvulnerable,
  removeLives,
  removeTime,
  resetRollerPaintWidth,
  resetStateForLevel,
  setEnemyFreeze,
  setGameStatus,
  setInvulnerability,
  updateEnemyFreeze,
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
  BUTTON_MODES,
  hideMessage,
  initializeHud,
  setButtonMode,
  setMainButtonHandler,
  showDefeat,
  showGameCompleted,
  showLevelCompleted,
  updateHud
} from "./hud.js";

import {
  renderFrame
} from "./renderer.js";


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


const messageElement =
  document.getElementById("message");

const pauseButton =
  document.getElementById("pause");

const muteButton =
  document.getElementById("mute");


/* =========================================================
   ESTADO LOCAL
   ========================================================= */

/*
 * Estas variables no pertenecen al estado
 * del nivel.
 *
 * Solo controlan interfaz:
 *
 * - pantalla inicial
 * - pausa
 */
let waitingToStart = false;
let paused = false;


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
   BOTÓN DE SONIDO
   ========================================================= */

function refreshMuteButton() {

  if (!muteButton) {
    return;
  }


  if (
    isMuted()
  ) {

    muteButton.textContent =
      "🔇 Silenciado";

  } else {

    muteButton.textContent =
      "🔊 Sonido";
  }
}


function toggleSound() {

  toggleMuted();

  refreshMuteButton();
}


/* =========================================================
   BOTÓN DE PAUSA
   ========================================================= */

function refreshPauseButton() {

  if (!pauseButton) {
    return;
  }


  if (
    waitingToStart
  ) {

    pauseButton.textContent =
      "⏸ Pausa";

    pauseButton.disabled = true;

    return;
  }


  if (
    !isGameRunning()
  ) {

    pauseButton.textContent =
      "⏸ Pausa";

    pauseButton.disabled = true;

    return;
  }


  pauseButton.disabled = false;


  if (
    paused
  ) {

    pauseButton.textContent =
      "▶ Continuar";

  } else {

    pauseButton.textContent =
      "⏸ Pausa";
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
      <div>⏸ PAUSA</div>
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


  /*
   * Muy importante:
   *
   * evita que el tiempo que hemos estado
   * pausados se convierta en un deltaTime
   * gigante al continuar.
   */
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
   PANTALLA INICIAL
   ========================================================= */

function showStartScreen() {

  waitingToStart = true;
  paused = false;


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
if (messageElement) {
  messageElement.classList.remove(
    "level-completed"
  );
}

  hideMessage();


  clearInput();
  enableInput();


  gameState.lastFrameTime =
    performance.now();


  /*
   * Empezamos desde exactamente
   * 120 segundos.
   */
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


  waitingToStart = false;
  paused = false;


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


  createEnemies(
    level.enemies
  );


  createPrizes(
    level.prizes
  );


  /* -------------------------
     Fondo
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
     Preparar nivel
     ------------------------- */

  gameState.lastFrameTime =
    performance.now();


  gameState.timerAccumulator = 0;
  gameState.moveAccumulator = 0;


  clearInput();


  setButtonMode(
    BUTTON_MODES.RESTART
  );


  refreshHud();


  if (
    initialPaint.targetReached
  ) {

    finishLevel();

    return true;
  }


  /*
   * Solo la partida nueva espera
   * al botón Empezar.
   *
   * Los siguientes niveles arrancan
   * directamente.
   */
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


  /*
   * La ampliación del rodillo
   * desaparece al perder una vida.
   */
  resetRollerPaintWidth();


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


  playPrizeSound();


  const effect =
    result.effect;


  /* VIDA */

  if (
    effect.extraLives > 0
  ) {

    addLives(
      effect.extraLives
    );
  }


  /* TIEMPO */

  if (
    effect.extraTime > 0
  ) {

    addTime(
      effect.extraTime
    );
  }


  /* INVULNERABILIDAD */

  if (
    effect.invulnerabilityTime > 0
  ) {

    setInvulnerability(
      effect.invulnerabilityTime
    );
  }


  /* CONGELACIÓN */

  if (
    effect.freezeEnemiesTime > 0
  ) {

    setEnemyFreeze(
      effect.freezeEnemiesTime
    );
  }


  /* AMPLIACIÓN */

  if (
    effect.rollerUpgrade > 0
  ) {

    upgradeRollerPaintWidth(
      effect.rollerUpgrade
    );
  }


  /* EXPLOSIÓN */

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

  /*
   * Ni la pantalla inicial ni la pausa
   * permiten avanzar el juego.
   */
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
   FIN DE NIVEL
   ========================================================= */

function finishLevel() {

  playLevelSound();


  paused = false;


  disableInput();
if (messageElement) {
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
      GAME_STATUS.WON,
      BUTTON_MODES.NEXT_LEVEL
    );


    setButtonMode(
      BUTTON_MODES.NEXT_LEVEL
    );


    showLevelCompleted(
      gameState.targetPercent
    );


    refreshPauseButton();


    return;
  }


  setGameStatus(
    GAME_STATUS.COMPLETED,
    BUTTON_MODES.RESTART_GAME
  );


  setButtonMode(
    BUTTON_MODES.RESTART_GAME
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


  disableInput();


  /*
   * Al perder, Reiniciar partida
   * vuelve SIEMPRE al nivel 1.
   */
  setGameStatus(
    GAME_STATUS.LOST,
    BUTTON_MODES.RESTART_GAME
  );


  setButtonMode(
    BUTTON_MODES.RESTART_GAME
  );


  showDefeat(
    reason
  );


  refreshPauseButton();
}


/* =========================================================
   BOTÓN PRINCIPAL
   ========================================================= */

async function handleMainButton(
  mode
) {

  /*
   * SIGUIENTE NIVEL
   *
   * Conservamos vidas y ampliación.
   *
   * Arranca directamente.
   */
  if (
    mode ===
    BUTTON_MODES.NEXT_LEVEL
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


  /*
   * CUALQUIER REINICIO:
   *
   * Siempre vuelve al NIVEL 1.
   *
   * Además vuelve a mostrar
   * la pantalla ▶ Empezar.
   */
  await loadLevel(
    1,
    {
      preserveLives: false,
      preserveRollerUpgrade: false,
      waitForStart: true
    }
  );
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


  setMainButtonHandler(
    handleMainButton
  );


  /*
   * Botón PAUSA.
   */
  if (
    pauseButton
  ) {

    pauseButton.addEventListener(
      "click",
      togglePause
    );
  }


  /*
   * Botón SONIDO.
   */
  if (
    muteButton
  ) {

    muteButton.addEventListener(
      "click",
      toggleSound
    );
  }


  refreshMuteButton();


  /*
   * Nueva partida:
   *
   * carga nivel 1 pero NO comienza
   * hasta pulsar ▶ Empezar.
   */
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