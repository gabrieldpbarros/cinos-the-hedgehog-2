const MAX_HUD_SPEED = 99;
const MAX_HUD_TENTHS = (59 * 60 + 59) * 10 + 9; // 59:59.9

function safeSeconds(seconds) {
  return Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
}

/** Velocidade do HUD: uma casa decimal, sem passar de 99.0. */
export function formatHudSpeed(speed) {
  const value = Number.isFinite(speed) ? Math.abs(speed) : 0;
  return Math.min(MAX_HUD_SPEED, value).toFixed(1);
}

/** Relógio: MM:SS.d, uma casa decimal, parando em 59:59.9. */
export function formatTime(seconds) {
  const tenths = Math.min(MAX_HUD_TENTHS, Math.floor(safeSeconds(seconds) * 10));
  const minutes = Math.floor(tenths / 600);
  const wholeSeconds = Math.floor((tenths % 600) / 10);
  const decimal = tenths % 10;
  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${decimal}`;
}

export const formatHudTime = formatTime;
