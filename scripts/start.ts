/// <reference lib="webworker" />
import { main as frontendServer } from "./front-server.ts";
// Will be bundled with deno task build
import { main as apiServer } from "./server.ts";

if (import.meta.main) {
  main();
}

export async function main() {
  const { port: apiPort } = await apiServer();
  const { port: frontPort } = await frontendServer({ apiPort });
  if (isRunningInWorker()) {
    self.postMessage({ port: frontPort });
  } else {
    console.log(`API server running on http://localhost:${apiPort}`);
    console.log(`Frontend server running on http://localhost:${frontPort}`);
  }
}

function isRunningInWorker() {
  return (
    typeof DedicatedWorkerGlobalScope !== "undefined" &&
    self instanceof DedicatedWorkerGlobalScope
  );
}
