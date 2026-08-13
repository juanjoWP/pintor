"use strict";


/* =========================================================
   RUTAS DE SONIDOS
   ========================================================= */

const SOUND_FILES = Object.freeze({

  /* Sonidos generales */

  hit:
    "assets/sonidos/golpe.mp3",

  level:
    "assets/sonidos/nivel.mp3",

  paint:
    "assets/sonidos/pintar.mp3",


  /* Premios */

  extraLife:
    "assets/sonidos/vida.mp3",

  extraTime:
    "assets/sonidos/reloj.mp3",

  invulnerability:
    "assets/sonidos/premio.mp3",

  freezeEnemies:
    "assets/sonidos/hielo.mp3",

  slowEnemies:
    "assets/sonidos/caracol.mp3",

  paintExplosion:
    "assets/sonidos/explosion.mp3",

  rollerUpgrade:
    "assets/sonidos/largo.mp3",


  /*
   * Sonido genérico de respaldo.
   *
   * Si algún día añadimos un premio nuevo
   * y olvidamos asignarle sonido,
   * sonará premio.mp3.
   */
  prize:
    "assets/sonidos/premio.mp3"
});


/* =========================================================
   ESTADO
   ========================================================= */

let muted = false;

const sounds = {};


/* =========================================================
   CREACIÓN
   ========================================================= */

function createSound(
  source,
  volume = 1
) {

  const audio =
    new Audio(source);


  audio.preload =
    "auto";


  audio.volume =
    Math.min(
      1,
      Math.max(
        0,
        volume
      )
    );


  return audio;
}


/* =========================================================
   INICIALIZACIÓN
   ========================================================= */

function initializeSounds() {

  /* -------------------------
     SONIDOS GENERALES
     ------------------------- */

  sounds.hit =
    createSound(
      SOUND_FILES.hit,
      0.75
    );


  sounds.level =
    createSound(
      SOUND_FILES.level,
      0.75
    );


  /*
   * Conservamos el volumen bajo
   * que ya tenías para pintar.
   */
  sounds.paint =
    createSound(
      SOUND_FILES.paint,
      0.10
    );


  /* -------------------------
     PREMIOS
     ------------------------- */

  sounds.extraLife =
    createSound(
      SOUND_FILES.extraLife,
      0.75
    );


  sounds.extraTime =
    createSound(
      SOUND_FILES.extraTime,
      0.70
    );


  sounds.invulnerability =
    createSound(
      SOUND_FILES.invulnerability,
      0.65
    );


  sounds.freezeEnemies =
    createSound(
      SOUND_FILES.freezeEnemies,
      0.75
    );


  sounds.slowEnemies =
    createSound(
      SOUND_FILES.slowEnemies,
      0.75
    );


  sounds.paintExplosion =
    createSound(
      SOUND_FILES.paintExplosion,
      0.75
    );


  sounds.rollerUpgrade =
    createSound(
      SOUND_FILES.rollerUpgrade,
      0.75
    );


  /*
   * Respaldo.
   */
  sounds.prize =
    createSound(
      SOUND_FILES.prize,
      0.65
    );
}


/* =========================================================
   REPRODUCCIÓN
   ========================================================= */

function playSound(
  sound
) {

  if (
    muted ||
    !sound
  ) {
    return;
  }


  try {

    sound.currentTime = 0;

  } catch {

    /*
     * Algunos navegadores pueden impedirlo
     * antes de que el audio esté listo.
     */
  }


  const playPromise =
    sound.play();


  if (
    playPromise &&
    typeof playPromise.catch ===
      "function"
  ) {

    playPromise.catch(
      () => {}
    );
  }
}


/* =========================================================
   SONIDOS GENERALES
   ========================================================= */

export function playHitSound() {

  playSound(
    sounds.hit
  );
}


export function playLevelSound() {

  playSound(
    sounds.level
  );
}


export function playPaintSound() {

  playSound(
    sounds.paint
  );
}


/* =========================================================
   SONIDOS DE PREMIOS
   ========================================================= */

/*
 * Recibe directamente el tipo de premio.
 *
 * Los nombres coinciden con los tipos
 * utilizados por prizes.js y levels.js:
 *
 * extraLife
 * extraTime
 * invulnerability
 * freezeEnemies
 * slowEnemies
 * paintExplosion
 * rollerUpgrade
 */
export function playPrizeSound(
  prizeType
) {

  const prizeSound =
    sounds[prizeType] ??
    sounds.prize;


  playSound(
    prizeSound
  );
}


/* =========================================================
   SILENCIAR
   ========================================================= */

export function setMuted(
  value
) {

  muted =
    Boolean(value);


  if (
    muted
  ) {

    for (
      const sound
      of Object.values(
        sounds
      )
    ) {

      sound.pause();


      try {

        sound.currentTime = 0;

      } catch {

        // Sin importancia.
      }
    }
  }


  return muted;
}


export function toggleMuted() {

  return setMuted(
    !muted
  );
}


export function isMuted() {

  return muted;
}


/* =========================================================
   ARRANQUE
   ========================================================= */

initializeSounds();
