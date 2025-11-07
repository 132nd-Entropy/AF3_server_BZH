// logStreaming.js — unified-stream mode (no per-job EventSource here)

let currentJobId = null;

/**
 * Optional UI helper: clear the visible log box.
 * Safe to call before starting a new job if you want a clean window.
 */
export function clearVisibleLogs() {
  const el =
    document.getElementById("log-output") ||
    document.getElementById("logsDisplay");
  if (!el) return;
  if (el.tagName === "TEXTAREA") {
    el.value = "";
  } else {
    el.textContent = "";
  }
}

/**
 * Kept for compatibility with existing imports.
 * In unified mode, we DO NOT open an EventSource here.
 * We can update the header/textarea to note which job the UI is focusing on,
 * but the actual streaming is handled by main.js's single EventSource('/logs').
 */
export function fetchCurrentLogs(jobId) {
  if (!jobId) return;
  currentJobId = jobId;
  // (Optional) annotate the visible log area with a marker:
  const el =
    document.getElementById("log-output") ||
    document.getElementById("logsDisplay");
  if (el) {
    const marker = `\n--- Switched UI focus to job ${jobId} ---\n`;
    if (el.tagName === "TEXTAREA") {
      el.value += marker;
      el.scrollTop = el.scrollHeight;
    } else {
      const div = document.createElement("div");
      div.textContent = marker;
      el.appendChild(div);
      el.scrollTop = el.scrollHeight;
    }
  }
  // DO NOT create or close EventSource here.
}

/**
 * Kept for compatibility. No-op in unified mode.
 * The single EventSource('/logs') is created once in main.js on page load.
 */
export function reconnectToPreviousLog() {
  // Previously restored a per-job SSE; now unnecessary.
  return;
}

/**
 * Clear any stored job focus without touching the SSE connection.
 */
export function clearStoredJobId() {
  try { localStorage.removeItem("currentJobId"); } catch {}
  currentJobId = null;
}

export async function loadHistoricalLogs(jobId, tailBytes = 20000) {
  if (!jobId) return;
  try {
    const res = await fetch(`/logs/history/${encodeURIComponent(jobId)}?tailBytes=${tailBytes}`);
    if (!res.ok) return;

    const text = await res.text();
    const el =
      document.getElementById("log-output") ||
      document.getElementById("logsDisplay");
    if (!el) return;

    // Append without nuking live SSE stream
    if (el.tagName === "TEXTAREA") {
      // only append if not already present
      if (!el.value.includes(text.trim())) {
        el.value += (el.value ? "\n" : "") + text;
      }
      el.scrollTop = el.scrollHeight;
    } else {
      el.textContent += (el.textContent ? "\n" : "") + text;
      el.scrollTop = el.scrollHeight;
    }
  } catch (e) {
    console.warn('[loadHistoricalLogs] failed:', e);
  }
}
