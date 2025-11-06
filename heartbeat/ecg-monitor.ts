import { ConsoleStyler } from "./utils/console-styler/ConsoleStyler.ts";
import { LifelineAnimator } from "./utils/LifelineAnimator.ts";
import type { SystemMetrics } from "./types/SystemMetrics.ts";

// Create the lifeline animator instance
const lifelineAnimator = new LifelineAnimator(60);

function displayMetrics(metrics: SystemMetrics): void {
  const date = new Date(metrics.timestamp * 1000).toLocaleTimeString();

  // Clear previous output for cleaner display
  console.clear();

  // Display banner with lifeline animation
  ConsoleStyler.logSection("💓 Heartbeat System Monitor", "brightCyan", "heavy");

  // Show elegant lifeline animation
  const lifeline = lifelineAnimator.renderGradientLifeline(
    metrics.cpu_usage_percent,
    metrics.memory_usage_percent
  );
  console.log(`   ${lifeline}`);

  // Show pulsing heart that speeds up with load
  const heart = lifelineAnimator.renderPulsingHeart(
    metrics.cpu_usage_percent,
    metrics.memory_usage_percent
  );
  console.log(`   ${heart}  System Vitals\n`);

  // Show alerts if any
  if (metrics.cpu_spike_detected || metrics.memory_leak_suspected) {
    const alerts: string[] = [];
    if (metrics.cpu_spike_detected) {
      alerts.push("🚨 CPU SPIKE DETECTED - Usage significantly above baseline");
    }
    if (metrics.memory_leak_suspected) {
      alerts.push("🚨 MEMORY LEAK SUSPECTED - Usage growing abnormally");
    }
    ConsoleStyler.logBox(alerts, "⚠️  CRITICAL ALERTS", "brightRed");
    console.log("");
  }

  // CPU Usage with color coding
  const cpuColor = metrics.cpu_usage_percent > 80
    ? "brightRed"
    : metrics.cpu_usage_percent > 60
    ? "brightYellow"
    : "brightGreen";

  ConsoleStyler.logSection("🖥️  CPU Metrics", cpuColor);
  ConsoleStyler.logCustom(
    `Overall CPU Usage: ${metrics.cpu_usage_percent.toFixed(2)}%`,
    "📊",
    cpuColor,
  );

  // Display per-core usage
  const coresPerRow = 4;
  const coreRows: string[] = [];
  for (let i = 0; i < metrics.cpu_cores.length; i += coresPerRow) {
    const rowCores = metrics.cpu_cores.slice(i, i + coresPerRow);
    const coreDisplay = rowCores
      .map((core) => {
        const coreColor = core.usage_percent > 80
          ? ConsoleStyler.colors256.brightRed
          : core.usage_percent > 60
          ? ConsoleStyler.colors256.orange
          : ConsoleStyler.colors256.brightGreen;
        return `${coreColor}Core ${core.core_id}: ${
          core.usage_percent.toFixed(1)
        }%${ConsoleStyler.colors.reset}`;
      })
      .join("  ");
    coreRows.push(`   ${coreDisplay}`);
  }
  coreRows.forEach((row) => console.log(row));
  console.log("");

  // Memory Usage with color coding and visual bar
  const memColor = metrics.memory_usage_percent > 85
    ? "brightRed"
    : metrics.memory_usage_percent > 70
    ? "orange"
    : "brightGreen";

  ConsoleStyler.logSection("💾 Memory Metrics", memColor);

  const memUsedGB = (metrics.memory_used_mb / 1024).toFixed(2);
  const memTotalGB = (metrics.memory_total_mb / 1024).toFixed(2);
  const memAvailableGB = (metrics.memory_available_mb / 1024).toFixed(2);

  ConsoleStyler.logCustom(
    `Used: ${memUsedGB} GB / ${memTotalGB} GB (${
      metrics.memory_usage_percent.toFixed(2)
    }%)`,
    "📊",
    memColor,
  );
  ConsoleStyler.logInfo(
    `Available: ${memAvailableGB} GB | Free: ${
      (metrics.memory_free_mb / 1024).toFixed(2)
    } GB`,
  );

  // Memory progress bar
  ConsoleStyler.logProgress(
    metrics.memory_used_mb,
    metrics.memory_total_mb,
    "Memory Usage",
  );
  console.log("");

  // Swap Usage
  if (metrics.swap_total_mb > 0) {
    const swapUsagePercent = (metrics.swap_used_mb / metrics.swap_total_mb) * 100;
    const swapColor = swapUsagePercent > 50 ? "warning" : "info";
    ConsoleStyler.logCustom(
      `Swap: ${metrics.swap_used_mb} MB / ${metrics.swap_total_mb} MB (${
        swapUsagePercent.toFixed(2)
      }%)`,
      "💿",
      swapColor,
    );
    console.log("");
  }

  // Timestamp
  ConsoleStyler.logCustom(`Last Updated: ${date}`, "⏰", "dim");
  console.log("");
}

async function monitorSystem() {
  // Display startup banner
  console.clear();
  ConsoleStyler.renderBanner({
    version: "1.0.0",
    buildDate: new Date().toISOString().split("T")[0],
    environment: "production",
    port: 0,
    author: "Heartbeat Team",
    repository: "https://github.com/yourusername/heartbeat",
    description: "Real-time System Performance Monitor",
    features: [
      "CPU Monitoring",
      "Memory Tracking",
      "Spike Detection",
      "Leak Detection",
    ],
  });

  ConsoleStyler.logInfo("Compiling Rust monitor (this may take a moment)...");
  console.log("");

  const command = new Deno.Command("cargo", {
    args: ["run", "--release", "--quiet"],
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();
  const decoder = new TextDecoder();
  const reader = process.stdout.getReader();

  try {
    let firstMetric = true;
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
          if (firstMetric) {
            ConsoleStyler.logSuccess("Monitor started successfully!");
            await new Promise((resolve) => setTimeout(resolve, 1000));
            firstMetric = false;
          }
          displayMetrics(metrics);
        } catch (e) {
          ConsoleStyler.logError("Failed to parse metrics", {
            line: line.substring(0, 100),
          });
        }
      }
    }
  } catch (error) {
    ConsoleStyler.logCritical("Error reading from monitor", {
      error: String(error),
    });
  } finally {
    reader.releaseLock();
  }

  const status = await process.status;
  if (!status.success) {
    ConsoleStyler.logError("Monitor process exited with error", {
      code: status.code,
    });
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await monitorSystem();
}
