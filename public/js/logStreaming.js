// public/js/logStreaming.js — unified-stream mode (no per-job EventSource here)

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
  return; // no-op
}

/**
 * Clear any stored job focus without touching the SSE connection.
 */
export function clearStoredJobId() {
  try { localStorage.removeItem("currentJobId"); } catch {}
  currentJobId = null;
}

/**
 * Load historical logs for a job from /logs/history/:jobId.
 * Retries briefly to avoid a race where the log file hasn't been created yet.
 */
export async function loadHistoricalLogs(jobId, tailBytes = 20000, tries = 6, delayMs = 500) {
  if (!jobId) return;

  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetch(`/logs/history/${encodeURIComponent(jobId)}?tailBytes=${tailBytes}`);

      // With backend change, this should be 200 even if empty — but handle 404 just in case.
      if (res.status === 404) {
        if (attempt < tries) {
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        } else {
          return; // give up quietly; SSE will keep appending new lines
        }
      }

      if (!res.ok) {
        if (attempt < tries) {
          await new Promise(r => setTimeout(r, delayMs));
          continue;
        } else {
          return; // bail
        }
      }

      const text = await res.text();
      const el =
        document.getElementById("log-output") ||
        document.getElementById("logsDisplay");
      if (!el) return;

      if (text && text.trim()) {
        if (el.tagName === "TEXTAREA") {
          if (!el.value.includes(text.trim())) {
            el.value += (el.value ? "\n" : "") + text;
          }
          el.scrollTop = el.scrollHeight;
        } else {
          el.textContent += (el.textContent ? "\n" : "") + text;
          el.scrollTop = el.scrollHeight;
        }
      }
      return; // success (or empty) -> stop retrying
    } catch (e) {
      if (attempt === tries) {
        console.warn('[loadHistoricalLogs] failed:', e);
      } else {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
}
