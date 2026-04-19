import { federation } from "@/lib/federation";
import { configureLogging } from "@/lib/logging";

async function main() {
  await configureLogging();
  console.log("[worker] Starting Fedify queue listener");
  const abort = new AbortController();

  const shutdown = (sig: string) => {
    console.log(`[worker] Received ${sig}, shutting down`);
    abort.abort();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await federation.startQueue(undefined, { signal: abort.signal });
  console.log("[worker] Queue listener exited");
}

main().catch((err) => {
  console.error("[worker] fatal", err);
  process.exit(1);
});
