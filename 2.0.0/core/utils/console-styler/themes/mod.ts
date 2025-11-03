// themes/mod.ts
export { defaultTheme } from "./default.ts";
export { minimalTheme } from "./minimal.ts";
export { neonTheme } from "./neon.ts";
export { draculaTheme } from "./dracula.ts";
export type { Theme } from "./theme-interface.ts";

// Theme registry
import { Theme } from "./theme-interface.ts";
import { defaultTheme } from "./default.ts";
import { minimalTheme } from "./minimal.ts";
import { neonTheme } from "./neon.ts";
import { draculaTheme } from "./dracula.ts";

export const themes: Record<string, Theme> = {
  default: defaultTheme,
  minimal: minimalTheme,
  neon: neonTheme,
  dracula: draculaTheme,
};

export function getTheme(name: string): Theme | undefined {
  return themes[name];
}
