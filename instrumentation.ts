export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureOllamaServer } = await import("./lib/ollama-server");
    await ensureOllamaServer();
  }
}
