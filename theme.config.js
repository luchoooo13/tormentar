/**
 * Material Design 3 Expressive Theme Configuration
 *
 * Material 3 usa un sistema de colores tonales con roles semánticos.
 * Este tema aplica una paleta "storm blue" (azul tormenta) como primario,
 * con tonos cálidos para las alertas de severidad.
 *
 * Roles de color Material 3:
 * - primary / onPrimary / primaryContainer / onPrimaryContainer
 * - secondary / onSecondary / secondaryContainer / onSecondaryContainer
 * - tertiary / onTertiary / tertiaryContainer / onTertiaryContainer
 * - error / onError / errorContainer / onErrorContainer
 * - surface / onSurface / surfaceVariant / onSurfaceVariant
 * - background / onBackground / outline / outlineVariant
 */

/** @type {const} */
const themeColors = {
  // Primary: azul tormenta vibrante
  primary: { light: '#21005D', dark: '#D0BCFF' },
  onPrimary: { light: '#FFFFFF', dark: '#381E72' },
  primaryContainer: { light: '#EADDFF', dark: '#4F378B' },
  onPrimaryContainer: { light: '#21005D', dark: '#EADDFF' },

  // Secondary: complementario para elementos secundarios
  secondary: { light: '#625B71', dark: '#CCC2DC' },
  onSecondary: { light: '#FFFFFF', dark: '#332D41' },
  secondaryContainer: { light: '#E8DEF8', dark: '#4A4458' },
  onSecondaryContainer: { light: '#1D192B', dark: '#E8DEF8' },

  // Tertiary: acento cálido para alertas
  tertiary: { light: '#7D5260', dark: '#EFB8C8' },
  onTertiary: { light: '#FFFFFF', dark: '#492532' },
  tertiaryContainer: { light: '#FFD8E4', dark: '#633B48' },
  onTertiaryContainer: { light: '#31111D', dark: '#FFD8E4' },

  // Surface tones: Material 3 surface system
  background: { light: '#FEF7FF', dark: '#1C1B1F' },
  onBackground: { light: '#1D1B20', dark: '#E6E1E5' },
  surface: { light: '#FEF7FF', dark: '#1C1B1F' },
  onSurface: { light: '#1D1B20', dark: '#E6E1E5' },
  surfaceVariant: { light: '#E7E0EC', dark: '#49454F' },
  onSurfaceVariant: { light: '#49454F', dark: '#CAC4D0' },
  surfaceContainerLow: { light: '#F7F2FA', dark: '#211F26' },
  surfaceContainer: { light: '#F3EDF7', dark: '#2B2930' },
  surfaceContainerHigh: { light: '#ECE6F0', dark: '#36343B' },

  // Error: rojo Material 3
  error: { light: '#B3261E', dark: '#F2B8B5' },
  onError: { light: '#FFFFFF', dark: '#601410' },
  errorContainer: { light: '#F9DEDC', dark: '#8C1D18' },
  onErrorContainer: { light: '#410E0B', dark: '#F9DEDC' },

  // Semantic alerts (para compatibilidad con el código existente)
  success: { light: '#388E3C', dark: '#A5D6A7' },
  warning: { light: '#F57C00', dark: '#FFB74D' },
  foreground: { light: '#1D1B20', dark: '#E6E1E5' },
  muted: { light: '#79747E', dark: '#A9A2AD' },
  border: { light: '#CAC4D0', dark: '#49454F' },
};

module.exports = { themeColors };
