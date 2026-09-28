import { spawn } from "node:child_process";

const baseUrl = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
let startAttempt: Promise<boolean> | undefined;

async function isAvailable() {
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(1_500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 20; attempt++) {
    if (await isAvailable()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

export function ensureOllamaServer() {
  if (process.env.OLLAMA_AUTOSTART === "false") return Promise.resolve(false);
  if (!startAttempt) {
    startAttempt = (async () => {
      if (await isAvailable()) return true;

      try {
        const child = spawn("ollama", ["serve"], { detached: true, stdio: "ignore" });
        child.on("error", (error) => console.warn("Could not start Ollama automatically", error.message));
        child.unref();
      } catch (error) {
        console.warn("Could not start Ollama automatically", error instanceof Error ? error.message : "unknown error");
        return false;
      }

      const available = await waitForServer();
      if (!available) console.warn(`Ollama did not become available at ${baseUrl}`);
      return available;
    })();
  }
  return startAttempt;
}
