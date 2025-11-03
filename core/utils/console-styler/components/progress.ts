// components/progress.ts
import { ColorSystem } from "../core/colors.ts";

export interface ProgressBarOptions {
  total: number;
  width?: number;
  complete?: string;
  incomplete?: string;
  showPercentage?: boolean;
  showValue?: boolean;
  colorize?: boolean;
}

export class ProgressBar {
  private current = 0;

  constructor(private options: ProgressBarOptions) {
    this.options.width = options.width || 40;
    this.options.complete = options.complete || "█";
    this.options.incomplete = options.incomplete || "░";
    this.options.showPercentage = options.showPercentage ?? true;
    this.options.showValue = options.showValue ?? true;
    this.options.colorize = options.colorize ?? true;
  }

  /**
   * Update progress
   */
  update(current: number): void {
    this.current = Math.min(current, this.options.total);
    this.render();
  }

  /**
   * Increment progress
   */
  increment(amount = 1): void {
    this.update(this.current + amount);
  }

  /**
   * Complete progress
   */
  complete(): void {
    this.update(this.options.total);
    console.log(); // New line after completion
  }

  /**
   * Render progress bar
   */
  private render(): void {
    const {
      total,
      width,
      complete,
      incomplete,
      showPercentage,
      showValue,
      colorize,
    } = this.options;

    const percentage = Math.round((this.current / total) * 100);
    const filled = Math.round((this.current / total) * width!);
    const empty = width! - filled;

    let bar = complete!.repeat(filled) + incomplete!.repeat(empty);

    if (colorize) {
      const color = percentage < 33
        ? ColorSystem.codes.red
        : percentage < 66
        ? ColorSystem.codes.yellow
        : ColorSystem.codes.green;

      bar = ColorSystem.colorize(complete!.repeat(filled), color) +
        ColorSystem.colorize(incomplete!.repeat(empty), ColorSystem.codes.dim);
    }

    let info = "";
    if (showValue) {
      info += ` ${this.current}/${total}`;
    }
    if (showPercentage) {
      info += ` ${percentage}%`;
    }

    // Clear line and write
    Deno.stdout.writeSync(new TextEncoder().encode(`\r${bar}${info}`));
  }
}

export interface SpinnerOptions {
  message?: string;
  frames?: string[];
  interval?: number;
  colorize?: boolean;
}

export class Spinner {
  private static readonly defaultFrames = [
    "⠋",
    "⠙",
    "⠹",
    "⠸",
    "⠼",
    "⠴",
    "⠦",
    "⠧",
    "⠇",
    "⠏",
  ];
  private currentFrame = 0;
  private intervalId?: number;
  private message: string;

  constructor(private options: SpinnerOptions = {}) {
    this.message = options.message || "";
    this.options.frames = options.frames || Spinner.defaultFrames;
    this.options.interval = options.interval || 80;
    this.options.colorize = options.colorize ?? true;
  }

  /**
   * Start spinner
   */
  start(message?: string): void {
    if (message) this.message = message;

    // Hide cursor
    Deno.stdout.writeSync(new TextEncoder().encode("\x1B[?25l"));

    this.intervalId = setInterval(() => {
      this.render();
      this.currentFrame = (this.currentFrame + 1) % this.options.frames!.length;
    }, this.options.interval);
  }

  /**
   * Update message
   */
  update(message: string): void {
    this.message = message;
  }

  /**
   * Stop spinner
   */
  stop(finalMessage?: string): void {
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Clear line
    Deno.stdout.writeSync(new TextEncoder().encode("\r\x1B[K"));

    // Show cursor
    Deno.stdout.writeSync(new TextEncoder().encode("\x1B[?25h"));

    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  /**
   * Stop with success
   */
  succeed(message?: string): void {
    this.stop(`✅ ${message || this.message}`);
  }

  /**
   * Stop with error
   */
  fail(message?: string): void {
    this.stop(`❌ ${message || this.message}`);
  }

  /**
   * Render current frame
   */
  private render(): void {
    const frame = this.options.frames![this.currentFrame];
    let output = `${frame} ${this.message}`;

    if (this.options.colorize) {
      output = ColorSystem.colorize(output, ColorSystem.codes.cyan);
    }

    Deno.stdout.writeSync(new TextEncoder().encode(`\r${output}`));
  }
}
