import { LifelineAnimator } from "./utils/LifelineAnimator.ts";
import { ConsoleStyler } from "./utils/console-styler/ConsoleStyler.ts";

/**
 * Demo showcasing all lifeline animation styles
 */
async function demoLifelineAnimations() {
  const animator = new LifelineAnimator(60);

  console.clear();
  ConsoleStyler.renderBanner({
    version: "1.0.0",
    buildDate: new Date().toISOString().split("T")[0],
    environment: "demo",
    port: 0,
    author: "Heartbeat Team",
    repository: "https://github.com/yourusername/heartbeat",
    description: "Lifeline Animation Demo",
    features: [
      "Gradient Lifeline",
      "ECG Waveform",
      "Sparkline",
      "Pulsing Heart",
    ],
  });

  ConsoleStyler.logSection("💓 Lifeline Animation Showcase", "brightCyan", "heavy");
  console.log("");

  // Simulate different load levels
  const loadLevels = [
    { name: "Low Load", cpu: 20, memory: 30 },
    { name: "Medium Load", cpu: 50, memory: 60 },
    { name: "High Load", cpu: 85, memory: 90 },
  ];

  for (let round = 0; round < 3; round++) {
    for (const load of loadLevels) {
      console.clear();
      ConsoleStyler.logSection("💓 Lifeline Animation Showcase", "brightCyan", "heavy");
      console.log("");

      // Display load level
      const loadColor = load.cpu > 70 ? "brightRed" : load.cpu > 50 ? "orange" : "brightGreen";
      ConsoleStyler.logCustom(
        `${load.name} - CPU: ${load.cpu}%, Memory: ${load.memory}%`,
        "📊",
        loadColor,
      );
      console.log("");

      // 1. Gradient Lifeline (default)
      ConsoleStyler.logInfo("1. Gradient Lifeline (Recommended)");
      const gradientLine = animator.renderGradientLifeline(load.cpu, load.memory);
      console.log(`   ${gradientLine}`);
      console.log("");

      // 2. ECG Waveform
      ConsoleStyler.logInfo("2. ECG Waveform");
      const ecgLine = animator.render(load.cpu, load.memory);
      console.log(`   ${ecgLine}`);
      console.log("");

      // 3. Sparkline
      ConsoleStyler.logInfo("3. Sparkline");
      const sparkline = animator.renderSparkline(load.cpu, load.memory);
      console.log(`   ${sparkline}`);
      console.log("");

      // 4. Pulsing Heart
      ConsoleStyler.logInfo("4. Pulsing Heart");
      const heart = animator.renderPulsingHeart(load.cpu, load.memory);
      console.log(`   ${heart}  System Vitals`);
      console.log("");

      // Show color coding explanation
      if (round === 0 && load.name === "Low Load") {
        ConsoleStyler.logBox(
          [
            "Animation features:",
            "• Wave patterns animate smoothly across the screen",
            "• Colors change based on system load (green → yellow → red)",
            "• Animation speed increases with CPU usage",
            "• Heart pulses faster under heavy load",
          ],
          "ℹ️  How It Works",
          "info",
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("");
  ConsoleStyler.logSuccess("Demo complete! Use any style in your monitor.");
  console.log("");
  ConsoleStyler.logBox(
    [
      "To change the animation style, edit main.ts:",
      "",
      "Option 1: renderGradientLifeline() - Smooth gradient waves (default)",
      "Option 2: render() - Classic ECG heartbeat pattern",
      "Option 3: renderSparkline() - Compact sparkline bars",
      "Option 4: renderPulsingHeart() - Simple pulsing heart emoji",
      "",
      "Mix and match for your preferred style!",
    ],
    "🎨 Customization",
    "info",
  );
}

if (import.meta.main) {
  await demoLifelineAnimations();
}
