import { configure, getConsoleSink } from "@logtape/logtape";

// Fedify and its deps log via @logtape/logtape. Without a configured sink
// the logs are dropped. Call this once on process startup.
let configured = false;
let configuring: Promise<void> | null = null;

export function configureLogging(): Promise<void> {
  if (configured) return Promise.resolve();
  if (configuring) return configuring;

  configuring = configure({
    sinks: { console: getConsoleSink() },
    loggers: [
      { category: "fedify", lowestLevel: "info", sinks: ["console"] },
      { category: "logtape", lowestLevel: "warning", sinks: ["console"] },
    ],
  }).then(() => {
    configured = true;
  });

  return configuring;
}
