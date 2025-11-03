// components/boxes.ts
import { ColorSystem } from "../core/colors.ts";
import { Formatter } from "../core/formatter.ts";

export type BoxStyle = "single" | "double" | "rounded" | "bold" | "minimal";

export interface BoxOptions {
  style?: BoxStyle;
  padding?: number;
  margin?: number;
  title?: string;
  color?: string;
  align?: "left" | "center" | "right";
  minWidth?: number;
  maxWidth?: number;
}

export class BoxRenderer {
  private static readonly styles = {
    single: { tl: "┌", tr: "┐", bl: "└", br: "┘", h: "─", v: "│" },
    double: { tl: "╔", tr: "╗", bl: "╚", br: "╝", h: "═", v: "║" },
    rounded: { tl: "╭", tr: "╮", bl: "╰", br: "╯", h: "─", v: "│" },
    bold: { tl: "┏", tr: "┓", bl: "┗", br: "┛", h: "━", v: "┃" },
    minimal: { tl: "+", tr: "+", bl: "+", br: "+", h: "-", v: "|" },
  };

  /**
   * Render box with content
   */
  static render(content: string | string[], options: BoxOptions = {}): void {
    const {
      style = "single",
      padding = 1,
      margin = 0,
      title,
      color,
      align = "left",
      minWidth = 0,
      maxWidth = 80,
    } = options;

    const chars = this.styles[style];
    const lines = Array.isArray(content) ? content : [content];

    // Calculate content width
    const contentWidth = Math.max(
      minWidth,
      Math.min(
        maxWidth,
        Math.max(...lines.map((line) => ColorSystem.visibleLength(line))),
      ),
    );

    const innerWidth = contentWidth + (padding * 2);
    const totalWidth = innerWidth + 2;

    // Apply margin
    const marginStr = " ".repeat(margin);

    // Top border
    let topBorder = chars.tl + chars.h.repeat(innerWidth) + chars.tr;
    if (title) {
      const titleStr = ` ${title} `;
      const titlePos = Math.floor((innerWidth - titleStr.length) / 2);
      topBorder = chars.tl + chars.h.repeat(titlePos) + titleStr +
        chars.h.repeat(innerWidth - titlePos - titleStr.length) + chars.tr;
    }

    this.printLine(marginStr + topBorder, color);

    // Empty padding rows
    for (let i = 0; i < padding; i++) {
      const emptyLine = chars.v + " ".repeat(innerWidth) + chars.v;
      this.printLine(marginStr + emptyLine, color);
    }

    // Content
    for (const line of lines) {
      const paddedLine = " ".repeat(padding) +
        Formatter.pad(line, contentWidth, align) +
        " ".repeat(padding);
      const fullLine = chars.v + paddedLine + chars.v;
      this.printLine(marginStr + fullLine, color);
    }

    // Empty padding rows
    for (let i = 0; i < padding; i++) {
      const emptyLine = chars.v + " ".repeat(innerWidth) + chars.v;
      this.printLine(marginStr + emptyLine, color);
    }

    // Bottom border
    const bottomBorder = chars.bl + chars.h.repeat(innerWidth) + chars.br;
    this.printLine(marginStr + bottomBorder, color);
  }

  private static printLine(line: string, color?: string): void {
    if (color) {
      console.log(ColorSystem.colorize(line, color));
    } else {
      console.log(line);
    }
  }

  /**
   * Render simple box with message
   */
  static message(
    message: string,
    type: "info" | "success" | "warning" | "error" = "info",
  ): void {
    const colorMap = {
      info: ColorSystem.codes.blue,
      success: ColorSystem.codes.green,
      warning: ColorSystem.codes.yellow,
      error: ColorSystem.codes.red,
    };

    const symbolMap = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
    };

    this.render(`${symbolMap[type]} ${message}`, {
      style: "rounded",
      color: colorMap[type],
      padding: 1,
    });
  }
}
