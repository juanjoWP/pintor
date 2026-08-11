"use strict";

import {
  BOARD_COLUMNS,
  BOARD_ROWS
} from "./config.js";


/* =========================================================
   CONFIGURACIÓN GENERAL
   ========================================================= */

const LEVEL_COUNT = 100;

const TARGET_PERCENT = 84;
const ROUND_TIME = 90;
const STARTING_LIVES = 3;

const PLAYER_MOVE_INTERVAL = 0.075;

const ENEMY_COLLISION_DAMAGE = 1;
const INVULNERABILITY_DURATION = 1.5;


/* =========================================================
   DIFICULTAD
   ========================================================= */

const ENEMY_SPEED_INCREASE_PER_LEVEL = 0.06;
const MAX_ENEMY_SPEED_MULTIPLIER = 3.5;


/* =========================================================
   TIPOS DE PREMIOS
   ========================================================= */

const PRIZE_TYPES = Object.freeze({
  EXTRA_LIFE: "extraLife",
  EXTRA_TIME: "extraTime",
  INVULNERABILITY: "invulnerability",
  FREEZE_ENEMIES: "freezeEnemies",
  PAINT_EXPLOSION: "paintExplosion",
  ROLLER_UPGRADE: "rollerUpgrade"
});


/* =========================================================
   REGLAS DE PREMIOS
   ========================================================= */

/*
 * Corazón:
 *
 * - nunca antes del nivel 5
 * - mínimo 6 niveles entre corazones
 *
 * Aparecerá:
 * 5, 11, 17, 23, 29...
 */
const FIRST_EXTRA_LIFE_LEVEL = 5;
const EXTRA_LIFE_LEVEL_GAP = 6;


/*
 * Ampliación:
 *
 * - mínimo 6 niveles entre ampliaciones
 *
 * Aparecerá:
 * 3, 9, 15, 21, 27...
 */
const FIRST_ROLLER_UPGRADE_LEVEL = 3;
const ROLLER_UPGRADE_LEVEL_GAP = 6;


/*
 * Premios normales.
 *
 * Se van alternando automáticamente.
 */
const REGULAR_PRIZE_TYPES = Object.freeze([
  PRIZE_TYPES.EXTRA_TIME,
  PRIZE_TYPES.INVULNERABILITY,
  PRIZE_TYPES.FREEZE_ENEMIES,
  PRIZE_TYPES.PAINT_EXPLOSION
]);


/* =========================================================
   ENEMIGOS BASE
   ========================================================= */

/*
 * Plantillas de los cinco enemigos máximos.
 *
 * Niveles 1-3   -> 2
 * Niveles 4-7   -> 3
 * Niveles 8-12  -> 4
 * Nivel 13+     -> 5
 */
const ENEMY_TEMPLATES = Object.freeze([
  Object.freeze({
    type: "basic",
    x: 7.5,
    y: 4.5,
    vx: 4.2,
    vy: 3.2,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 29.5,
    y: 15.5,
    vx: -3.7,
    vy: 3.8,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 18.5,
    y: 7.5,
    vx: 3.4,
    vy: -4.0,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 11.5,
    y: 15.5,
    vx: -4.1,
    vy: -3.3,
    radius: 0.38
  }),

  Object.freeze({
    type: "basic",
    x: 27.5,
    y: 9.5,
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

  if (levelId <= 3) {
    return 2;
  }

  if (levelId <= 7) {
    return 3;
  }

  if (levelId <= 12) {
    return 4;
  }

  return 5;
}


/* =========================================================
   VELOCIDAD DE ENEMIGOS
   ========================================================= */

function getEnemySpeedMultiplier(
  levelId
) {

  const multiplier =
    1 +
    (
      levelId - 1
    ) *
    ENEMY_SPEED_INCREASE_PER_LEVEL;


  return Math.min(
    MAX_ENEMY_SPEED_MULTIPLIER,
    multiplier
  );
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


  const speedMultiplier =
    getEnemySpeedMultiplier(
      levelId
    );


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
            template.vx *
            speedMultiplier,

          vy:
            template.vy *
            speedMultiplier,

          radius:
            template.radius
        };
      }
    );
}


/* =========================================================
   POSICIONES DE PREMIOS
   ========================================================= */

/**
 * Genera posiciones variables pero deterministas.
 *
 * Esto significa que un premio del nivel 20
 * siempre aparecerá en la misma posición,
 * incluso aunque reinicies el nivel.
 */
function getPrizePosition(
  levelId,
  slot = 0
) {

  /*
   * Dejamos cierto margen respecto
   * a los bordes.
   */
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

/**
 * Distribución:
 *
 * Nivel 1:
 * sin premio.
 *
 * Desde nivel 2:
 * normalmente 1 premio.
 *
 * Cuando toca corazón o ampliación,
 * ese nivel puede tener 2 premios.
 */
function createLevelPrizes(
  levelId
) {

  const prizes = [];


  /*
   * Nivel 1 limpio para aprender
   * la mecánica básica.
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

    value:
      1
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

      value:
        1
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

      value:
        1
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

    enemySpeedMultiplier:
      getEnemySpeedMultiplier(
        levelId
      ),

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