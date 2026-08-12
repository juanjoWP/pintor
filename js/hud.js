"use strict";


let elements = null;
let initialized = false;


/* =========================================================
   UTILIDADES
   ========================================================= */

function required(
  id
) {

  const element =
    document.getElementById(
      id
    );


  if (!element) {

    throw new Error(
      `Falta el elemento del HUD #${id}.`
    );
  }


  return element;
}


function optional(
  id
) {

  return document.getElementById(
    id
  );
}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

export function initializeHud() {

  if (
    initialized
  ) {
    return;
  }


  elements = {

    lives:
      required("lives"),

    percent:
      required("percent"),

    time:
      required("time"),

    message:
      required("message"),

    target:
      optional("target"),

    levelNumber:
      optional("level-number"),

    levelName:
      optional("level-name")
  };


  initialized = true;


  hideMessage();
}


/* =========================================================
   COMPROBACIÓN
   ========================================================= */

function ensureInitialized() {

  if (
    !initialized
  ) {

    initializeHud();
  }
}


/* =========================================================
   ACTUALIZAR HUD
   ========================================================= */

export function updateHud(
  values = {}
) {

  ensureInitialized();


  /* -------------------------
     VIDAS
     ------------------------- */

  if (
    values.lives !== undefined
  ) {

    elements.lives.textContent =
      String(
        Math.max(
          0,
          Math.floor(
            values.lives
          )
        )
      );
  }


  /* -------------------------
     PORCENTAJE PINTADO
     ------------------------- */

  if (
    values.percent !== undefined
  ) {

    const percent =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            values.percent
          ) || 0
        )
      );


    elements.percent.textContent =
      `${percent.toFixed(1)}%`;
  }


  /* -------------------------
     TIEMPO
     ------------------------- */

  if (
    values.timeLeft !== undefined
  ) {

    elements.time.textContent =
      String(
        Math.max(
          0,
          Math.ceil(
            Number(
              values.timeLeft
            ) || 0
          )
        )
      );
  }


  /* -------------------------
     OBJETIVO
     ------------------------- */

  if (
    elements.target &&
    values.targetPercent !== undefined
  ) {

    elements.target.textContent =
      `${
        Math.max(
          0,
          Math.min(
            100,
            Number(
              values.targetPercent
            ) || 0
          )
        )
      }%`;
  }


  /* -------------------------
     NIVEL
     ------------------------- */

  if (
    elements.levelNumber &&
    values.levelNumber !== undefined
  ) {

    elements.levelNumber.textContent =
      String(
        values.levelNumber
      );
  }


  /*
   * Se conserva como opcional por
   * compatibilidad, aunque en la versión
   * móvil ya no mostramos el nombre
   * completo del nivel.
   */
  if (
    elements.levelName &&
    values.levelName !== undefined
  ) {

    elements.levelName.textContent =
      String(
        values.levelName ?? ""
      );
  }
}


/* =========================================================
   MENSAJES
   ========================================================= */

export function showMessage(
  text
) {

  ensureInitialized();


  elements.message.textContent =
    String(
      text ?? ""
    );


  elements.message.classList.remove(
    "hidden"
  );


  elements.message.setAttribute(
    "aria-hidden",
    "false"
  );
}


/* =========================================================
   OCULTAR MENSAJE
   ========================================================= */

export function hideMessage() {

  ensureInitialized();


  elements.message.classList.add(
    "hidden"
  );


  elements.message.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================================
   NIVEL COMPLETADO
   ========================================================= */

export function showLevelCompleted() {

  showMessage(
    "¡Nivel completado!"
  );
}


/* =========================================================
   DERROTA
   ========================================================= */

export function showDefeat(
  reason = ""
) {

  if (
    reason === "time"
  ) {

    showMessage(
      "Se ha agotado el tiempo."
    );

  } else if (
    reason === "lives"
  ) {

    showMessage(
      "Te has quedado sin vidas."
    );

  } else {

    showMessage(
      "Fin de la partida."
    );
  }
}


/* =========================================================
   JUEGO COMPLETADO
   ========================================================= */

export function showGameCompleted() {

  showMessage(
    "¡Has completado todos los niveles!"
  );
}
