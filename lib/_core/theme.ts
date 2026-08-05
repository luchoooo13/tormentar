import { Platform } from "react-native";
import themeConfig from "@/theme.config";

export type ColorScheme = "light" | "dark";

export const ThemeColors = themeConfig.themeColors;

type ThemeColorTokens = typeof ThemeColors;
type ThemeColorName = keyof ThemeColorTokens;
type SchemePalette = Record<ColorScheme, Record<ThemeColorName, string>>;
type SchemePaletteItem = SchemePalette[ColorScheme];

function buildSchemePalette(colors: ThemeColorTokens): SchemePalette {
  const palette: SchemePalette = {
    light: {} as SchemePalette["light"],
    dark: {} as SchemePalette["dark"],
  };

  (Object.keys(colors) as ThemeColorName[]).forEach((name) => {
    const swatch = colors[name];
    palette.light[name] = swatch.light;
    palette.dark[name] = swatch.dark;
  });

  return palette;
}

export const SchemeColors = buildSchemePalette(ThemeColors);

type RuntimePalette = SchemePaletteItem & {
  text: string;
  background: string;
  tint: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  border: string;
  // Material 3 Expressive extras
  surfaceContainer: string;
  surfaceContainerLow: string;
  surfaceContainerHigh: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  errorContainer: string;
  onErrorContainer: string;
  outline: string;
  outlineVariant: string;
};

function buildRuntimePalette(scheme: ColorScheme): RuntimePalette {
  const base = SchemeColors[scheme];
  return {
    ...base,
    text: base.onBackground,
    background: base.background,
    tint: base.primary,
    icon: base.onSurfaceVariant,
    tabIconDefault: base.onSurfaceVariant,
    tabIconSelected: base.primary,
    border: base.outline ?? base.border,
    surfaceContainer: base.surfaceContainer,
    surfaceContainerLow: base.surfaceContainerLow,
    surfaceContainerHigh: base.surfaceContainerHigh,
    surfaceVariant: base.surfaceVariant,
    onSurfaceVariant: base.onSurfaceVariant,
    primaryContainer: base.primaryContainer,
    onPrimaryContainer: base.onPrimaryContainer,
    secondaryContainer: base.secondaryContainer,
    onSecondaryContainer: base.onSecondaryContainer,
    tertiaryContainer: base.tertiaryContainer,
    onTertiaryContainer: base.onTertiaryContainer,
    errorContainer: base.errorContainer,
    onErrorContainer: base.onErrorContainer,
    outline: base.outline ?? base.border,
    outlineVariant: base.onSurfaceVariant,
  };
}

export const Colors = {
  light: buildRuntimePalette("light"),
  dark: buildRuntimePalette("dark"),
} satisfies Record<ColorScheme, RuntimePalette>;

export type ThemeColorPalette = (typeof Colors)[ColorScheme];

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "'Google Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'Google Sans Rounded', 'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Material 3 Expressive Shape Tokens (border radius)
export const ShapeRadius = {
  none: 0,
  extraSmall: 4,
  small: 8,
  medium: 12,
  large: 16,
  extraLarge: 28,
  full: 999,
} as const;

// Material 3 Expressive Elevation Tokens (shadows)
export const Elevation = {
  0: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  1: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  2: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  3: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  4: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  5: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export type ElevationLevel = keyof typeof Elevation;
