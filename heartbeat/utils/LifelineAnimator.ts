import { ConsoleStyler } from "./console-styler/ConsoleStyler.ts";

/**
 * LifelineAnimator - Creates elegant ECG-style heartbeat animations
 * that pulse with system activity
 */
export class LifelineAnimator {
  private frame = 0;
  private readonly frames: string[];
  private readonly width: number;

  constructor(width: number = 60) {
    this.width = width;
    this.frames = this.generateECGFrames();
  }

  /**
   * Generates smooth ECG/heartbeat waveform frames
   */
  private generateECGFrames(): string[] {
    // ECG pattern points (normalized 0-1)
    const ecgPattern = [
      0.5,
      0.5,
      0.5,
      0.5,
      0.52,
      0.55,
      0.5,
      0.45,
      0.5, // P wave (atrial depolarization)
      0.5,
      0.5,
      0.5, // PR segment
      0.5,
      0.48,
      0.3,
      0.7,
      0.95,
      0.4,
      0.5, // QRS complex (ventricular depolarization)
      0.5,
      0.5, // ST segment
      0.5,
      0.52,
      0.58,
      0.6,
      0.58,
      0.52,
      0.5, // T wave (ventricular repolarization)
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5,
      0.5, // baseline
    ];

    const frames: string[] = [];
    const totalFrames = 40;

    // Generate frames by sliding window through the pattern
    for (let f = 0; f < totalFrames; f++) {
      let line = "";
      for (let i = 0; i < this.width; i++) {
        const patternIndex = (i + f) % ecgPattern.length;
        const value = ecgPattern[patternIndex];

        // Convert to character based on height
        if (value > 0.85) {
          line += "█";
        } else if (value > 0.75) {
          line += "▓";
        } else if (value > 0.65) {
          line += "▒";
        } else if (value > 0.55) {
          line += "░";
        } else if (value < 0.35) {
          line += "▁";
        } else if (value < 0.45) {
          line += "▂";
        } else {
          line += "─";
        }
      }
      frames.push(line);
    }

    return frames;
  }

  /**
   * Renders the current frame with color based on system load
   * @param cpuUsage CPU usage percentage (0-100)
   * @param memoryUsage Memory usage percentage (0-100)
   */
  render(cpuUsage: number, memoryUsage: number): string {
    const currentFrame = this.frames[this.frame % this.frames.length];

    // Determine color based on max usage
    const maxUsage = Math.max(cpuUsage, memoryUsage);
    let color: string;

    if (maxUsage > 80) {
      color = ConsoleStyler.colors256.brightRed;
    } else if (maxUsage > 60) {
      color = ConsoleStyler.colors256.orange;
    } else if (maxUsage > 40) {
      color = ConsoleStyler.colors256.lightYellow;
    } else {
      color = ConsoleStyler.colors256.brightGreen;
    }

    // Advance frame (speed based on CPU usage - faster when busy)
    const frameSkip = cpuUsage > 70 ? 2 : 1;
    this.frame += frameSkip;

    return `${color}${currentFrame}${ConsoleStyler.colors.reset}`;
  }

  /**
   * Renders a simple pulsing heart emoji that changes with system load
   * @param cpuUsage CPU usage percentage (0-100)
   * @param memoryUsage Memory usage percentage (0-100)
   */
  renderPulsingHeart(cpuUsage: number, memoryUsage: number): string {
    const maxUsage = Math.max(cpuUsage, memoryUsage);

    // Cycle through different heart states for pulse effect
    const pulseStates = ["💗", "💓", "💗", "💖"];
    const currentState =
      pulseStates[Math.floor(this.frame / 3) % pulseStates.length];

    // Speed up pulse based on usage
    const frameSkip = maxUsage > 70 ? 2 : maxUsage > 40 ? 1.5 : 1;
    this.frame += frameSkip;

    return currentState;
  }

  /**
   * Renders a compact sparkline-style lifeline
   * @param cpuUsage CPU usage percentage (0-100)
   * @param memoryUsage Memory usage percentage (0-100)
   */
  renderSparkline(cpuUsage: number, memoryUsage: number): string {
    const bars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    const maxUsage = Math.max(cpuUsage, memoryUsage);

    // Create a wave pattern that varies with load
    let line = "";
    for (let i = 0; i < 30; i++) {
      const offset = this.frame + i;
      const wave = Math.sin(offset * 0.3) * 0.5 + 0.5; // 0-1
      const load = maxUsage / 100;
      const height = wave * load;
      const barIndex = Math.floor(height * (bars.length - 1));
      line += bars[barIndex];
    }

    // Color based on load
    let color: string;
    if (maxUsage > 80) {
      color = ConsoleStyler.colors256.brightRed;
    } else if (maxUsage > 60) {
      color = ConsoleStyler.colors256.orange;
    } else {
      color = ConsoleStyler.colors256.brightCyan;
    }

    this.frame += 1;

    return `${color}${line}${ConsoleStyler.colors.reset}`;
  }

  /**
   * Renders an artistic lifeline with gradient effect
   * @param cpuUsage CPU usage percentage (0-100)
   * @param memoryUsage Memory usage percentage (0-100)
   */
  renderGradientLifeline(cpuUsage: number, memoryUsage: number): string {
    const chars = ["⡀", "⡄", "⡆", "⡇", "⣇", "⣧", "⣷", "⣿"];
    const width = 50;
    let line = "";

    const maxUsage = Math.max(cpuUsage, memoryUsage);

    for (let i = 0; i < width; i++) {
      const x = (i + this.frame) / 8;
      // Create a more complex waveform
      const wave1 = Math.sin(x * 0.5) * 0.3;
      const wave2 = Math.sin(x * 1.2 + Math.PI / 4) * 0.2;
      const wave3 = Math.sin(x * 2.0 + Math.PI / 2) * 0.1;
      const combined = (wave1 + wave2 + wave3 + 0.6) * (maxUsage / 100);

      const charIndex = Math.floor(combined * (chars.length - 1));
      const clampedIndex = Math.max(0, Math.min(chars.length - 1, charIndex));

      // Color gradient from green to red
      let color: string;
      const position = i / width;
      if (position < 0.33) {
        color = ConsoleStyler.colors256.brightCyan;
      } else if (position < 0.66) {
        color = maxUsage > 60
          ? ConsoleStyler.colors256.orange
          : ConsoleStyler.colors256.brightGreen;
      } else {
        color = maxUsage > 80
          ? ConsoleStyler.colors256.brightRed
          : ConsoleStyler.colors256.brightGreen;
      }

      line += `${color}${chars[clampedIndex]}${ConsoleStyler.colors.reset}`;
    }

    this.frame += maxUsage > 70 ? 2 : 1;

    return line;
  }

  /**
   * Reset the animation frame counter
   */
  reset(): void {
    this.frame = 0;
  }
}
