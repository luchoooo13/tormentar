import { Colors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useColorScheme } from "./use-color-scheme";

/**
 * Returns the current theme's color palette with Material 3 Expressive tokens.
 * Usage: const colors = useColors(); then colors.primary, colors.surfaceContainer, etc.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  const colorSchema = useColorScheme();
  const scheme = (colorSchemeOverride ?? colorSchema ?? "light") as ColorScheme;
  return Colors[scheme];
}
