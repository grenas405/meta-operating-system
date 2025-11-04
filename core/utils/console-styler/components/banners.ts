// components/banners.ts
import { ColorSystem } from "../core/colors.ts";
import { Formatter } from "../core/formatter.ts";

export interface BannerOptions {
  title: string;
  content: string;
  subtitle?: string;
  version?: string;
  author?: string;
  description?: string;
  width?: number;
  padding?: number;
  style?: "single" | "double" | "bold";
  color?: string;
}

export class BannerRenderer {
  /**
   * Render application banner
   */
  static render(options: BannerOptions): void {
    const {
      title,
      content,
      subtitle,
      version,
      author,
      description,
      width = 80,
      style = "double",
      color = ColorSystem.codes.cyan,
    } = options;

    const chars = style === "double"
      ? { h: "═", v: "║", tl: "╔", tr: "╗", bl: "╚", br: "╝" }
      : style === "bold"
      ? { h: "━", v: "┃", tl: "┏", tr: "┓", bl: "┗", br: "┛" }
      : { h: "─", v: "│", tl: "┌", tr: "┐", bl: "└", br: "┘" };

    const contentWidth = width - 4;

    // Top border
    const topBorder = chars.tl + chars.h.repeat(width - 2) + chars.tr;
    console.log(ColorSystem.colorize(topBorder, color));

    // Empty line
    console.log(
      ColorSystem.colorize(chars.v + " ".repeat(width - 2) + chars.v, color),
    );

    // Title (centered)
    const titlePadding = Math.floor((contentWidth - title.length) / 2);
    const titleLine = chars.v + " " +
      " ".repeat(titlePadding) +
      ColorSystem.colorize(title, ColorSystem.codes.bright) +
      " ".repeat(contentWidth - titlePadding - title.length) +
      " " + chars.v;
    console.log(ColorSystem.colorize(titleLine, color));

    if (subtitle) {
      const subtitlePadding = Math.floor((contentWidth - subtitle.length) / 2);
      const subtitleLine = chars.v + " " +
        " ".repeat(subtitlePadding) +
        subtitle +
        " ".repeat(contentWidth - subtitlePadding - subtitle.length) +
        " " + chars.v;
      console.log(ColorSystem.colorize(subtitleLine, color));
    }

    if (description) {
      console.log(
        ColorSystem.colorize(chars.v + " ".repeat(width - 2) + chars.v, color),
      );
      const descPadding = Math.floor((contentWidth - description.length) / 2);
      const descLine = chars.v + " " +
        " ".repeat(descPadding) +
        description +
        " ".repeat(contentWidth - descPadding - description.length) +
        " " + chars.v;
      console.log(ColorSystem.colorize(descLine, color));
    }

    // Empty line
    console.log(
      ColorSystem.colorize(chars.v + " ".repeat(width - 2) + chars.v, color),
    );

    // Version and author
    if (version || author) {
      let infoLine = "";
      if (version) infoLine += `Version: ${version}`;
      if (version && author) infoLine += " • ";
      if (author) infoLine += `Author: ${author}`;

      const infoPadding = Math.floor((contentWidth - infoLine.length) / 2);
      const infoLineStr = chars.v + " " +
        " ".repeat(infoPadding) +
        ColorSystem.colorize(infoLine, ColorSystem.codes.dim) +
        " ".repeat(contentWidth - infoPadding - infoLine.length) +
        " " + chars.v;
      console.log(ColorSystem.colorize(infoLineStr, color));

      // Empty line
      console.log(
        ColorSystem.colorize(chars.v + " ".repeat(width - 2) + chars.v, color),
      );
    }

    // Bottom border
    const bottomBorder = chars.bl + chars.h.repeat(width - 2) + chars.br;
    console.log(ColorSystem.colorize(bottomBorder, color));
  }

  /**
   * Render simple text banner
   */
  static simple(text: string, color?: string): void {
    const lines = [
      `╔${"═".repeat(text.length + 2)}╗`,
      `║ ${text} ║`,
      `╚${"═".repeat(text.length + 2)}╝`,
    ];

    lines.forEach((line) => {
      if (color) {
        console.log(ColorSystem.colorize(line, color));
      } else {
        console.log(line);
      }
    });
  }
}
