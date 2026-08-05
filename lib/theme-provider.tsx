import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View, useColorScheme as useSystemColorScheme } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import { SchemeColors, type ColorScheme } from "@/constants/theme";

type ThemeContextValue = {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemColorScheme() ?? "light";
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(systemScheme);

  const applyScheme = useCallback((scheme: ColorScheme) => {
    nativewindColorScheme.set(scheme);
    Appearance.setColorScheme?.(scheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = scheme;
      root.classList.toggle("dark", scheme === "dark");
      const palette = SchemeColors[scheme];
      Object.entries(palette).forEach(([token, value]) => {
        root.style.setProperty(`--color-${token}`, value);
      });
    }
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setColorSchemeState(scheme);
    applyScheme(scheme);
  }, [applyScheme]);

  useEffect(() => {
    applyScheme(colorScheme);
  }, [applyScheme, colorScheme]);

  // Material 3 Expressive: full token injection
  const themeVariables = useMemo(
    () =>
      vars({
        // Core Material 3 roles
        "color-primary": SchemeColors[colorScheme].primary,
        "color-on-primary": SchemeColors[colorScheme].onPrimary,
        "color-primary-container": SchemeColors[colorScheme].primaryContainer,
        "color-on-primary-container": SchemeColors[colorScheme].onPrimaryContainer,
        "color-secondary": SchemeColors[colorScheme].secondary,
        "color-on-secondary": SchemeColors[colorScheme].onSecondary,
        "color-secondary-container": SchemeColors[colorScheme].secondaryContainer,
        "color-on-secondary-container": SchemeColors[colorScheme].onSecondaryContainer,
        "color-tertiary": SchemeColors[colorScheme].tertiary,
        "color-on-tertiary": SchemeColors[colorScheme].onTertiary,
        "color-tertiary-container": SchemeColors[colorScheme].tertiaryContainer,
        "color-on-tertiary-container": SchemeColors[colorScheme].onTertiaryContainer,
        "color-error": SchemeColors[colorScheme].error,
        "color-on-error": SchemeColors[colorScheme].onError,
        "color-error-container": SchemeColors[colorScheme].errorContainer,
        "color-on-error-container": SchemeColors[colorScheme].onErrorContainer,
        // Surface system
        "color-background": SchemeColors[colorScheme].background,
        "color-on-background": SchemeColors[colorScheme].onBackground,
        "color-surface": SchemeColors[colorScheme].surface,
        "color-on-surface": SchemeColors[colorScheme].onSurface,
        "color-surface-variant": SchemeColors[colorScheme].surfaceVariant,
        "color-on-surface-variant": SchemeColors[colorScheme].onSurfaceVariant,
        "color-surface-container": SchemeColors[colorScheme].surfaceContainer,
        "color-surface-container-low": SchemeColors[colorScheme].surfaceContainerLow,
        "color-surface-container-high": SchemeColors[colorScheme].surfaceContainerHigh,
        // Outlines
        "color-outline": SchemeColors[colorScheme].border,
        "color-outline-variant": SchemeColors[colorScheme].onSurfaceVariant,
        // Legacy aliases for backward compatibility
        "color-foreground": SchemeColors[colorScheme].onBackground,
        "color-muted": SchemeColors[colorScheme].onSurfaceVariant,
        "color-border": SchemeColors[colorScheme].border,
        "color-success": SchemeColors[colorScheme].success,
        "color-warning": SchemeColors[colorScheme].warning,
      }),
    [colorScheme],
  );

  const value = useMemo(
    () => ({
      colorScheme,
      setColorScheme,
    }),
    [colorScheme, setColorScheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVariables]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return ctx;
}
