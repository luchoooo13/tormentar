/**
 * Theme Lab - Material 3 Expressive Design System Showcase
 * Pantalla de laboratorio para probar el sistema visual Material 3.
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { SchemeColors, type ColorScheme } from "@/constants/theme";
import { ShapeRadius, Elevation } from "@/lib/_core/theme";
import { useColors } from "@/hooks/use-colors";
import { useThemeContext } from "@/lib/theme-provider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

type PaletteName = keyof typeof SchemeColors.light;

const paletteNames: PaletteName[] = Object.keys(SchemeColors.light) as PaletteName[];

// Material 3 Typography Scale
const TYPO_SCALE = [
  { name: "Display Large", size: 57, weight: "400" as const, lineHeight: 64 },
  { name: "Display Medium", size: 45, weight: "400" as const, lineHeight: 52 },
  { name: "Headline Large", size: 32, weight: "400" as const, lineHeight: 40 },
  { name: "Title Large", size: 22, weight: "400" as const, lineHeight: 28 },
  { name: "Title Medium", size: 16, weight: "500" as const, lineHeight: 24 },
  { name: "Body Large", size: 16, weight: "400" as const, lineHeight: 24 },
  { name: "Body Medium", size: 14, weight: "400" as const, lineHeight: 20 },
  { name: "Label Large", size: 14, weight: "500" as const, lineHeight: 20 },
  { name: "Label Small", size: 11, weight: "500" as const, lineHeight: 16 },
];

export default function ThemeLabScreen() {
  const [expandedSection, setExpandedSection] = useState<string>("palette");
  const { colorScheme, setColorScheme } = useThemeContext();
  const colors = useColors();

  const swatches = useMemo(
    () =>
      paletteNames.map((name) => ({
        name,
        value: SchemeColors[colorScheme][name],
      })),
    [colorScheme],
  );

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? "" : section);
  };

  return (
    <ScreenContainer style={{ backgroundColor: colors.background }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Material 3 Top Bar */}
        <View style={[styles.topBar, { backgroundColor: colors.primaryContainer }]}>
          <View style={styles.topBarRow}>
            <View style={[styles.topBarIcon, { backgroundColor: colors.primary + "20" }]}>
              <MaterialIcons name="palette" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.topBarTitle, { color: colors.onPrimaryContainer }]}>
              Material 3 Expressive Lab
            </Text>
          </View>
          <View style={styles.schemeToggles}>
            {(["light", "dark"] as ColorScheme[]).map((scheme) => (
              <Pressable
                key={scheme}
                onPress={() => setColorScheme(scheme)}
                style={[
                  styles.schemeToggle,
                  {
                    backgroundColor:
                      colorScheme === scheme ? colors.primary : colors.surfaceContainerLow,
                    borderColor: colorScheme === scheme ? colors.primary : colors.outline,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.schemeToggleText,
                    { color: colorScheme === scheme ? colors.onPrimary : colors.onSurface },
                  ]}
                >
                  {scheme === "light" ? "Light" : "Dark"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Color Palette Section */}
        <Pressable
          onPress={() => toggleSection("palette")}
          style={[styles.section, { backgroundColor: colors.surfaceContainer, ...Elevation[1] }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="palette" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Color System</Text>
            <MaterialIcons
              name={expandedSection === "palette" ? "expand-less" : "expand-more"}
              size={20}
              color={colors.onSurfaceVariant}
            />
          </View>
          {expandedSection === "palette" && (
            <View style={styles.colorGrid}>
              {swatches.map((item) => (
                <View key={item.name} style={styles.colorSwatch}>
                  <View style={[styles.swatch, { backgroundColor: item.value }]} />
                  <Text style={[styles.swatchLabel, { color: colors.onSurface }]}>{item.name}</Text>
                  <Text style={[styles.swatchValue, { color: colors.onSurfaceVariant }]}>{item.value}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* Typography Section */}
        <Pressable
          onPress={() => toggleSection("typography")}
          style={[styles.section, { backgroundColor: colors.surfaceContainer, ...Elevation[1] }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="text-fields" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Typography Scale</Text>
            <MaterialIcons
              name={expandedSection === "typography" ? "expand-less" : "expand-more"}
              size={20}
              color={colors.onSurfaceVariant}
            />
          </View>
          {expandedSection === "typography" && (
            <View style={styles.typoList}>
              {TYPO_SCALE.map((type) => (
                <View key={type.name} style={[styles.typoRow, { borderBottomColor: colors.outlineVariant }]}>
                  <Text style={[styles.typoName, { color: colors.onSurfaceVariant }]}>{type.name}</Text>
                  <Text
                    style={{
                      color: colors.onSurface,
                      fontSize: type.size,
                      fontWeight: type.weight,
                      lineHeight: type.lineHeight,
                    }}
                    numberOfLines={1}
                  >
                    The quick brown fox jumps
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* Components Section */}
        <Pressable
          onPress={() => toggleSection("components")}
          style={[styles.section, { backgroundColor: colors.surfaceContainer, ...Elevation[1] }]}
        >
          <View style={styles.sectionHeader}>
            <MaterialIcons name="widgets" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.onSurface }]}>Components</Text>
            <MaterialIcons
              name={expandedSection === "components" ? "expand-less" : "expand-more"}
              size={20}
              color={colors.onSurfaceVariant}
            />
          </View>
          {expandedSection === "components" && (
            <View style={styles.componentsList}>
              {/* Buttons */}
              <Text style={[styles.componentLabel, { color: colors.onSurfaceVariant }]}>Filled Button</Text>
              <Pressable style={[styles.button, { backgroundColor: colors.primary, borderRadius: ShapeRadius.full }]}>
                <Text style={[styles.buttonText, { color: colors.onPrimary }]}>Button</Text>
              </Pressable>

              <Text style={[styles.componentLabel, { color: colors.onSurfaceVariant }]}>Tonal Button</Text>
              <Pressable style={[styles.button, { backgroundColor: colors.secondaryContainer, borderRadius: ShapeRadius.full }]}>
                <Text style={[styles.buttonText, { color: colors.onSecondaryContainer }]}>Button</Text>
              </Pressable>

              <Text style={[styles.componentLabel, { color: colors.onSurfaceVariant }]}>Outlined Button</Text>
              <Pressable style={[styles.button, { borderColor: colors.outline, borderWidth: 1, borderRadius: ShapeRadius.full }]}>
                <Text style={[styles.buttonText, { color: colors.primary }]}>Button</Text>
              </Pressable>

              {/* Chips */}
              <Text style={[styles.componentLabel, { color: colors.onSurfaceVariant }]}>Filter Chips</Text>
              <View style={styles.chipRow}>
                <View style={[styles.chip, { backgroundColor: colors.secondaryContainer }]}>
                  <MaterialIcons name="check" size={16} color={colors.onSecondaryContainer} />
                  <Text style={[styles.chipText, { color: colors.onSecondaryContainer }]}>Active</Text>
                </View>
                <View style={[styles.chip, { borderColor: colors.outline, borderWidth: 1 }]}>
                  <Text style={[styles.chipText, { color: colors.onSurface }]}>Inactive</Text>
                </View>
              </View>

              {/* Cards */}
              <Text style={[styles.componentLabel, { color: colors.onSurfaceVariant }]}>Cards</Text>
              <View style={[styles.cardPreview, { backgroundColor: colors.surfaceContainer, ...Elevation[2] }]}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Elevated Card</Text>
                <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
                  Material 3 elevated card with elevation level 2.
                </Text>
              </View>
              <View style={[styles.cardPreview, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outline, borderWidth: 1 }]}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Outlined Card</Text>
                <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
                  Material 3 outlined card variant.
                </Text>
              </View>
              <View style={[styles.cardPreview, { backgroundColor: colors.surfaceVariant }]}>
                <Text style={[styles.cardTitle, { color: colors.onSurface }]}>Filled Card</Text>
                <Text style={[styles.cardBody, { color: colors.onSurfaceVariant }]}>
                  Material 3 filled card with surface variant.
                </Text>
              </View>
            </View>
          )}
        </Pressable>

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 64,
  },

  // Top Bar
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: ShapeRadius.extraLarge,
    borderBottomRightRadius: ShapeRadius.extraLarge,
  },
  topBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  topBarIcon: {
    width: 44,
    height: 44,
    borderRadius: ShapeRadius.large,
    justifyContent: "center",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  schemeToggles: {
    flexDirection: "row",
    gap: 8,
  },
  schemeToggle: {
    flex: 1,
    borderWidth: 1,
    borderRadius: ShapeRadius.medium,
    paddingVertical: 8,
    alignItems: "center",
  },
  schemeToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Sections
  section: {
    borderRadius: ShapeRadius.large,
    overflow: "hidden",
    marginTop: 12,
    marginHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginLeft: 8,
  },

  // Color Grid
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  colorSwatch: {
    width: "47%",
    marginBottom: 8,
  },
  swatch: {
    height: 44,
    borderRadius: ShapeRadius.medium,
    marginBottom: 6,
  },
  swatchLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  swatchValue: {
    fontSize: 11,
    fontFamily: "monospace",
  },

  // Typography
  typoList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  typoRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  typoName: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 4,
  },

  // Components
  componentsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 14,
  },
  componentLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: "center",
    alignSelf: "flex-start",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: ShapeRadius.small,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  cardPreview: {
    borderRadius: ShapeRadius.large,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 14,
    lineHeight: 20,
  },

  bottomSpacer: {
    height: 32,
  },
});
