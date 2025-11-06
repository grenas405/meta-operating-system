import { GENESIS_QUOTES } from "./constants/genesis-quotes.ts";
import { LifelineAnimator } from "./utils/LifelineAnimator.ts";
import type { SystemMetrics } from "./types/SystemMetrics.ts";

let quoteIndex = 0;
let metricsCount = 0;
const METRICS_BETWEEN_QUOTES = 20; // Show quote every 20 metrics

const lifelineAnimator = new LifelineAnimator(40); // Smaller width for service logs

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString();
}

function getStatusSymbol(cpuUsage: number, memUsage: number): string {
  if (cpuUsage > 80 || memUsage > 85) return "🔴";
  if (cpuUsage > 60 || memUsage > 70) return "🟡";
  return "🟢";
}

function logMinimalMetrics(metrics: SystemMetrics): void {
  const status = getStatusSymbol(metrics.cpu_usage_percent, metrics.memory_usage_percent);
  const lifeline = lifelineAnimator.renderGradientLifeline(
    metrics.cpu_usage_percent,
    metrics.memory_usage_percent
  );

  // Strip ANSI codes for cleaner service logs
  const cleanLifeline = lifeline.replace(/\x1b\[[0-9;]*m/g, "");

  const timestamp = formatTimestamp(metrics.timestamp);
  const cpu = metrics.cpu_usage_percent.toFixed(1);
  const mem = metrics.memory_usage_percent.toFixed(1);

  // Compact one-line format
  console.log(`[${timestamp}] ${status} ${cleanLifeline} | CPU: ${cpu}% | MEM: ${mem}%`);

  // Alert on critical conditions
  if (metrics.cpu_spike_detected) {
    console.log(`[${timestamp}] ⚠️  ALERT: CPU spike detected (${cpu}%)`);
  }
  if (metrics.memory_leak_suspected) {
    console.log(`[${timestamp}] ⚠️  ALERT: Memory leak suspected (${mem}%)`);
  }

  metricsCount++;

  // Periodically show an inspirational quote
  if (metricsCount % METRICS_BETWEEN_QUOTES === 0) {
    console.log(`[${timestamp}] 💭 "${GENESIS_QUOTES[quoteIndex]}"`);
    quoteIndex = (quoteIndex + 1) % GENESIS_QUOTES.length;
  }
}

async function monitorSystemService() {
  // Simple startup message
  console.log(`[${new Date().toISOString()}] 💓 Heartbeat service starting...`);
  console.log(`[${new Date().toISOString()}] 📡 Monitoring system vitals...`);
  console.log(`[${new Date().toISOString()}] 💭 "${GENESIS_QUOTES[0]}"\n`);

  const command = new Deno.Command("cargo", {
    args: ["run", "--release", "--quiet"],
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();
  const decoder = new TextDecoder();
  const reader = process.stdout.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const text = decoder.decode(value);
      const lines = text.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        try {
          const metrics: SystemMetrics = JSON.parse(line);
          logMinimalMetrics(metrics);
        } catch (e) {
          console.error(`[${new Date().toISOString()}] ❌ Parse error: ${e}`);
        }
      }
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Monitor error: ${error}`);
  } finally {
    reader.releaseLock();
  }

  const status = await process.status;
  if (!status.success) {
    console.error(`[${new Date().toISOString()}] ❌ Process exited with code ${status.code}`);
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await monitorSystemService();
}
