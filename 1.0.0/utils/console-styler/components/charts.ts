// components/charts.ts
import { ColorSystem } from "../core/colors.ts";
import { Formatter } from "../core/formatter.ts";

export interface ChartData {
  label: string;
  value: number;
}

export interface ChartOptions {
  width?: number;
  height?: number;
  showValues?: boolean;
  showLabels?: boolean;
  colorize?: boolean;
  color?: string;
}

export class ChartRenderer {
  /**
   * Render bar chart
   */
  static barChart(data: ChartData[], options: ChartOptions = {}): void {
    const {
      width = 50,
      showValues = true,
      showLabels = true,
      colorize = true,
      color = ColorSystem.codes.blue,
    } = options;

    if (data.length === 0) {
      console.log("No data to display");
      return;
    }

    const maxValue = Math.max(...data.map((d) => d.value));
    const maxLabelLength = Math.max(...data.map((d) => d.label.length));

    data.forEach((item) => {
      const barLength = Math.round((item.value / maxValue) * width);
      let bar = "█".repeat(barLength);

      if (colorize) {
        bar = ColorSystem.colorize(bar, color);
      }

      let line = "";

      if (showLabels) {
        line += Formatter.pad(item.label, maxLabelLength + 1);
      }

      line += bar;

      if (showValues) {
        line += ` ${item.value}`;
      }

      console.log(line);
    });
  }

  /**
   * Render sparkline
   */
  static sparkline(data: number[]): string {
    if (data.length === 0) return "";

    const chars = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;

    if (range === 0) return chars[0].repeat(data.length);

    return data.map((value) => {
      const normalized = (value - min) / range;
      const index = Math.floor(normalized * (chars.length - 1));
      return chars[index];
    }).join("");
  }

  /**
   * Render line chart (simple ASCII)
   */
  static lineChart(data: number[], options: ChartOptions = {}): void {
    const {
      width = data.length,
      height = 10,
      colorize = true,
    } = options;

    if (data.length === 0) {
      console.log("No data to display");
      return;
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;

    // Create grid
    const grid: string[][] = Array(height).fill(null)
      .map(() => Array(width).fill(" "));

    // Plot points
    data.forEach((value, x) => {
      if (x >= width) return;

      const normalizedValue = range === 0 ? 0.5 : (value - min) / range;
      const y = Math.round((1 - normalizedValue) * (height - 1));

      grid[y][x] = "●";

      // Connect with lines
      if (x > 0) {
        const prevValue = data[x - 1];
        const prevNormalized = range === 0 ? 0.5 : (prevValue - min) / range;
        const prevY = Math.round((1 - prevNormalized) * (height - 1));

        const startY = Math.min(y, prevY);
        const endY = Math.max(y, prevY);

        for (let i = startY; i <= endY; i++) {
          if (grid[i][x] === " ") {
            grid[i][x] = "│";
          }
        }
      }
    });

    // Draw grid
    grid.forEach((row, i) => {
      const line = row.join("");
      if (colorize) {
        console.log(ColorSystem.colorize(line, ColorSystem.codes.cyan));
      } else {
        console.log(line);
      }
    });

    // Draw axis
    console.log("└" + "─".repeat(width) + "┘");
  }

  /**
   * Render pie chart (ASCII)
   */
  static pieChart(data: ChartData[], options: ChartOptions = {}): void {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    const slices = ["○", "◔", "◑", "◕", "●"];

    data.forEach((item) => {
      const percentage = (item.value / total) * 100;
      const sliceIndex = Math.floor((percentage / 100) * (slices.length - 1));
      const slice = slices[sliceIndex];

      console.log(
        `${slice} ${Formatter.pad(item.label, 20)} ${
          percentage.toFixed(1)
        }% (${item.value})`,
      );
    });
  }
}
