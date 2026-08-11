"use strict";

import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  CELL_SIZE,
  DEFAULT_TARGET_PERCENT
} from "./config.js";

import { gameState } from "./state.js";

const TOTAL_CELLS = BOARD_COLUMNS * BOARD_ROWS;

const BOARD_COLORS = Object.freeze({
  background: "#163d77",
  coveredCell: "#7faee0",
  paintedCell: "#41c6ff",
  gridLine: "#1c3c63"
});

let backgroundImage = null;
let backgroundImageReady = false;

/**
 * Crea una cuadrícula vacía.
 *
 * false = casilla sin pintar
 * true = casilla pintada
 *
 * @returns {boolean[][]}
 */
function createEmptyGrid() {
  return Array.from(
    { length: BOARD_ROWS },
    () => Array(BOARD_COLUMNS).fill(false)
  );
}

/**
 * Reinicia completamente el tablero.
 */
export function resetBoard() {
  gameState.grid = createEmptyGrid();
  gameState.paintedCells = 0;
  gameState.paintedPercent = 0;
}

/**
 * Comprueba si unas coordenadas están dentro del tablero.
 *
 * @param {number} x Columna.
 * @param {number} y Fila.
 * @returns {boolean}
 */
export function isInsideBoard(x, y) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < BOARD_COLUMNS &&
    y < BOARD_ROWS
  );
}

/**
 * Devuelve el estado de una casilla.
 *
 * @param {number} x Columna.
 * @param {number} y Fila.
 * @returns {boolean|null}
 */
export function getCellState(x, y) {
  if (!isInsideBoard(x, y)) {
    return null;
  }

  return Boolean(gameState.grid?.[y]?.[x]);
}

/**
 * Indica si una casilla ya está pintada.
 *
 * @param {number} x Columna.
 * @param {number} y Fila.
 * @returns {boolean}
 */
export function isPainted(x, y) {
  return getCellState(x, y) === true;
}

/**
 * Calcula el porcentaje actualmente pintado.
 *
 * @returns {number}
 */
export function calculatePaintedPercent() {
  const paintedCells = Number.isFinite(gameState.paintedCells)
    ? gameState.paintedCells
    : 0;

  gameState.paintedPercent =
    (paintedCells / TOTAL_CELLS) * 100;

  return gameState.paintedPercent;
}

/**
 * Pinta una casilla una sola vez.
 *
 * @param {number} x Columna.
 * @param {number} y Fila.
 * @returns {{
 *   painted: boolean,
 *   targetReached: boolean,
 *   percent: number
 * }}
 */
export function paintCell(x, y) {
  if (
    !isInsideBoard(x, y) ||
    !Array.isArray(gameState.grid) ||
    !Array.isArray(gameState.grid[y])
  ) {
    return {
      painted: false,
      targetReached: false,
      percent: gameState.paintedPercent ?? 0
    };
  }

  if (gameState.grid[y][x]) {
    return {
      painted: false,
      targetReached: false,
      percent: gameState.paintedPercent
    };
  }

  gameState.grid[y][x] = true;
  gameState.paintedCells += 1;

  const percent = calculatePaintedPercent();

  const targetPercent =
    gameState.targetPercent ?? DEFAULT_TARGET_PERCENT;

  return {
    painted: true,
    targetReached: percent >= targetPercent,
    percent
  };
}

/**
 * Carga una imagen para utilizarla como fondo oculto.
 *
 * La imagen se dibujará debajo de las casillas oscuras.
 * Las casillas pintadas dejarán ver la imagen.
 *
 * Esta función todavía no se usa desde game.js, pero deja preparado
 * el tablero para incorporar imágenes en los niveles posteriores.
 *
 * @param {string} source Ruta de la imagen.
 * @returns {Promise<HTMLImageElement>}
 */
export function loadBoardImage(source) {
  return new Promise((resolve, reject) => {
    if (
      typeof source !== "string" ||
      source.trim() === ""
    ) {
      reject(
        new Error(
          "La ruta de la imagen del tablero no es válida."
        )
      );

      return;
    }

    const image = new Image();

    image.addEventListener("load", () => {
      backgroundImage = image;
      backgroundImageReady = true;
      resolve(image);
    });

    image.addEventListener("error", () => {
      backgroundImage = null;
      backgroundImageReady = false;

      reject(
        new Error(
          `No se pudo cargar la imagen del tablero: ${source}`
        )
      );
    });

    image.src = source;
  });
}

/**
 * Elimina la imagen del tablero y recupera el fondo azul.
 */
export function clearBoardImage() {
  backgroundImage = null;
  backgroundImageReady = false;
}

/**
 * Indica si hay una imagen preparada para mostrarse.
 *
 * @returns {boolean}
 */
export function hasBoardImage() {
  return backgroundImageReady && backgroundImage !== null;
}

/**
 * Dibuja el fondo azul o la imagen oculta.
 *
 * @param {CanvasRenderingContext2D} context
 */
function renderBackground(context) {
  const boardWidth = BOARD_COLUMNS * CELL_SIZE;
  const boardHeight = BOARD_ROWS * CELL_SIZE;

  context.fillStyle = BOARD_COLORS.background;

  context.fillRect(
    0,
    0,
    boardWidth,
    boardHeight
  );

  if (hasBoardImage()) {
    context.drawImage(
      backgroundImage,
      0,
      0,
      boardWidth,
      boardHeight
    );
  }
}

/**
 * Dibuja todas las casillas del tablero.
 *
 * Sin imagen:
 * - Las casillas sin pintar son oscuras.
 * - Las casillas pintadas son azules.
 *
 * Con imagen:
 * - Las casillas sin pintar siguen oscuras.
 * - Las casillas pintadas no se cubren y dejan ver la imagen.
 *
 * @param {CanvasRenderingContext2D} context
 */
function renderCells(context) {
  const revealImage = hasBoardImage();

  for (let y = 0; y < BOARD_ROWS; y += 1) {
    for (let x = 0; x < BOARD_COLUMNS; x += 1) {
      const painted = Boolean(
        gameState.grid?.[y]?.[x]
      );

      const pixelX = x * CELL_SIZE;
      const pixelY = y * CELL_SIZE;

      if (!painted) {
        context.fillStyle =
          BOARD_COLORS.coveredCell;

        context.fillRect(
          pixelX,
          pixelY,
          CELL_SIZE,
          CELL_SIZE
        );

        continue;
      }

      if (!revealImage) {
        context.fillStyle =
          BOARD_COLORS.paintedCell;

        context.fillRect(
          pixelX,
          pixelY,
          CELL_SIZE,
          CELL_SIZE
        );
      }
    }
  }
}

/**
 * Dibuja las líneas de la cuadrícula.
 *
 * @param {CanvasRenderingContext2D} context
 */
function renderGrid(context) {
  const boardWidth = BOARD_COLUMNS * CELL_SIZE;
  const boardHeight = BOARD_ROWS * CELL_SIZE;

  context.beginPath();

  for (
    let column = 0;
    column <= BOARD_COLUMNS;
    column += 1
  ) {
    const pixelX =
      column * CELL_SIZE + 0.5;

    context.moveTo(pixelX, 0);
    context.lineTo(pixelX, boardHeight);
  }

  for (
    let row = 0;
    row <= BOARD_ROWS;
    row += 1
  ) {
    const pixelY =
      row * CELL_SIZE + 0.5;

    context.moveTo(0, pixelY);
    context.lineTo(boardWidth, pixelY);
  }

  context.strokeStyle =
    BOARD_COLORS.gridLine;

  context.lineWidth = 1;
  context.stroke();
}
/**
 * Muestra la imagen completa cuando se supera el nivel.
 *
 * No modifica el porcentaje pintado.
 * Solo descubre visualmente toda la fotografía.
 *
 * @param {CanvasRenderingContext2D} context
 */
export function renderCompletedBoard(context) {
  if (!context) {
    throw new TypeError(
      "renderCompletedBoard necesita un contexto 2D válido."
    );
  }

  const width =
    BOARD_COLUMNS * CELL_SIZE;

  const height =
    BOARD_ROWS * CELL_SIZE;

  /*
   * Fondo de seguridad.
   */
  context.fillStyle =
    BOARD_COLORS.background;

  context.fillRect(
    0,
    0,
    width,
    height
  );

  /*
   * Mostramos la fotografía completa.
   */
  if (
    backgroundImageReady &&
    backgroundImage
  ) {
    context.drawImage(
      backgroundImage,
      0,
      0,
      width,
      height
    );
  }

  /*
   * Dejamos visible la cuadrícula.
   */
  renderGrid(context);
}
/**
 * Dibuja el tablero completo.
 *
 * Orden de dibujo:
 * 1. Fondo azul o imagen.
 * 2. Casillas oscuras o azules.
 * 3. Líneas de cuadrícula.
 *
 * @param {CanvasRenderingContext2D} context
 */
export function renderBoard(context) {
  if (!context) {
    throw new TypeError(
      "renderBoard necesita un contexto 2D válido."
    );
  }

  renderBackground(context);
  renderCells(context);
  renderGrid(context);
}