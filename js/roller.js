"use strict";

import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  CELL_SIZE
} from "./config.js";

import {
  gameState,
  getRollerPaintWidth
} from "./state.js";

import {
  isInsideBoard,
  paintCell
} from "./board.js";


const DEFAULT_DIRECTION = Object.freeze({
  dx: 0,
  dy: -1
});


const ROLLER_COLORS = Object.freeze({
  roller: "#ffd538",
  rollerLight: "#fff29a",
  rollerShadow: "#e6a900",
  rollerBorder: "#3a2a00",

  metal: "#eef3f8",
  metalShadow: "#8b98a8",

  handle: "#39e58c",
  handleLight: "#8affbd",
  handleDark: "#137447"
});


/* =========================================================
   POSICIÓN / CREACIÓN
   ========================================================= */

export function getInitialRollerPosition() {

  return {
    x:
      Math.floor(
        BOARD_COLUMNS / 2
      ),

    y:
      BOARD_ROWS - 2
  };
}


export function createRoller() {

  const position =
    getInitialRollerPosition();


  return {

    x: position.x,
    y: position.y,

    direction: {
      ...DEFAULT_DIRECTION
    }
  };
}


export function resetRoller() {

  gameState.player =
    createRoller();


  return paintWithRoller(
    gameState.player.x,
    gameState.player.y,
    gameState.player.direction
  );
}


export function getRoller() {

  return (
    gameState.player ??
    null
  );
}


/* =========================================================
   DIRECCIÓN
   ========================================================= */

function isValidDirection(
  direction
) {

  if (!direction) {
    return false;
  }


  const {
    dx,
    dy
  } = direction;


  if (
    !Number.isInteger(dx) ||
    !Number.isInteger(dy)
  ) {
    return false;
  }


  const horizontalMovement =
    Math.abs(dx) === 1 &&
    dy === 0;


  const verticalMovement =
    Math.abs(dy) === 1 &&
    dx === 0;


  return (
    horizontalMovement ||
    verticalMovement
  );
}


/* =========================================================
   PINTURA DEL RODILLO
   ========================================================= */

function getPaintOffsets(
  width
) {

  const safeWidth =
    Math.max(
      1,
      Math.floor(width)
    );


  const start =
    -Math.floor(
      (safeWidth - 1) / 2
    );


  const offsets = [];


  for (
    let index = 0;
    index < safeWidth;
    index += 1
  ) {

    offsets.push(
      start + index
    );
  }


  return offsets;
}


/**
 * Pinta utilizando la anchura actual
 * del rodillo.
 *
 * La pintura se extiende
 * perpendicularmente al movimiento.
 */
function paintWithRoller(
  centerX,
  centerY,
  direction
) {

  const width =
    getRollerPaintWidth();


  const offsets =
    getPaintOffsets(
      width
    );


  let paintedCells = 0;

  let targetReached = false;

  let percent =
    gameState.paintedPercent ?? 0;


  const verticalMovement =
    direction.dy !== 0;


  for (
    const offset
    of offsets
  ) {

    const paintX =
      verticalMovement
        ? centerX + offset
        : centerX;


    const paintY =
      verticalMovement
        ? centerY
        : centerY + offset;


    if (
      !isInsideBoard(
        paintX,
        paintY
      )
    ) {
      continue;
    }


    const result =
      paintCell(
        paintX,
        paintY
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

    painted:
      paintedCells > 0,

    paintedCells,

    targetReached,

    percent
  };
}


/* =========================================================
   MOVIMIENTO
   ========================================================= */

export function moveRoller(
  direction
) {

  const player =
    getRoller();


  if (
    !player ||
    !isValidDirection(
      direction
    )
  ) {

    return {

      moved: false,

      painted: false,

      paintedCells: 0,

      targetReached: false,

      percent:
        gameState.paintedPercent ??
        0
    };
  }


  const nextX =
    player.x +
    direction.dx;


  const nextY =
    player.y +
    direction.dy;


  if (
    !isInsideBoard(
      nextX,
      nextY
    )
  ) {

    return {

      moved: false,

      painted: false,

      paintedCells: 0,

      targetReached: false,

      percent:
        gameState.paintedPercent ??
        0
    };
  }


  player.x =
    nextX;

  player.y =
    nextY;


  player.direction = {

    dx:
      direction.dx,

    dy:
      direction.dy
  };


  const paintResult =
    paintWithRoller(
      nextX,
      nextY,
      direction
    );


  return {

    moved: true,

    ...paintResult
  };
}


/* =========================================================
   RESPAWN
   ========================================================= */

export function respawnRoller() {

  const player =
    getRoller();


  const position =
    getInitialRollerPosition();


  if (!player) {

    gameState.player =
      createRoller();

  } else {

    player.x =
      position.x;

    player.y =
      position.y;

    player.direction = {
      ...DEFAULT_DIRECTION
    };
  }


  return paintWithRoller(
    gameState.player.x,
    gameState.player.y,
    gameState.player.direction
  );
}


/* =========================================================
   CENTRO / COLISIONES
   ========================================================= */

export function getRollerCenter() {

  const player =
    getRoller();


  if (!player) {
    return null;
  }


  return {

    x:
      player.x + 0.5,

    y:
      player.y + 0.5
  };
}


/* =========================================================
   INVULNERABILIDAD
   ========================================================= */

function shouldHideDuringInvulnerability(
  invulnerabilityTime
) {

  return (
    invulnerabilityTime > 0 &&
    Math.floor(
      invulnerabilityTime * 10
    ) % 2 === 0
  );
}


/* =========================================================
   RENDER DEL RODILLO
   ========================================================= */

export function renderRoller(
  context,
  invulnerabilityTime = 0
) {

  if (!context) {

    throw new TypeError(
      "renderRoller necesita un contexto 2D válido."
    );
  }


  const player =
    getRoller();


  if (!player) {
    return;
  }


  if (
    shouldHideDuringInvulnerability(
      invulnerabilityTime
    )
  ) {
    return;
  }


  const centerX =
    player.x *
    CELL_SIZE +
    CELL_SIZE / 2;


  const centerY =
    player.y *
    CELL_SIZE +
    CELL_SIZE / 2;


  const angle =
    Math.atan2(
      player.direction.dy,
      player.direction.dx
    ) +
    Math.PI / 2;


  context.save();


  context.translate(
    centerX,
    centerY
  );


  /*
   * Tamaño visual ×2.
   *
   * No afecta a:
   * - colisión
   * - movimiento
   * - pintura
   */
  context.scale(
    2,
    2
  );


  context.rotate(
    angle
  );


  drawRollerCylinder(
    context
  );

  drawRollerSupport(
    context
  );

  drawRollerHandle(
    context
  );


  context.restore();
}


/* =========================================================
   CILINDRO DEL RODILLO
   ========================================================= */

function drawRollerCylinder(
  context
) {

  /*
   * El cilindro sigue aumentando
   * de anchura con las mejoras.
   */
  const paintWidth =
    getRollerPaintWidth();


  const visualWidth =
    CELL_SIZE *
    0.7 *
    paintWidth;


  const rollerHeight = 9;

  const x =
    -visualWidth / 2;

  const y = -10;


  /*
   * Sombra inferior.
   */
  context.beginPath();

  context.roundRect(
    x,
    y,
    visualWidth,
    rollerHeight,
    4
  );

  context.fillStyle =
    ROLLER_COLORS
      .rollerShadow;

  context.fill();


  /*
   * Cuerpo principal.
   */
  context.beginPath();

  context.roundRect(
    x,
    y - 1,
    visualWidth,
    rollerHeight - 2,
    4
  );

  context.fillStyle =
    ROLLER_COLORS.roller;

  context.fill();


  /*
   * Borde.
   */
  context.strokeStyle =
    ROLLER_COLORS
      .rollerBorder;

  context.lineWidth = 1.5;

  context.stroke();


  /*
   * Brillo superior.
   */
  context.beginPath();

  context.moveTo(
    x + 4,
    y + 1
  );

  context.lineTo(
    x +
      visualWidth -
      4,
    y + 1
  );

  context.strokeStyle =
    ROLLER_COLORS
      .rollerLight;

  context.lineWidth = 1.5;

  context.lineCap =
    "round";

  context.stroke();


  /*
   * Tapones laterales.
   */
  context.beginPath();

  context.arc(
    x + 2,
    y + rollerHeight / 2,
    2,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    ROLLER_COLORS
      .rollerBorder;

  context.fill();


  context.beginPath();

  context.arc(
    x +
      visualWidth -
      2,
    y + rollerHeight / 2,
    2,
    0,
    Math.PI * 2
  );

  context.fill();
}


/* =========================================================
   SOPORTE METÁLICO
   ========================================================= */

function drawRollerSupport(
  context
) {

  /*
   * Sombra del soporte.
   */
  context.beginPath();

  context.moveTo(
    0,
    -1
  );

  context.lineTo(
    0,
    5
  );

  context.quadraticCurveTo(
    0,
    8,
    4,
    8
  );

  context.lineTo(
    6,
    8
  );


  context.strokeStyle =
    ROLLER_COLORS
      .metalShadow;

  context.lineWidth = 4;

  context.lineCap =
    "round";

  context.lineJoin =
    "round";

  context.stroke();


  /*
   * Parte metálica clara.
   */
  context.beginPath();

  context.moveTo(
    0,
    -1
  );

  context.lineTo(
    0,
    5
  );

  context.quadraticCurveTo(
    0,
    7,
    4,
    7
  );

  context.lineTo(
    6,
    7
  );


  context.strokeStyle =
    ROLLER_COLORS.metal;

  context.lineWidth = 2;

  context.lineCap =
    "round";

  context.lineJoin =
    "round";

  context.stroke();
}


/* =========================================================
   MANGO
   ========================================================= */

function drawRollerHandle(
  context
) {

  /*
   * Unión entre soporte y mango.
   */
  context.beginPath();

  context.arc(
    6,
    7,
    2.4,
    0,
    Math.PI * 2
  );

  context.fillStyle =
    ROLLER_COLORS
      .rollerBorder;

  context.fill();


  /*
   * Mango exterior.
   */
  context.beginPath();

  context.roundRect(
    3.5,
    7,
    5,
    10,
    2.5
  );

  context.fillStyle =
    ROLLER_COLORS
      .handleDark;

  context.fill();


  /*
   * Mango verde.
   */
  context.beginPath();

  context.roundRect(
    4.3,
    7.5,
    3.4,
    9,
    1.7
  );

  context.fillStyle =
    ROLLER_COLORS.handle;

  context.fill();


  /*
   * Brillo del mango.
   */
  context.beginPath();

  context.moveTo(
    5.2,
    9
  );

  context.lineTo(
    5.2,
    14
  );

  context.strokeStyle =
    ROLLER_COLORS
      .handleLight;

  context.lineWidth = 0.8;

  context.lineCap =
    "round";

  context.stroke();
}