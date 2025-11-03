// components/tables.ts
import { ColorSystem } from "../core/colors.ts";
import { Formatter } from "../core/formatter.ts";
import { Theme } from "../core/config.ts";

export interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: "left" | "center" | "right";
  formatter?: (value: any) => string;
}

export interface TableOptions {
  maxWidth?: number;
  showIndex?: boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  theme?: Theme;
  colorize?: boolean;
}

export class TableRenderer {
  /**
   * Render table
   */
  static render(
    data: Record<string, any>[],
    columns?: TableColumn[],
    options: TableOptions = {},
  ): void {
    if (data.length === 0) {
      console.log("No data to display");
      return;
    }

    const {
      maxWidth = 120,
      showIndex = false,
      sortBy,
      sortOrder = "asc",
      colorize = true,
    } = options;

    // Process data
    let processedData = [...data];

    // Sort if needed
    if (sortBy) {
      processedData.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortOrder === "desc" ? -comparison : comparison;
      });
    }

    // Determine columns
    const keys = columns?.map((c) => c.key) || Object.keys(processedData[0]);
    const labels = columns?.map((c) => c.label) || keys;
    const formatters = columns?.reduce((acc, col) => {
      if (col.formatter) acc[col.key] = col.formatter;
      return acc;
    }, {} as Record<string, (value: any) => string>) || {};

    // Add index column if needed
    if (showIndex) {
      keys.unshift("#");
      labels.unshift("#");
      processedData = processedData.map((row, i) => ({ "#": i + 1, ...row }));
    }

    // Calculate column widths
    const columnWidths = keys.map((key, i) => {
      const label = labels[i];
      const values = processedData.map((row) => {
        const value = row[key];
        const formatted = formatters[key]
          ? formatters[key](value)
          : String(value ?? "");
        return ColorSystem.visibleLength(formatted);
      });
      return Math.min(
        Math.max(label.length, ...values),
        Math.floor(maxWidth / keys.length),
      );
    });

    // Draw table
    this.drawTopBorder(columnWidths, colorize);
    this.drawHeaderRow(labels, columnWidths, colorize);
    this.drawSeparator(columnWidths, colorize);

    processedData.forEach((row, index) => {
      this.drawDataRow(row, keys, columnWidths, formatters, index, colorize);
    });

    this.drawBottomBorder(columnWidths, colorize);
  }

  private static drawTopBorder(widths: number[], colorize: boolean): void {
    const line = widths.map((w) => "─".repeat(w)).join("─┬─");
    const border = `┌─${line}─┐`;
    console.log(
      colorize ? ColorSystem.colorize(border, ColorSystem.codes.dim) : border,
    );
  }

  private static drawBottomBorder(widths: number[], colorize: boolean): void {
    const line = widths.map((w) => "─".repeat(w)).join("─┴─");
    const border = `└─${line}─┘`;
    console.log(
      colorize ? ColorSystem.colorize(border, ColorSystem.codes.dim) : border,
    );
  }

  private static drawSeparator(widths: number[], colorize: boolean): void {
    const line = widths.map((w) => "─".repeat(w)).join("─┼─");
    const separator = `├─${line}─┤`;
    console.log(
      colorize
        ? ColorSystem.colorize(separator, ColorSystem.codes.dim)
        : separator,
    );
  }

  private static drawHeaderRow(
    labels: string[],
    widths: number[],
    colorize: boolean,
  ): void {
    const cells = labels.map((label, i) =>
      Formatter.tableCell(label, widths[i], "center")
    );
    const row = cells.join(" │ ");
    const fullRow = `│ ${row} │`;
    console.log(
      colorize
        ? ColorSystem.colorize(fullRow, ColorSystem.codes.bright)
        : fullRow,
    );
  }

  private static drawDataRow(
    row: Record<string, any>,
    keys: string[],
    widths: number[],
    formatters: Record<string, (value: any) => string>,
    index: number,
    colorize: boolean,
  ): void {
    const cells = keys.map((key, i) => {
      const value = row[key];
      const formatted = formatters[key]
        ? formatters[key](value)
        : String(value ?? "");
      return Formatter.tableCell(formatted, widths[i]);
    });

    const rowStr = cells.join(" │ ");
    const fullRow = `│ ${rowStr} │`;

    if (colorize && index % 2 === 1) {
      console.log(ColorSystem.colorize(fullRow, ColorSystem.codes.dim));
    } else {
      console.log(fullRow);
    }
  }

  /**
   * Simple key-value table
   */
  static renderKeyValue(
    data: Array<{ label: string; value: any }>,
    options: { colorize?: boolean } = {},
  ): void {
    const { colorize = true } = options;

    const labelWidth = Math.max(...data.map((d) => d.label.length));
    const valueWidth = Math.max(...data.map((d) => String(d.value).length));

    this.drawTopBorder([labelWidth, valueWidth], colorize);

    data.forEach((item, index) => {
      const label = Formatter.pad(item.label, labelWidth);
      const value = Formatter.pad(String(item.value), valueWidth);

      const labelColored = colorize
        ? ColorSystem.colorize(label, ColorSystem.codes.cyan)
        : label;
      const valueColored = colorize
        ? ColorSystem.colorize(value, ColorSystem.codes.bright)
        : value;

      console.log(`│ ${labelColored} │ ${valueColored} │`);
    });

    this.drawBottomBorder([labelWidth, valueWidth], colorize);
  }
}
