import { spawn } from "child_process";
import { resolve } from "path";

const SCREENSHOT_INTERVAL = 15 * 60 * 1000; // 15 minutes
const SCREENSHOT_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const HOME_DIR_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const EXPORT_INTERVAL = 2 * 60 * 1000; // 2 minutes
const EXPORT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const SITE_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes
const SITE_UPDATE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

function runWithTimeout(
  script: string,
  timeout: number
): Promise<{ success: boolean; code: number | null }> {
  return new Promise((resolve) => {
    const scriptPath = `src/cli/${script}`;
    console.log(`[cron] Starting ${script}`);

    const child = spawn("tsx", [scriptPath], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });

    const timer = setTimeout(() => {
      console.log(`[cron] ${script} timed out after ${timeout / 1000}s, killing`);
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeout);

    child.on("close", (code) => {
      clearTimeout(timer);
      console.log(`[cron] ${script} exited with code ${code}`);
      resolve({ success: code === 0, code });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      console.error(`[cron] ${script} error:`, err);
      resolve({ success: false, code: null });
    });
  });
}

async function runScreenshotUpdater() {
  await runWithTimeout("update-screenshots.tsx", SCREENSHOT_TIMEOUT);
}

async function runHomeDirectoryUpdater() {
  await runWithTimeout("update-home-directory-sizes.ts", HOME_DIR_TIMEOUT);
}

async function runExportProcessor() {
  await runWithTimeout("process-exports.ts", EXPORT_TIMEOUT);
}

async function runSiteUpdateDispatcher() {
  await runWithTimeout("dispatch-site-updates.ts", SITE_UPDATE_TIMEOUT);
}

function scheduleDaily(hour: number, minute: number, fn: () => Promise<void>) {
  const runIfTime = () => {
    const now = new Date();
    if (now.getHours() === hour && now.getMinutes() === minute) {
      fn();
    }
  };

  // Check every minute
  setInterval(runIfTime, 60 * 1000);

  // Also check on startup
  runIfTime();
}

async function main() {
  console.log("[cron] Starting cron scheduler");

  // Run screenshot updater every 15 minutes
  console.log("[cron] Scheduling screenshot updater every 15 minutes");
  setInterval(runScreenshotUpdater, SCREENSHOT_INTERVAL);

  // Run on startup after a short delay
  setTimeout(runScreenshotUpdater, 10 * 1000);

  // Run export processor every 2 minutes
  console.log("[cron] Scheduling export processor every 2 minutes");
  setInterval(runExportProcessor, EXPORT_INTERVAL);

  // Run site-update dispatcher every 5 minutes
  console.log("[cron] Scheduling site-update dispatcher every 5 minutes");
  setInterval(runSiteUpdateDispatcher, SITE_UPDATE_INTERVAL);

  // Run home directory updater daily at 22:00
  console.log("[cron] Scheduling home directory updater daily at 22:00");
  scheduleDaily(22, 0, runHomeDirectoryUpdater);

  // Keep process alive
  process.on("SIGTERM", () => {
    console.log("[cron] Received SIGTERM, shutting down");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("[cron] Received SIGINT, shutting down");
    process.exit(0);
  });
}

main();
