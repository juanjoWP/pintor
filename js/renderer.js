"use strict";

import {
  renderBoard,
  renderCompletedBoard
} from "./board.js";

import { renderPrizes } from "./prizes.js";
import { renderEnemies } from "./enemies.js";
import { renderRoller } from "./roller.js";

import {
  GAME_STATUS,
  gameState
} from "./state.js";


export function renderFrame(
  context,
  canvas,
  options = {}
) {
  if (!context) {
    throw new TypeError(
      "renderFrame necesita un contexto 2D válido."
    );
  }

  if (!canvas) {
    throw new TypeError(
      "renderFrame necesita un canvas válido."
    );
  }


  const {
    invulnerabilityTime = 0
  } = options;


  context.clearRect(
    0,
    0,
    canvas.width,
    canvas.height
  );


  /*
   * Cuando el nivel está completado,
   * mostramos la fotografía completa.
   *
   * El porcentaje real NO cambia.
   */
  if (
    gameState.gameStatus ===
    GAME_STATUS.WON
  ) {

    renderCompletedBoard(
      context
    );

  } else {

    renderBoard(
      context
    );
  }


  renderPrizes(
    context
  );

  renderEnemies(
    context
  );

  renderRoller(
    context,
    invulnerabilityTime
  );
}