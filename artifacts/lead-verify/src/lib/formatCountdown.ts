export function formatCountdown(targetIso: string | null | undefined): string | null {
  if (!targetIso) return null;
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return "soon";
  const totalSec = Math.ceil(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec > 0 ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return `${hr}h ${remMin}m`;
}
