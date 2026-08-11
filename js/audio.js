"use strict";


/* =========================================================
   RUTAS DE SONIDOS
   ========================================================= */

const SOUND_FILES = Object.freeze({
  hit: "assets/sonidos/golpe.mp3",
  level: "assets/sonidos/nivel.mp3",
  paint: "assets/sonidos/pintar.mp3",
  prize: "assets/sonidos/premio.mp3"
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

  sounds.paint =
    createSound(
      SOUND_FILES.paint,
      0.10
    );

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
    // Algunos navegadores pueden impedirlo
    // antes de que el audio esté listo.
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
   SONIDOS PÚBLICOS
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


export function playPrizeSound() {
  playSound(
    sounds.prize
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

  if (muted) {

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