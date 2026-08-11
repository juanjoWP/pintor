"use strict";

/**
 * Dimensiones generales del tablero.
 *
 * 37 columnas × 26 px = 962 px
 * 20 filas × 26 px = 520 px
 *
 * Total: 740 casillas.
 */
export const CANVAS_WIDTH = 962;
export const CANVAS_HEIGHT = 520;
export const CELL_SIZE = 26;

export const BOARD_COLUMNS = CANVAS_WIDTH / CELL_SIZE;
export const BOARD_ROWS = CANVAS_HEIGHT / CELL_SIZE;
export const TOTAL_CELLS = BOARD_COLUMNS * BOARD_ROWS;

export const CELL_STATE = Object.freeze({
  EMPTY: 0,
  PAINTED: 1
});

export const INITIAL_ROUND_TIME = 120;
export const DEFAULT_TARGET_PERCENT = 75;
export const DEFAULT_STARTING_LIVES = 3;

export const DEFAULT_PLAYER_MOVE_INTERVAL = 0.075;
export const DEFAULT_ENEMY_COLLISION_DAMAGE = 1;

export const INVULNERABILITY_DURATION = 1.5;

export const MAX_DELTA_TIME = 0.033;
export const TIMER_UPDATE_INTERVAL = 0.1;

/**
 * Configuración inicial del jugador.
 *
 * La posición se calcula automáticamente
 * utilizando las nuevas dimensiones.
 */
export const PLAYER_CONFIG = Object.freeze({
  startX: Math.floor(BOARD_COLUMNS / 2),
  startY: BOARD_ROWS - 2,

  collisionRadius: 0.42,

  initialDirection: Object.freeze({
    dx: 0,
    dy: -1
  })
});

/**
 * Valores por defecto de los premios.
 */
export const PRIZE_DEFAULTS = Object.freeze({
  extraLife: Object.freeze({
    value: 1
  }),

  extraTime: Object.freeze({
    value: 15
  }),

  paintBoost: Object.freeze({
    radius: 1
  }),

  invulnerability: Object.freeze({
    duration: 4
  })
});

/**
 * Colores del tablero.
 */
export const BOARD_COLORS = Object.freeze({
  background: "#111827",

emptyEven: "#91b9e6",
emptyOdd: "#86add9",

  painted: "#cedcf1",
  paintedHighlight: "#2d83ff",

  grid: "rgba(255,255,255,0.28)"
});

/**
 * Colores del rodillo.
 */
export const ROLLER_COLORS = Object.freeze({
  roller: "#ffd538",
  outline: "#2c2100",
  support: "#e9eefc",
  handle: "#39e58c"
});

/**
 * Colores de enemigos.
 */
export const ENEMY_COLORS = Object.freeze({
  basic: "#ff365f",
  outline: "#ffffff",
  highlight: "#ffffff"
});

/**
 * Colores de premios.
 */
export const PRIZE_COLORS = Object.freeze({
  extraLife: "#ff5b76",
  extraTime: "#66d9ff",
  paintBoost: "#ffd538",
  invulnerability: "#b693ff"
});