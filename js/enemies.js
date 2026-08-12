"use strict";

import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  CELL_SIZE
} from "./config.js";

import {
  areEnemiesFrozen,
  gameState
} from "./state.js";


/* =========================================================
   CONFIGURACIÓN
   ========================================================= */

const DEFAULT_ENEMY = Object.freeze({
  type: "basic",
  x: BOARD_COLUMNS / 2,
  y: BOARD_ROWS / 2,
  vx: 3,
  vy: 3,
  radius: 0.38
});


const ENEMY_STYLES = Object.freeze({

  basic: Object.freeze({
    fill: "#ff365f",
    border: "#ffffff",
    detail: "#ffffff"
  }),

  fast: Object.freeze({
    fill: "#ff8a2b",
    border: "#ffffff",
    detail: "#fff3b0"
  }),

  heavy: Object.freeze({
    fill: "#8b5cf6",
    border: "#ffffff",
    detail: "#e9d5ff"
  })
});


/*
 * Aspecto utilizado mientras
 * está activa la congelación.
 */
const FROZEN_STYLE = Object.freeze({
  fill: "#75dfff",
  border: "#ffffff",
  detail: "#e9fbff"
});


/*
 * Durante los últimos 3 segundos
 * los enemigos parpadean para avisar
 * de que van a volver a moverse.
 */
const FREEZE_WARNING_TIME = 3;


/* =========================================================
   UTILIDADES
   ========================================================= */

function toFiniteNumber(
  value,
  fallback
) {

  return Number.isFinite(
    Number(value)
  )
    ? Number(value)
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


/* =========================================================
   CREACIÓN
   ========================================================= */

function normalizeEnemyConfiguration(
  configuration = {}
) {

  const radius =
    clamp(
      toFiniteNumber(
        configuration.radius,
        DEFAULT_ENEMY.radius
      ),
      0.1,
      2
    );


  const maximumX =
    Math.max(
      radius,
      BOARD_COLUMNS - radius
    );


  const maximumY =
    Math.max(
      radius,
      BOARD_ROWS - radius
    );


  return {

    type:
      typeof configuration.type ===
      "string"
        ? configuration.type
        : DEFAULT_ENEMY.type,

    x:
      clamp(
        toFiniteNumber(
          configuration.x,
          DEFAULT_ENEMY.x
        ),
        radius,
        maximumX
      ),

    y:
      clamp(
        toFiniteNumber(
          configuration.y,
          DEFAULT_ENEMY.y
        ),
        radius,
        maximumY
      ),

    vx:
      toFiniteNumber(
        configuration.vx,
        DEFAULT_ENEMY.vx
      ),

    vy:
      toFiniteNumber(
        configuration.vy,
        DEFAULT_ENEMY.vy
      ),

    radius
  };
}


export function createEnemy(
  configuration = {}
) {

  return normalizeEnemyConfiguration(
    configuration
  );
}


export function createEnemies(
  configurations = []
) {

  const validConfigurations =
    Array.isArray(
      configurations
    )
      ? configurations
      : [];


  gameState.enemies =
    validConfigurations.map(
      createEnemy
    );


  return gameState.enemies;
}


/*
 * Se conserva por compatibilidad.
 */
export function createInitialEnemies() {

  return createEnemies([
    {
      type: "basic",
      x: 8.5,
      y: 6.5,
      vx: 5.2,
      vy: 3.7,
      radius: 0.38
    },

    {
      type: "basic",
      x: 30.5,
      y: 18.5,
      vx: -4.3,
      vy: 4.8,
      radius: 0.38
    },

    {
      type: "basic",
      x: 19.5,
      y: 11.5,
      vx: 3.8,
      vy: -4.5,
      radius: 0.38
    }
  ]);
}


/* =========================================================
   LISTA DE ENEMIGOS
   ========================================================= */

export function getEnemies() {

  if (
    !Array.isArray(
      gameState.enemies
    )
  ) {
    gameState.enemies = [];
  }


  return gameState.enemies;
}


export function clearEnemies() {

  gameState.enemies = [];
}


/* =========================================================
   MOVIMIENTO
   ========================================================= */

function moveEnemy(
  enemy,
  deltaTime
) {

  enemy.x +=
    enemy.vx *
    deltaTime;


  enemy.y +=
    enemy.vy *
    deltaTime;
}


/* =========================================================
   REBOTE
   ========================================================= */

function bounceEnemyAgainstBoard(
  enemy
) {

  if (
    enemy.x -
    enemy.radius <
    0
  ) {

    enemy.x =
      enemy.radius;

    enemy.vx =
      Math.abs(
        enemy.vx
      );

  } else if (
    enemy.x +
    enemy.radius >
    BOARD_COLUMNS
  ) {

    enemy.x =
      BOARD_COLUMNS -
      enemy.radius;

    enemy.vx =
      -Math.abs(
        enemy.vx
      );
  }


  if (
    enemy.y -
    enemy.radius <
    0
  ) {

    enemy.y =
      enemy.radius;

    enemy.vy =
      Math.abs(
        enemy.vy
      );

  } else if (
    enemy.y +
    enemy.radius >
    BOARD_ROWS
  ) {

    enemy.y =
      BOARD_ROWS -
      enemy.radius;

    enemy.vy =
      -Math.abs(
        enemy.vy
      );
  }
}


/* =========================================================
   COLISIONES
   ========================================================= */

export function enemyTouchesCircle(
  enemy,
  targetCenter,
  targetRadius
) {

  if (
    !enemy ||
    !targetCenter ||
    !Number.isFinite(
      targetCenter.x
    ) ||
    !Number.isFinite(
      targetCenter.y
    )
  ) {
    return false;
  }


  const safeTargetRadius =
    Number.isFinite(
      targetRadius
    )
      ? Math.max(
          0,
          targetRadius
        )
      : 0;


  const distanceX =
    enemy.x -
    targetCenter.x;


  const distanceY =
    enemy.y -
    targetCenter.y;


  const collisionDistance =
    enemy.radius +
    safeTargetRadius;


  return (
    Math.hypot(
      distanceX,
      distanceY
    ) <
    collisionDistance
  );
}


export function findEnemyCollision(
  targetCenter,
  targetRadius
) {

  for (
    const enemy
    of getEnemies()
  ) {

    if (
      enemyTouchesCircle(
        enemy,
        targetCenter,
        targetRadius
      )
    ) {
      return enemy;
    }
  }


  return null;
}


/* =========================================================
   UPDATE
   ========================================================= */

export function updateEnemies(
  deltaTime,
  options = {}
) {

  const safeDeltaTime =
    Number.isFinite(
      deltaTime
    )
      ? Math.max(
          0,
          deltaTime
        )
      : 0;


  const {
    targetCenter = null,
    targetRadius = 0,
    detectCollisions = true
  } = options;


  /*
   * Mientras están congelados:
   *
   * - no se mueven;
   * - no colisionan;
   * - el parpadeo de los últimos
   *   3 segundos es solamente visual.
   */
  if (
    areEnemiesFrozen()
  ) {

    return {
      collision: false,
      enemy: null
    };
  }


  for (
    const enemy
    of getEnemies()
  ) {

    moveEnemy(
      enemy,
      safeDeltaTime
    );


    bounceEnemyAgainstBoard(
      enemy
    );
  }


  if (
    !detectCollisions ||
    !targetCenter
  ) {

    return {
      collision: false,
      enemy: null
    };
  }


  const collidedEnemy =
    findEnemyCollision(
      targetCenter,
      targetRadius
    );


  return {

    collision:
      collidedEnemy !== null,

    enemy:
      collidedEnemy
  };
}


/* =========================================================
   ESTILOS
   ========================================================= */

function getEnemyStyle(
  type
) {

  return (
    ENEMY_STYLES[type] ??
    ENEMY_STYLES.basic
  );
}


/* =========================================================
   DIBUJO NORMAL
   ========================================================= */

function renderBasicEnemy(
  context,
  enemy,
  style
) {

  const pixelX =
    enemy.x *
    CELL_SIZE;


  const pixelY =
    enemy.y *
    CELL_SIZE;


  /*
   * Tamaño visual ×2.
   *
   * No afecta al radio lógico
   * utilizado para colisiones.
   */
  const pixelRadius =
    enemy.radius *
    CELL_SIZE *
    2.0;


  context.beginPath();


  context.arc(
    pixelX,
    pixelY,
    pixelRadius,
    0,
    Math.PI * 2
  );


  context.fillStyle =
    style.fill;

  context.fill();


  context.strokeStyle =
    style.border;

  context.lineWidth = 2;

  context.stroke();


  /*
   * Brillo.
   */
  context.beginPath();


  context.arc(
    pixelX - 2,
    pixelY - 2,
    2,
    0,
    Math.PI * 2
  );


  context.fillStyle =
    style.detail;

  context.fill();
}


/* =========================================================
   EFECTO VISUAL DE CONGELACIÓN
   ========================================================= */

function renderFrozenEnemy(
  context,
  enemy
) {

  const pixelX =
    enemy.x *
    CELL_SIZE;


  const pixelY =
    enemy.y *
    CELL_SIZE;


  const pixelRadius =
    enemy.radius *
    CELL_SIZE;


  /*
   * Cuerpo azul.
   */
  renderBasicEnemy(
    context,
    enemy,
    FROZEN_STYLE
  );


  /*
   * Halo de hielo.
   */
  context.save();


  context.beginPath();


  context.arc(
    pixelX,
    pixelY,
    pixelRadius + 3,
    0,
    Math.PI * 2
  );


  context.strokeStyle =
    "#bff6ff";


  context.lineWidth = 2;


  context.stroke();


  /*
   * Copo pequeño.
   */
  context.fillStyle =
    "#ffffff";


  context.font =
    `bold ${Math.max(
      9,
      CELL_SIZE * 0.42
    )}px sans-serif`;


  context.textAlign =
    "center";


  context.textBaseline =
    "middle";


  context.fillText(
    "❄",
    pixelX,
    pixelY
  );


  context.restore();
}


/* =========================================================
   AVISO DE DESCONGELACIÓN
   ========================================================= */

/*
 * Devuelve true durante los últimos
 * 3 segundos de congelación.
 */
function isFreezeWarningActive() {

  return (
    gameState.enemyFreezeTime > 0 &&
    gameState.enemyFreezeTime <=
      FREEZE_WARNING_TIME
  );
}


/*
 * Durante el aviso alternamos
 * aproximadamente 4 veces por segundo
 * entre aspecto normal y congelado.
 */
function shouldShowNormalFreezeFrame() {

  if (
    !isFreezeWarningActive()
  ) {
    return false;
  }


  return (
    Math.floor(
      gameState.enemyFreezeTime * 4
    ) %
    2 ===
    0
  );
}


/* =========================================================
   DIBUJO POR TIPO
   ========================================================= */

function renderEnemy(
  context,
  enemy
) {

  /*
   * Mientras están congelados:
   *
   * - normalmente se muestran azules;
   *
   * - durante los últimos 3 segundos
   *   alternan azul / normal para avisar
   *   de que van a despertar.
   *
   * El movimiento sigue completamente
   * detenido durante todo el efecto.
   */
  if (
    areEnemiesFrozen()
  ) {

    if (
      shouldShowNormalFreezeFrame()
    ) {

      const style =
        getEnemyStyle(
          enemy.type
        );


      renderBasicEnemy(
        context,
        enemy,
        style
      );

    } else {

      renderFrozenEnemy(
        context,
        enemy
      );
    }


    return;
  }


  const style =
    getEnemyStyle(
      enemy.type
    );


  switch (
    enemy.type
  ) {

    case "fast":
    case "heavy":
    case "basic":
    default:

      renderBasicEnemy(
        context,
        enemy,
        style
      );

      break;
  }
}


/* =========================================================
   RENDER GENERAL
   ========================================================= */

export function renderEnemies(
  context
) {

  if (!context) {

    throw new TypeError(
      "renderEnemies necesita un contexto 2D válido."
    );
  }


  for (
    const enemy
    of getEnemies()
  ) {

    renderEnemy(
      context,
      enemy
    );
  }
}
