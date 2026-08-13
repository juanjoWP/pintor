"use strict";

import {
  BOARD_COLUMNS,
  BOARD_ROWS
} from "./config.js";


/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */

const LEVEL_COUNT = 100;

const TARGET_PERCENT = 80;
const ROUND_TIME = 100;
const STARTING_LIVES = 3;

const PLAYER_MOVE_INTERVAL = 0.075;

const ENEMY_COLLISION_DAMAGE = 1;
const INVULNERABILITY_DURATION = 3.0;


/* =========================================================
   DIFICULTAD
   ========================================================= */

/*
 * La velocidad dinámica ya NO se calcula aquí.
 *
 * levels.js entrega siempre las velocidades base ×1.
 *
 * game.js aplicará después el multiplicador dinámico:
 *
 * ×1.00
 * ×1.06
 * ×1.12
 * ×1.18
 * ...
 *
 * Reinicios automáticos previstos:
 *
 * nivel 1
 * nivel 5
 * nivel 11
 * nivel 18
 * nivel 22
 *
 * Y posteriormente también al perder una vida
 * o repetir un nivel por tiempo agotado.
 */


/* =========================================================
   TIPOS DE PREMIOS
   ========================================================= */

const PRIZE_TYPES = Object.freeze({
  EXTRA_LIFE: "extraLife",
  EXTRA_TIME: "extraTime",
  INVULNERABILITY: "invulnerability",
  FREEZE_ENEMIES: "freezeEnemies",
  SLOW_ENEMIES: "slowEnemies",
  PAINT_EXPLOSION: "paintExplosion",
  ROLLER_UPGRADE: "rollerUpgrade"
});


/* =========================================================
   REGLAS DE PREMIOS
   ========================================================= */

const FIRST_EXTRA_LIFE_LEVEL = 6;
const EXTRA_LIFE_LEVEL_GAP = 10;

const FIRST_ROLLER_UPGRADE_LEVEL = 5;
const ROLLER_UPGRADE_LEVEL_GAP = 10;


/*
 * Rotación normal de premios:
 *
 * Nivel 2  -> tiempo
 * Nivel 3  -> invulnerabilidad
 * Nivel 4  -> congelación
 * Nivel 5  -> caracol
 * Nivel 6  -> explosión
 * Nivel 7  -> tiempo
 * ...
 */
const REGULAR_PRIZE_TYPES = Object.freeze([
  PRIZE_TYPES.EXTRA_TIME,
  PRIZE_TYPES.INVULNERABILITY,
  PRIZE_TYPES.FREEZE_ENEMIES,
  PRIZE_TYPES.SLOW_ENEMIES,
  PRIZE_TYPES.PAINT_EXPLOSION
]);


/* =========================================================
   ENEMIGOS BASE
   ========================================================= */

/*
 * TABLA DEFINITIVA DE CANTIDAD:
 *
 * niveles 1 - 4   -> 2 enemigos
 * niveles 5 - 10  -> 3 enemigos
 * niveles 11 - 17 -> 4 enemigos
 * nivel 18+       -> 5 enemigos
 *
 * Todos nacen aquí con velocidad base ×1.
 */
const ENEMY_TEMPLATES = Object.freeze([

  Object.freeze({
    type: "basic",
    x: 5.5,
    y: 3.5,
    vx: 4.2,
    vy: 3.2,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 19.5,
    y: 10.5,
    vx: -3.7,
    vy: 3.8,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 12.5,
    y: 5.5,
    vx: 3.4,
    vy: -4.0,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 7.5,
    y: 10.5,
    vx: -4.1,
    vy: -3.3,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 18.5,
    y: 6.5,
    vx: 4.0,
    vy: -3.7,
    radius: 0.38
  })
]);


/* =========================================================
   UTILIDADES
   ========================================================= */

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
   CANTIDAD DE ENEMIGOS
   ========================================================= */

function getEnemyCount(
  levelId
) {

  if (
    levelId < 5
  ) {
    return 2;
  }


  if (
    levelId < 11
  ) {
    return 3;
  }


  if (
    levelId < 18
  ) {
    return 4;
  }


  return 5;
}


/* =========================================================
   FONDO AUTOMÁTICO
   ========================================================= */

function getLevelImage(
  levelId
) {

  const fileNumber =
    String(
      levelId
    ).padStart(
      3,
      "0"
    );


  return (
    `assets/fondos/${fileNumber}.png`
  );
}


/* =========================================================
   CREACIÓN DE ENEMIGOS
   ========================================================= */

function createLevelEnemies(
  levelId
) {

  const enemyCount =
    getEnemyCount(
      levelId
    );


  /*
   * IMPORTANTE:
   *
   * Aquí NO multiplicamos la velocidad.
   *
   * Cada enemigo se crea siempre a ×1.
   * game.js aplicará posteriormente
   * el multiplicador dinámico.
   */
  return ENEMY_TEMPLATES
    .slice(
      0,
      enemyCount
    )
    .map(
      (template) => {

        return {

          type:
            template.type,

          x:
            clamp(
              template.x,
              template.radius,
              BOARD_COLUMNS -
                template.radius
            ),

          y:
            clamp(
              template.y,
              template.radius,
              BOARD_ROWS -
                template.radius
            ),

          vx:
            template.vx,

          vy:
            template.vy,

          radius:
            template.radius
        };
      }
    );
}


/* =========================================================
   POSICIONES DE PREMIOS
   ========================================================= */

function getPrizePosition(
  levelId,
  slot = 0
) {

  const horizontalMargin = 3;
  const verticalMargin = 3;


  const usableColumns =
    Math.max(
      1,
      BOARD_COLUMNS -
        horizontalMargin * 2
    );


  const usableRows =
    Math.max(
      1,
      BOARD_ROWS -
        verticalMargin * 2
    );


  const x =
    horizontalMargin +
    (
      (
        levelId * 7 +
        slot * 13
      ) %
      usableColumns
    );


  const y =
    verticalMargin +
    (
      (
        levelId * 5 +
        slot * 9
      ) %
      usableRows
    );


  return {
    x,
    y
  };
}


/* =========================================================
   PREMIOS ESPECIALES
   ========================================================= */

function shouldGiveExtraLife(
  levelId
) {

  if (
    levelId <
    FIRST_EXTRA_LIFE_LEVEL
  ) {
    return false;
  }


  return (
    (
      levelId -
      FIRST_EXTRA_LIFE_LEVEL
    ) %
    EXTRA_LIFE_LEVEL_GAP ===
    0
  );
}


function shouldGiveRollerUpgrade(
  levelId
) {

  if (
    levelId <
    FIRST_ROLLER_UPGRADE_LEVEL
  ) {
    return false;
  }


  return (
    (
      levelId -
      FIRST_ROLLER_UPGRADE_LEVEL
    ) %
    ROLLER_UPGRADE_LEVEL_GAP ===
    0
  );
}


/* =========================================================
   PREMIO NORMAL
   ========================================================= */

function getRegularPrizeType(
  levelId
) {

  const index =
    (
      levelId - 2
    ) %
    REGULAR_PRIZE_TYPES.length;


  return (
    REGULAR_PRIZE_TYPES[
      Math.max(
        0,
        index
      )
    ]
  );
}


/* =========================================================
   CREACIÓN DE PREMIOS
   ========================================================= */

function createLevelPrizes(
  levelId
) {

  const prizes = [];


  /*
   * Nivel 1 sin premio.
   */
  if (
    levelId === 1
  ) {
    return prizes;
  }


  let slot = 0;


  /* -------------------------
     PREMIO NORMAL
     ------------------------- */

  const regularPosition =
    getPrizePosition(
      levelId,
      slot
    );


  prizes.push({

    type:
      getRegularPrizeType(
        levelId
      ),

    x:
      regularPosition.x,

    y:
      regularPosition.y,

    value: 1
  });


  slot += 1;


  /* -------------------------
     CORAZÓN
     ------------------------- */

  if (
    shouldGiveExtraLife(
      levelId
    )
  ) {

    const position =
      getPrizePosition(
        levelId,
        slot
      );


    prizes.push({

      type:
        PRIZE_TYPES.EXTRA_LIFE,

      x:
        position.x,

      y:
        position.y,

      value: 1
    });


    slot += 1;
  }


  /* -------------------------
     AMPLIACIÓN
     ------------------------- */

  if (
    shouldGiveRollerUpgrade(
      levelId
    )
  ) {

    const position =
      getPrizePosition(
        levelId,
        slot
      );


    prizes.push({

      type:
        PRIZE_TYPES.ROLLER_UPGRADE,

      x:
        position.x,

      y:
        position.y,

      value: 1
    });
  }


  return prizes;
}


/* =========================================================
   CREACIÓN DEL NIVEL
   ========================================================= */

function createLevel(
  levelId
) {

  return {

    id:
      levelId,

    name:
      `Nivel ${levelId}`,


    /* -------------------------
       CONDICIONES FIJAS
       ------------------------- */

    targetPercent:
      TARGET_PERCENT,

    roundTime:
      ROUND_TIME,

    startingLives:
      STARTING_LIVES,

    playerMoveInterval:
      PLAYER_MOVE_INTERVAL,

    enemyCollisionDamage:
      ENEMY_COLLISION_DAMAGE,

    invulnerabilityDuration:
      INVULNERABILITY_DURATION,


    /* -------------------------
       FONDO
       ------------------------- */

    image:
      getLevelImage(
        levelId
      ),


    /* -------------------------
       DIFICULTAD
       ------------------------- */

    /*
     * El nivel entrega ×1.
     * El multiplicador real se calculará
     * dinámicamente en game.js.
     */
    enemySpeedMultiplier: 1,

    enemyCount:
      getEnemyCount(
        levelId
      ),


    /* -------------------------
       ENTIDADES
       ------------------------- */

    enemies:
      createLevelEnemies(
        levelId
      ),

    prizes:
      createLevelPrizes(
        levelId
      )
  };
}


/* =========================================================
   API PÚBLICA
   ========================================================= */

export function getLevel(
  levelNumber
) {

  const levelId =
    Math.floor(
      Number(
        levelNumber
      )
    );


  if (
    !Number.isInteger(
      levelId
    ) ||
    levelId < 1 ||
    levelId >
      LEVEL_COUNT
  ) {

    return null;
  }


  return createLevel(
    levelId
  );
}


export function getLevelCount() {

  return LEVEL_COUNT;
}


export function hasNextLevel(
  levelNumber
) {

  const levelId =
    Math.floor(
      Number(
        levelNumber
      )
    );


  return (
    Number.isInteger(
      levelId
    ) &&
    levelId >= 1 &&
    levelId <
      LEVEL_COUNT
  );
}


export function getNextLevel(
  currentLevelNumber
) {

  if (
    !hasNextLevel(
      currentLevelNumber
    )
  ) {

    return null;
  }


  return getLevel(
    Number(
      currentLevelNumber
    ) + 1
  );
}


export function levelExists(
  levelNumber
) {

  return (
    getLevel(
      levelNumber
    ) !== null
  );
}


export function getAllLevels() {

  return Array.from(
    {
      length:
        LEVEL_COUNT
    },

    (_, index) =>
      createLevel(
        index + 1
      )
  );
}
