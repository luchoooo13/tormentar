import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { ShapeRadius } from "@/lib/_core/theme";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.onSurface,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainer,
          borderTopColor: colors.outline,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          height: tabBarHeight,
          ...Platform.select({
            ios: {
              position: "absolute" as const,
              bottom: 0,
              left: 0,
              right: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            default: {},
          }),
        },
        // Material 3: Tab indicator as a pill below the active icon
        tabBarActiveBackgroundColor: colors.primaryContainer,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600" as any,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Alertas",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="house.fill" color={focused ? colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="map.fill" color={focused ? colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configuración",
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol size={28} name="gearshape.fill" color={focused ? colors.primary : color} />
          ),
        }}
      />
    </Tabs>
  );
}
