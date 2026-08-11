"use strict";

/**
 * =========================================================
 * TABLERO - VERSIÓN MÓVIL
 * =========================================================
 *
 * 25 columnas × 40 px = 1000 px
 * 14 filas × 40 px = 560 px
 *
 * Total: 350 casillas.
 *
 * Versión anterior:
 * 37 × 20 = 740 casillas.
 *
 * Las casillas pasan de 26 px a 40 px.
 */

export const CANVAS_WIDTH = 1000;
export const CANVAS_HEIGHT = 560;

export const CELL_SIZE = 40;


/*
 * Las dimensiones lógicas del tablero
 * se calculan automáticamente.
 */
export const BOARD_COLUMNS =
  CANVAS_WIDTH / CELL_SIZE;

export const BOARD_ROWS =
  CANVAS_HEIGHT / CELL_SIZE;

export const TOTAL_CELLS =
  BOARD_COLUMNS * BOARD_ROWS;


/* =========================================================
   ESTADO DE CASILLAS
   ========================================================= */

export const CELL_STATE = Object.freeze({
  EMPTY: 0,
  PAINTED: 1
});


/* =========================================================
   VALORES GENERALES
   ========================================================= */

export const INITIAL_ROUND_TIME = 120;

export const DEFAULT_TARGET_PERCENT = 75;

export const DEFAULT_STARTING_LIVES = 3;


/* =========================================================
   JUGADOR
   ========================================================= */

export const DEFAULT_PLAYER_MOVE_INTERVAL =
  0.075;

export const DEFAULT_ENEMY_COLLISION_DAMAGE =
  1;

export const INVULNERABILITY_DURATION =
  1.5;


/* =========================================================
   BUCLE DEL JUEGO
   ========================================================= */

export const MAX_DELTA_TIME =
  0.033;

export const TIMER_UPDATE_INTERVAL =
  0.1;


/* =========================================================
   CONFIGURACIÓN DEL JUGADOR
   ========================================================= */

/**
 * La posición inicial se adapta
 * automáticamente al nuevo tablero.
 */
export const PLAYER_CONFIG = Object.freeze({

  startX:
    Math.floor(
      BOARD_COLUMNS / 2
    ),

  startY:
    BOARD_ROWS - 2,


  /*
   * Sigue expresado en unidades
   * de casilla, no en píxeles.
   *
   * Por tanto no hace falta modificarlo.
   */
  collisionRadius: 0.42,


  initialDirection:
    Object.freeze({

      dx: 0,
      dy: -1
    })
});


/* =========================================================
   VALORES POR DEFECTO DE PREMIOS
   ========================================================= */

export const PRIZE_DEFAULTS = Object.freeze({

  extraLife:
    Object.freeze({
      value: 1
    }),


  extraTime:
    Object.freeze({
      value: 15
    }),


  paintBoost:
    Object.freeze({
      radius: 1
    }),


  invulnerability:
    Object.freeze({
      duration: 4
    })
});


/* =========================================================
   COLORES DEL TABLERO
   ========================================================= */

export const BOARD_COLORS = Object.freeze({

  background:
    "#111827",


  emptyEven:
    "#91b9e6",

  emptyOdd:
    "#86add9",


  painted:
    "#cedcf1",

  paintedHighlight:
    "#2d83ff",


  grid:
    "rgba(255,255,255,0.28)"
});


/* =========================================================
   COLORES DEL RODILLO
   ========================================================= */

export const ROLLER_COLORS = Object.freeze({

  roller:
    "#ffd538",

  outline:
    "#2c2100",

  support:
    "#e9eefc",

  handle:
    "#39e58c"
});


/* =========================================================
   COLORES DE ENEMIGOS
   ========================================================= */

export const ENEMY_COLORS = Object.freeze({

  basic:
    "#ff365f",

  outline:
    "#ffffff",

  highlight:
    "#ffffff"
});


/* =========================================================
   COLORES DE PREMIOS
   ========================================================= */

export const PRIZE_COLORS = Object.freeze({

  extraLife:
    "#ff5b76",

  extraTime:
    "#66d9ff",

  paintBoost:
    "#ffd538",

  invulnerability:
    "#b693ff"
});
