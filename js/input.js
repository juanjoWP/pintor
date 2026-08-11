"use strict";


/* =========================================================
   TECLAS DE MOVIMIENTO
   ========================================================= */

const MOVEMENT_KEYS = Object.freeze([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "w",
  "a",
  "s",
  "d"
]);


/*
 * Relación entre los botones táctiles
 * y las mismas teclas que utiliza
 * el teclado.
 */
const TOUCH_CONTROLS = Object.freeze({

  "touch-up":
    "ArrowUp",

  "touch-down":
    "ArrowDown",

  "touch-left":
    "ArrowLeft",

  "touch-right":
    "ArrowRight"
});


const pressedKeys =
  new Set();


let controlsEnabled = true;

let initialized = false;


/* =========================================================
   NORMALIZAR TECLAS
   ========================================================= */

/**
 * Normaliza una tecla para que WASD funcione
 * independientemente de mayúsculas o minúsculas.
 *
 * @param {string} key
 * @returns {string}
 */
function normalizeKey(
  key
) {

  if (
    typeof key !== "string"
  ) {
    return "";
  }


  return (
    key.length === 1
      ? key.toLowerCase()
      : key
  );
}


/* =========================================================
   COMPROBAR TECLAS
   ========================================================= */

/**
 * Comprueba si una tecla controla
 * el movimiento.
 *
 * @param {string} key
 * @returns {boolean}
 */
function isMovementKey(
  key
) {

  return MOVEMENT_KEYS.includes(
    key
  );
}


/* =========================================================
   TECLADO
   ========================================================= */

/**
 * Gestiona una tecla pulsada.
 *
 * @param {KeyboardEvent} event
 */
function handleKeyDown(
  event
) {

  if (
    !controlsEnabled
  ) {
    return;
  }


  const key =
    normalizeKey(
      event.key
    );


  if (
    !isMovementKey(
      key
    )
  ) {
    return;
  }


  event.preventDefault();


  pressedKeys.add(
    key
  );
}


/**
 * Gestiona una tecla liberada.
 *
 * @param {KeyboardEvent} event
 */
function handleKeyUp(
  event
) {

  const key =
    normalizeKey(
      event.key
    );


  if (
    !isMovementKey(
      key
    )
  ) {
    return;
  }


  event.preventDefault();


  pressedKeys.delete(
    key
  );
}


/* =========================================================
   CONTROL TÁCTIL
   ========================================================= */

/**
 * Empieza el movimiento desde
 * uno de los botones de la cruceta.
 */
function handleTouchStart(
  event
) {

  if (
    !controlsEnabled
  ) {
    return;
  }


  const button =
    event.currentTarget;


  const key =
    TOUCH_CONTROLS[
      button.id
    ];


  if (!key) {
    return;
  }


  event.preventDefault();


  /*
   * Capturamos el puntero.
   *
   * Esto hace el control mucho más
   * fiable en móvil si el dedo se
   * desplaza ligeramente mientras
   * mantiene pulsado el botón.
   */
  if (
    event.pointerId !== undefined &&
    button.setPointerCapture
  ) {

    try {

      button.setPointerCapture(
        event.pointerId
      );

    } catch {

      /*
       * Algunos navegadores pueden
       * rechazar la captura.
       *
       * No pasa nada: el control
       * seguirá funcionando.
       */
    }
  }


  pressedKeys.add(
    key
  );
}


/**
 * Detiene el movimiento al soltar
 * un botón de la cruceta.
 */
function handleTouchEnd(
  event
) {

  const button =
    event.currentTarget;


  const key =
    TOUCH_CONTROLS[
      button.id
    ];


  if (!key) {
    return;
  }


  event.preventDefault();


  pressedKeys.delete(
    key
  );
}


/* =========================================================
   PÉRDIDA DE FOCO
   ========================================================= */

/**
 * Limpia las teclas cuando la ventana
 * pierde el foco.
 *
 * También evita que un control táctil
 * pueda quedarse enganchado.
 */
function handleWindowBlur() {

  clearInput();
}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

/**
 * Activa teclado y cruceta táctil.
 *
 * Puede llamarse varias veces
 * sin duplicar listeners.
 */
export function initializeInput() {

  if (
    initialized
  ) {
    return;
  }


  /* -------------------------
     Teclado
     ------------------------- */

  window.addEventListener(
    "keydown",
    handleKeyDown
  );


  window.addEventListener(
    "keyup",
    handleKeyUp
  );


  window.addEventListener(
    "blur",
    handleWindowBlur
  );


  /* -------------------------
     Cruceta táctil
     ------------------------- */

  for (
    const buttonId
    of Object.keys(
      TOUCH_CONTROLS
    )
  ) {

    const button =
      document.getElementById(
        buttonId
      );


    if (!button) {
      continue;
    }


    /*
     * Pointer Events funcionan con:
     *
     * - dedo
     * - stylus
     * - ratón
     */

    button.addEventListener(
      "pointerdown",
      handleTouchStart
    );


    button.addEventListener(
      "pointerup",
      handleTouchEnd
    );


    button.addEventListener(
      "pointercancel",
      handleTouchEnd
    );


    button.addEventListener(
      "lostpointercapture",
      handleTouchEnd
    );


    /*
     * Evitamos que aparezca el menú
     * contextual al mantener pulsado
     * en algunos dispositivos.
     */

    button.addEventListener(
      "contextmenu",
      event => {
        event.preventDefault();
      }
    );
  }


  initialized = true;
}


/* =========================================================
   DESTRUIR INPUT
   ========================================================= */

/**
 * Elimina los eventos del teclado
 * y de la cruceta.
 */
export function destroyInput() {

  if (
    !initialized
  ) {
    return;
  }


  /* -------------------------
     Teclado
     ------------------------- */

  window.removeEventListener(
    "keydown",
    handleKeyDown
  );


  window.removeEventListener(
    "keyup",
    handleKeyUp
  );


  window.removeEventListener(
    "blur",
    handleWindowBlur
  );


  /* -------------------------
     Cruceta
     ------------------------- */

  for (
    const buttonId
    of Object.keys(
      TOUCH_CONTROLS
    )
  ) {

    const button =
      document.getElementById(
        buttonId
      );


    if (!button) {
      continue;
    }


    button.removeEventListener(
      "pointerdown",
      handleTouchStart
    );


    button.removeEventListener(
      "pointerup",
      handleTouchEnd
    );


    button.removeEventListener(
      "pointercancel",
      handleTouchEnd
    );


    button.removeEventListener(
      "lostpointercapture",
      handleTouchEnd
    );
  }


  clearInput();


  initialized = false;
}


/* =========================================================
   DIRECCIÓN ACTUAL
   ========================================================= */

/**
 * Devuelve la dirección de movimiento actual.
 *
 * La prioridad continúa siendo:
 *
 * arriba
 * abajo
 * izquierda
 * derecha
 *
 * Funciona indistintamente con
 * teclado o cruceta.
 *
 * @returns {{dx: number, dy: number}|null}
 */
export function getMovementDirection() {

  if (
    !controlsEnabled
  ) {
    return null;
  }


  /* ARRIBA */

  if (
    pressedKeys.has(
      "ArrowUp"
    ) ||
    pressedKeys.has(
      "w"
    )
  ) {

    return {
      dx: 0,
      dy: -1
    };
  }


  /* ABAJO */

  if (
    pressedKeys.has(
      "ArrowDown"
    ) ||
    pressedKeys.has(
      "s"
    )
  ) {

    return {
      dx: 0,
      dy: 1
    };
  }


  /* IZQUIERDA */

  if (
    pressedKeys.has(
      "ArrowLeft"
    ) ||
    pressedKeys.has(
      "a"
    )
  ) {

    return {
      dx: -1,
      dy: 0
    };
  }


  /* DERECHA */

  if (
    pressedKeys.has(
      "ArrowRight"
    ) ||
    pressedKeys.has(
      "d"
    )
  ) {

    return {
      dx: 1,
      dy: 0
    };
  }


  return null;
}


/* =========================================================
   LIMPIAR INPUT
   ========================================================= */

/**
 * Elimina todas las teclas y botones
 * registrados como pulsados.
 */
export function clearInput() {

  pressedKeys.clear();
}


/* =========================================================
   ACTIVAR INPUT
   ========================================================= */

export function enableInput() {

  controlsEnabled = true;
}


/* =========================================================
   DESACTIVAR INPUT
   ========================================================= */

export function disableInput() {

  controlsEnabled = false;


  clearInput();
}


/* =========================================================
   ESTADO DEL INPUT
   ========================================================= */

export function isInputEnabled() {

  return controlsEnabled;
}


/* =========================================================
   CONSULTAR TECLA
   ========================================================= */

/**
 * Indica si una tecla concreta
 * está pulsada.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function isKeyPressed(
  key
) {

  return pressedKeys.has(
    normalizeKey(
      key
    )
  );
}