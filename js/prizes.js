"use strict";

import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  CELL_SIZE
} from "./config.js";

import { gameState } from "./state.js";

import {
  isInsideBoard,
  paintCell
} from "./board.js";


/* =========================================================
   TIPOS DE PREMIOS
   ========================================================= */

const PRIZE_TYPES = Object.freeze({

  EXTRA_LIFE:
    "extraLife",

  EXTRA_TIME:
    "extraTime",

  INVULNERABILITY:
    "invulnerability",

  FREEZE_ENEMIES:
    "freezeEnemies",

  /*
   * NUEVO:
   *
   * Ralentiza temporalmente
   * a todos los enemigos.
   */
  SLOW_ENEMIES:
    "slowEnemies",

  PAINT_EXPLOSION:
    "paintExplosion",

  ROLLER_UPGRADE:
    "rollerUpgrade"
});


/* =========================================================
   VALORES GENERALES
   ========================================================= */

const PRIZE_DEFAULTS = Object.freeze({

  type:
    PRIZE_TYPES.EXTRA_TIME,

  x:
    Math.floor(
      BOARD_COLUMNS / 2
    ),

  y:
    Math.floor(
      BOARD_ROWS / 2
    ),

  value: 1,

  radius: 0.34
});


const VALID_PRIZE_TYPES =
  Object.freeze(
    Object.values(
      PRIZE_TYPES
    )
  );


/*
 * Tamaño visual de los iconos.
 *
 * Los premios se dibujan aproximadamente
 * a 1,5 casillas de tamaño.
 */
const PRIZE_VISUAL_SIZE =
  CELL_SIZE * 1.5;


/* =========================================================
   UTILIDADES
   ========================================================= */

function toFiniteNumber(
  value,
  fallback
) {

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : fallback;
}


function clamp(
  value,
  minimum,
  maximum
) {

  return Math.min(
    maximum,
    Math.max(
      minimum,
      value
    )
  );
}


export function isValidPrizeType(
  type
) {

  return VALID_PRIZE_TYPES.includes(
    type
  );
}


/* =========================================================
   NORMALIZACIÓN
   ========================================================= */

function normalizePrizeConfiguration(
  configuration = {}
) {

  const requestedType =
    typeof configuration.type ===
    "string"
      ? configuration.type
      : PRIZE_DEFAULTS.type;


  const type =
    isValidPrizeType(
      requestedType
    )
      ? requestedType
      : PRIZE_DEFAULTS.type;


  return {

    type,

    x: clamp(
      Math.floor(
        toFiniteNumber(
          configuration.x,
          PRIZE_DEFAULTS.x
        )
      ),
      0,
      BOARD_COLUMNS - 1
    ),

    y: clamp(
      Math.floor(
        toFiniteNumber(
          configuration.y,
          PRIZE_DEFAULTS.y
        )
      ),
      0,
      BOARD_ROWS - 1
    ),

    value: Math.max(
      0,
      toFiniteNumber(
        configuration.value,
        PRIZE_DEFAULTS.value
      )
    ),

    radius: clamp(
      toFiniteNumber(
        configuration.radius,
        PRIZE_DEFAULTS.radius
      ),
      0.1,
      0.49
    ),

    collected: false
  };
}


/* =========================================================
   CREACIÓN
   ========================================================= */

export function createPrize(
  configuration = {}
) {

  return normalizePrizeConfiguration(
    configuration
  );
}


function isPrizePositionOccupied(
  x,
  y,
  prizes
) {

  return prizes.some(
    (prize) =>
      !prize.collected &&
      prize.x === x &&
      prize.y === y
  );
}


function findValidPrizePosition(
  prize,
  existingPrizes
) {

  if (
    isInsideBoard(
      prize.x,
      prize.y
    ) &&
    !isPrizePositionOccupied(
      prize.x,
      prize.y,
      existingPrizes
    )
  ) {

    return {
      x: prize.x,
      y: prize.y
    };
  }


  for (
    let y = 0;
    y < BOARD_ROWS;
    y += 1
  ) {

    for (
      let x = 0;
      x < BOARD_COLUMNS;
      x += 1
    ) {

      if (
        !isPrizePositionOccupied(
          x,
          y,
          existingPrizes
        )
      ) {

        return {
          x,
          y
        };
      }
    }
  }


  return null;
}


export function createPrizes(
  configurations = []
) {

  const safeConfigurations =
    Array.isArray(
      configurations
    )
      ? configurations
      : [];


  const createdPrizes = [];


  for (
    const configuration
    of safeConfigurations
  ) {

    const prize =
      createPrize(
        configuration
      );


    const validPosition =
      findValidPrizePosition(
        prize,
        createdPrizes
      );


    if (!validPosition) {
      continue;
    }


    prize.x =
      validPosition.x;

    prize.y =
      validPosition.y;


    createdPrizes.push(
      prize
    );
  }


  gameState.prizes =
    createdPrizes;


  return gameState.prizes;
}


export function getPrizes() {

  if (
    !Array.isArray(
      gameState.prizes
    )
  ) {

    gameState.prizes = [];
  }


  return gameState.prizes;
}


export function clearPrizes() {

  gameState.prizes = [];
}


/* =========================================================
   COLISIÓN CON RODILLO
   ========================================================= */

export function prizeTouchesPlayer(
  prize,
  playerCenter,
  playerRadius = 0.42
) {

  if (
    !prize ||
    prize.collected ||
    !playerCenter ||
    !Number.isFinite(
      playerCenter.x
    ) ||
    !Number.isFinite(
      playerCenter.y
    )
  ) {

    return false;
  }


  const prizeCenterX =
    prize.x + 0.5;

  const prizeCenterY =
    prize.y + 0.5;


  const distanceX =
    prizeCenterX -
    playerCenter.x;

  const distanceY =
    prizeCenterY -
    playerCenter.y;


  return (
    Math.hypot(
      distanceX,
      distanceY
    ) <
    prize.radius +
    Math.max(
      0,
      playerRadius
    )
  );
}


/* =========================================================
   EXPLOSIÓN DE PINTURA
   ========================================================= */

const PAINT_EXPLOSION_CELLS =
  20;


function getExplosionPositions(
  centerX,
  centerY
) {

  const positions = [];


  for (
    let y = 0;
    y < BOARD_ROWS;
    y += 1
  ) {

    for (
      let x = 0;
      x < BOARD_COLUMNS;
      x += 1
    ) {

      const dx =
        x - centerX;

      const dy =
        y - centerY;


      positions.push({

        x,
        y,

        distance:
          Math.hypot(
            dx,
            dy
          )
      });
    }
  }


  positions.sort(
    (a, b) =>
      a.distance -
      b.distance
  );


  return positions;
}


export function applyPaintExplosion(
  centerX,
  centerY
) {

  let paintedCells = 0;

  let targetReached = false;

  let percent =
    gameState.paintedPercent ?? 0;


  const positions =
    getExplosionPositions(
      centerX,
      centerY
    );


  for (
    const position
    of positions
  ) {

    if (
      paintedCells >=
      PAINT_EXPLOSION_CELLS
    ) {
      break;
    }


    const result =
      paintCell(
        position.x,
        position.y
      );


    if (
      result.painted
    ) {

      paintedCells += 1;
    }


    if (
      result.targetReached
    ) {

      targetReached = true;
    }


    percent =
      result.percent;
  }


  return {

    paintedCells,

    targetReached,

    percent
  };
}


/* =========================================================
   EFECTOS
   ========================================================= */

function createPrizeEffect(
  prize,
  playerCell
) {

  const baseEffect = {

    type:
      prize.type,

    value:
      prize.value,

    extraLives: 0,

    extraTime: 0,

    invulnerabilityTime: 0,

    freezeEnemiesTime: 0,

    /*
     * NUEVO:
     * duración de la ralentización.
     */
    slowEnemiesTime: 0,

    rollerUpgrade: 0,

    paintResult: null
  };


  switch (
    prize.type
  ) {

    case PRIZE_TYPES.EXTRA_LIFE:

      return {

        ...baseEffect,

        extraLives: 1
      };


    case PRIZE_TYPES.EXTRA_TIME:

      return {

        ...baseEffect,

        extraTime: 15
      };


    case PRIZE_TYPES.INVULNERABILITY:

      return {

        ...baseEffect,

        invulnerabilityTime: 10
      };


    case PRIZE_TYPES.FREEZE_ENEMIES:

      return {

        ...baseEffect,

        freezeEnemiesTime: 10
      };


    /* -------------------------
       CARACOL
       ------------------------- */

    case PRIZE_TYPES.SLOW_ENEMIES:

      return {

        ...baseEffect,

        slowEnemiesTime: 10
      };


    case PRIZE_TYPES.PAINT_EXPLOSION:

      return {

        ...baseEffect,

        paintResult:
          applyPaintExplosion(
            playerCell.x,
            playerCell.y
          )
      };


    case PRIZE_TYPES.ROLLER_UPGRADE:

      return {

        ...baseEffect,

        rollerUpgrade: 1
      };


    default:

      return baseEffect;
  }
}


/* =========================================================
   RECOGIDA
   ========================================================= */

export function collectPrizeAtPlayer(
  playerCenter,
  playerRadius = 0.42
) {

  const prizes =
    getPrizes();


  for (
    const prize
    of prizes
  ) {

    if (
      !prizeTouchesPlayer(
        prize,
        playerCenter,
        playerRadius
      )
    ) {

      continue;
    }


    prize.collected = true;


    const playerCell = {

      x:
        Math.floor(
          playerCenter.x
        ),

      y:
        Math.floor(
          playerCenter.y
        )
    };


    const effect =
      createPrizeEffect(
        prize,
        playerCell
      );


    removeCollectedPrizes();


    return {

      collected: true,

      prize: {
        ...prize
      },

      effect
    };
  }


  return {

    collected: false,

    prize: null,

    effect: null
  };
}


export function removeCollectedPrizes() {

  gameState.prizes =
    getPrizes().filter(
      (prize) =>
        !prize.collected
    );
}


/* =========================================================
   UTILIDADES DE DIBUJO
   ========================================================= */

function getPrizeCenter(
  prize
) {

  return {

    x:
      (
        prize.x + 0.5
      ) *
      CELL_SIZE,

    y:
      (
        prize.y + 0.5
      ) *
      CELL_SIZE
  };
}


/*
 * Aplicamos una sombra/borde oscuro
 * para que los iconos se distingan
 * sobre zonas claras y oscuras.
 */
function preparePrizeDrawing(
  context
) {

  context.lineJoin =
    "round";

  context.lineCap =
    "round";

  context.shadowColor =
    "rgba(0,0,0,0.75)";

  context.shadowBlur = 4;

  context.shadowOffsetX = 2;

  context.shadowOffsetY = 2;
}


/* =========================================================
   CORAZÓN
   ========================================================= */

function drawHeart(
  context,
  x,
  y,
  size
) {

  const scale =
    size / 40;


  context.save();

  context.translate(
    x,
    y
  );

  context.scale(
    scale,
    scale
  );


  context.beginPath();

  context.moveTo(
    0,
    14
  );

  context.bezierCurveTo(
    -22,
    0,
    -18,
    -18,
    -7,
    -18
  );

  context.bezierCurveTo(
    0,
    -18,
    0,
    -10,
    0,
    -8
  );

  context.bezierCurveTo(
    0,
    -10,
    0,
    -18,
    7,
    -18
  );

  context.bezierCurveTo(
    18,
    -18,
    22,
    0,
    0,
    14
  );


  context.fillStyle =
    "#ff355c";

  context.strokeStyle =
    "#ffffff";

  context.lineWidth = 3;


  context.fill();

  context.stroke();


  context.restore();
}


/* =========================================================
   RELOJ
   ========================================================= */

function drawClock(
  context,
  x,
  y,
  size
) {

  const radius =
    size * 0.38;


  context.save();


  context.fillStyle =
    "#ffd43b";

  context.strokeStyle =
    "#ffffff";

  context.lineWidth = 3;


  context.fillRect(
    x - 5,
    y - radius - 8,
    10,
    7
  );

  context.strokeRect(
    x - 5,
    y - radius - 8,
    10,
    7
  );


  context.beginPath();

  context.arc(
    x,
    y,
    radius,
    0,
    Math.PI * 2
  );


  context.fillStyle =
    "#ffd43b";

  context.fill();

  context.stroke();


  context.beginPath();

  context.arc(
    x,
    y,
    radius * 0.72,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#fff9db";

  context.fill();


  context.beginPath();

  context.moveTo(
    x,
    y
  );

  context.lineTo(
    x,
    y - radius * 0.48
  );

  context.lineTo(
    x + radius * 0.38,
    y
  );

  context.strokeStyle =
    "#222222";

  context.lineWidth = 3;

  context.stroke();


  context.restore();
}


/* =========================================================
   ESCUDO
   ========================================================= */

function drawShield(
  context,
  x,
  y,
  size
) {

  const half =
    size * 0.38;


  context.save();


  context.beginPath();

  context.moveTo(
    x,
    y - half
  );

  context.lineTo(
    x + half,
    y - half * 0.55
  );

  context.lineTo(
    x + half * 0.75,
    y + half * 0.45
  );

  context.quadraticCurveTo(
    x,
    y + half * 1.25,
    x,
    y + half * 1.25
  );

  context.quadraticCurveTo(
    x - half,
    y + half * 0.45,
    x - half * 0.75,
    y + half * 0.45
  );

  context.lineTo(
    x - half,
    y - half * 0.55
  );

  context.closePath();


  context.fillStyle =
    "#46df72";

  context.strokeStyle =
    "#ffffff";

  context.lineWidth = 3;


  context.fill();

  context.stroke();


  context.beginPath();

  context.moveTo(
    x,
    y - half * 0.7
  );

  context.lineTo(
    x,
    y + half * 0.7
  );

  context.strokeStyle =
    "rgba(255,255,255,0.6)";

  context.lineWidth = 2;

  context.stroke();


  context.restore();
}


/* =========================================================
   COPO DE NIEVE
   ========================================================= */

function drawSnowflake(
  context,
  x,
  y,
  size
) {

  const radius =
    size * 0.42;


  context.save();


  context.strokeStyle =
    "#73ddff";

  context.lineWidth = 5;


  for (
    let angleIndex = 0;
    angleIndex < 3;
    angleIndex += 1
  ) {

    const angle =
      angleIndex *
      Math.PI / 3;


    const dx =
      Math.cos(angle) *
      radius;

    const dy =
      Math.sin(angle) *
      radius;


    context.beginPath();

    context.moveTo(
      x - dx,
      y - dy
    );

    context.lineTo(
      x + dx,
      y + dy
    );

    context.stroke();
  }


  context.beginPath();

  context.arc(
    x,
    y,
    4,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#ffffff";

  context.fill();


  context.restore();
}


/* =========================================================
   CARACOL - RALENTIZACIÓN
   ========================================================= */

function drawSnail(
  context,
  x,
  y,
  size
) {

  const scale =
    size / 60;


  context.save();


  context.translate(
    x,
    y
  );


  context.scale(
    scale,
    scale
  );


  /*
   * CUERPO.
   */
  context.beginPath();

  context.ellipse(
    5,
    12,
    25,
    9,
    0,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#89d65c";

  context.strokeStyle =
    "#ffffff";

  context.lineWidth = 3;

  context.fill();

  context.stroke();


  /*
   * CABEZA.
   */
  context.beginPath();

  context.arc(
    24,
    5,
    10,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#9ee66c";

  context.fill();

  context.stroke();


  /*
   * CONCHA.
   */
  context.beginPath();

  context.arc(
    -6,
    0,
    18,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#d68b3d";

  context.strokeStyle =
    "#ffffff";

  context.lineWidth = 3;

  context.fill();

  context.stroke();


  /*
   * ESPIRAL DE LA CONCHA.
   */
  context.beginPath();

  context.arc(
    -6,
    0,
    10,
    0,
    Math.PI * 1.7
  );

  context.strokeStyle =
    "#774315";

  context.lineWidth = 3;

  context.stroke();


  /*
   * ANTENAS.
   */
  context.beginPath();

  context.moveTo(
    20,
    -2
  );

  context.lineTo(
    17,
    -18
  );

  context.moveTo(
    27,
    -2
  );

  context.lineTo(
    32,
    -18
  );

  context.strokeStyle =
    "#9ee66c";

  context.lineWidth = 3;

  context.stroke();


  /*
   * BOLITAS DE LAS ANTENAS.
   */
  context.beginPath();

  context.arc(
    17,
    -18,
    3,
    0,
    Math.PI * 2
  );

  context.arc(
    32,
    -18,
    3,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#ffffff";

  context.fill();


  /*
   * OJOS.
   */
  context.beginPath();

  context.arc(
    22,
    3,
    1.8,
    0,
    Math.PI * 2
  );

  context.arc(
    28,
    3,
    1.8,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#111111";

  context.fill();


  /*
   * SONRISA.
   *
   * El tío todavía no sabe que
   * tendrá que ralentizar cinco bolas.
   */
  context.beginPath();

  context.arc(
    25,
    6,
    4,
    0.1,
    Math.PI - 0.1
  );

  context.strokeStyle =
    "#244510";

  context.lineWidth = 1.8;

  context.stroke();


  context.restore();
}


/* =========================================================
   EXPLOSIÓN DE PINTURA
   ========================================================= */

function drawPaintExplosion(
  context,
  x,
  y,
  size
) {

  const points = 12;

  const outerRadius =
    size * 0.48;

  const innerRadius =
    size * 0.25;


  context.save();


  context.beginPath();


  for (
    let index = 0;
    index < points * 2;
    index += 1
  ) {

    const angle =
      (
        Math.PI *
        index
      ) /
      points;


    const radius =
      index % 2 === 0
        ? outerRadius
        : innerRadius;


    const pointX =
      x +
      Math.cos(angle) *
      radius;


    const pointY =
      y +
      Math.sin(angle) *
      radius;


    if (
      index === 0
    ) {

      context.moveTo(
        pointX,
        pointY
      );

    } else {

      context.lineTo(
        pointX,
        pointY
      );
    }
  }


  context.closePath();


  context.fillStyle =
    "#ff8a22";

  context.strokeStyle =
    "#ffffff";

  context.lineWidth = 3;


  context.fill();

  context.stroke();


  context.beginPath();

  context.arc(
    x,
    y,
    size * 0.17,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    "#ffe14d";

  context.fill();


  context.restore();
}


/* =========================================================
   RODILLO DE AMPLIACIÓN
   ========================================================= */

function drawRollerUpgrade(
  context,
  x,
  y,
  size
) {

  const width =
    size * 0.72;

  const height =
    size * 0.22;


  context.save();


  context.fillStyle =
    "#ffd538";

  context.strokeStyle =
    "#ffffff";

  context.lineWidth = 3;


  context.fillRect(
    x - width / 2,
    y - height,
    width,
    height
  );


  context.strokeRect(
    x - width / 2,
    y - height,
    width,
    height
  );


  context.beginPath();

  context.moveTo(
    x + width / 3,
    y
  );

  context.lineTo(
    x + width / 3,
    y + size * 0.22
  );

  context.lineTo(
    x + width * 0.48,
    y + size * 0.22
  );


  context.strokeStyle =
    "#f4f7ff";

  context.lineWidth = 4;

  context.stroke();


  context.beginPath();

  context.moveTo(
    x + width * 0.48,
    y + size * 0.22
  );

  context.lineTo(
    x + width * 0.48,
    y + size * 0.42
  );


  context.strokeStyle =
    "#39e58c";

  context.lineWidth = 7;

  context.stroke();


  context.font =
    `bold ${Math.round(
      size * 0.42
    )}px sans-serif`;

  context.textAlign =
    "center";

  context.textBaseline =
    "middle";

  context.fillStyle =
    "#ffffff";

  context.strokeStyle =
    "#111111";

  context.lineWidth = 4;


  context.strokeText(
    "+",
    x - width * 0.28,
    y + size * 0.13
  );

  context.fillText(
    "+",
    x - width * 0.28,
    y + size * 0.13
  );


  context.restore();
}


/* =========================================================
   RENDER INDIVIDUAL
   ========================================================= */

function renderPrize(
  context,
  prize
) {

  const center =
    getPrizeCenter(
      prize
    );


  const x =
    center.x;

  const y =
    center.y;


  context.save();


  preparePrizeDrawing(
    context
  );


  switch (
    prize.type
  ) {

    case PRIZE_TYPES.EXTRA_LIFE:

      drawHeart(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );

      break;


    case PRIZE_TYPES.EXTRA_TIME:

      drawClock(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );

      break;


    case PRIZE_TYPES.INVULNERABILITY:

      drawShield(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );

      break;


    case PRIZE_TYPES.FREEZE_ENEMIES:

      drawSnowflake(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );

      break;


    /* -------------------------
       CARACOL
       ------------------------- */

    case PRIZE_TYPES.SLOW_ENEMIES:

      drawSnail(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );

      break;


    case PRIZE_TYPES.PAINT_EXPLOSION:

      drawPaintExplosion(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );

      break;


    case PRIZE_TYPES.ROLLER_UPGRADE:

      drawRollerUpgrade(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );

      break;


    default:

      drawClock(
        context,
        x,
        y,
        PRIZE_VISUAL_SIZE
      );
  }


  context.restore();
}


/* =========================================================
   RENDER GENERAL
   ========================================================= */

export function renderPrizes(
  context
) {

  if (!context) {

    throw new TypeError(
      "renderPrizes necesita un contexto 2D válido."
    );
  }


  for (
    const prize
    of getPrizes()
  ) {

    if (
      !prize.collected
    ) {

      renderPrize(
        context,
        prize
      );
    }
  }
}


/* =========================================================
   EXPORTACIONES
   ========================================================= */

export {
  PRIZE_TYPES
};
