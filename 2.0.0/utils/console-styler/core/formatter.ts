// core/formatter.ts
import { ColorSystem } from "./colors.ts";

export class Formatter {
  /**
   * Format bytes in human-readable form
   */
  static bytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
  }

  /**
   * Format duration in human-readable form
   */
  static duration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    }
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  /**
   * Format number with thousands separator
   */
  static number(num: number, locale = "en-US"): string {
    return new Intl.NumberFormat(locale).format(num);
  }

  /**
   * Format currency
   */
  static currency(amount: number, currency = "USD", locale = "en-US"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  }

  /**
   * Format percentage
   */
  static percentage(value: number, decimals = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Format relative time
   */
  static relativeTime(date: Date, locale = "en-US"): string {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const diff = date.getTime() - Date.now();
    const absDiff = Math.abs(diff);

    if (absDiff < 60000) return rtf.format(Math.round(diff / 1000), "second");
    if (absDiff < 3600000) {
      return rtf.format(Math.round(diff / 60000), "minute");
    }
    if (absDiff < 86400000) {
      return rtf.format(Math.round(diff / 3600000), "hour");
    }
    if (absDiff < 2592000000) {
      return rtf.format(Math.round(diff / 86400000), "day");
    }
    if (absDiff < 31536000000) {
      return rtf.format(Math.round(diff / 2592000000), "month");
    }
    return rtf.format(Math.round(diff / 31536000000), "year");
  }

  /**
   * Truncate string with ellipsis
   */
  static truncate(str: string, maxLength: number, ellipsis = "..."): string {
    // Account for ANSI codes when truncating
    const visible = ColorSystem.strip(str);
    if (visible.length <= maxLength) return str;

    const truncated = visible.substring(0, maxLength - ellipsis.length);
    return truncated + ellipsis;
  }

  /**
   * Wrap text to fit width
   */
  static wrap(text: string, width: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (ColorSystem.visibleLength(testLine) > width) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }

  /**
   * Pad string to width (accounting for ANSI codes)
   */
  static pad(
    text: string,
    width: number,
    align: "left" | "center" | "right" = "left",
  ): string {
    const visibleLen = ColorSystem.visibleLength(text);
    const padding = width - visibleLen;

    if (padding <= 0) return text;

    if (align === "left") {
      return text + " ".repeat(padding);
    } else if (align === "right") {
      return " ".repeat(padding) + text;
    } else {
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return " ".repeat(leftPad) + text + " ".repeat(rightPad);
    }
  }

  /**
   * Format timestamp
   */
  static timestamp(date: Date, format = "HH:mm:ss"): string {
    const pad = (n: number) => n.toString().padStart(2, "0");

    const tokens: Record<string, string> = {
      "YYYY": date.getFullYear().toString(),
      "MM": pad(date.getMonth() + 1),
      "DD": pad(date.getDate()),
      "HH": pad(date.getHours()),
      "mm": pad(date.getMinutes()),
      "ss": pad(date.getSeconds()),
      "SSS": date.getMilliseconds().toString().padStart(3, "0"),
    };

    let result = format;
    for (const [token, value] of Object.entries(tokens)) {
      result = result.replace(token, value);
    }

    return result;
  }

  /**
   * Format JSON with syntax highlighting
   */
  static json(obj: any, indent = 2, colorize = true): string {
    const json = JSON.stringify(obj, null, indent);

    if (!colorize) return json;

    return json
      .replace(
        /"([^"]+)":/g,
        `${ColorSystem.codes.cyan}"$1"${ColorSystem.codes.reset}:`,
      )
      .replace(
        /: "([^"]*)"/g,
        `: ${ColorSystem.codes.green}"$1"${ColorSystem.codes.reset}`,
      )
      .replace(
        /: (-?\d+\.?\d*)/g,
        `: ${ColorSystem.codes.yellow}$1${ColorSystem.codes.reset}`,
      )
      .replace(
        /: (true|false|null)/g,
        `: ${ColorSystem.codes.magenta}$1${ColorSystem.codes.reset}`,
      );
  }

  /**
   * Format table cell
   */
  static tableCell(
    value: any,
    width: number,
    align: "left" | "center" | "right" = "left",
  ): string {
    const str = String(value ?? "");
    const truncated = this.truncate(str, width);
    return this.pad(truncated, width, align);
  }
}
