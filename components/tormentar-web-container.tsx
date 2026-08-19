import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useColors } from "@/hooks/use-colors";
import { useAlertPreferences } from "@/hooks/useAlertPreferences";

const TORmentar_URL = "https://tormentar.onrender.com/";

export function TormentarWebContainer() {
  const colors = useColors();
  const { preferences, updatePreferences } = useAlertPreferences();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web") return;
    updatePreferences({
      notificationsEnabled: true,
      minSeverity: "moderada",
    });
  }, [updatePreferences]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.nativeBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.brandBlock}>
          <View style={[styles.brandIcon, { backgroundColor: colors.primary }]}>
            <MaterialIcons name="thunderstorm" size={18} color="#FFFFFF" />
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: colors.foreground }]}>
              Tormentar
            </Text>
            <Text style={[styles.brandSubtitle, { color: colors.muted }]}>
              Alertas nativas activas
            </Text>
          </View>
        </View>
        <View style={styles.soundControl}>
          <MaterialIcons
            name={preferences.soundEnabled ? "volume-up" : "volume-off"}
            size={18}
            color={preferences.soundEnabled ? colors.primary : colors.muted}
          />
          <Text style={[styles.soundLabel, { color: colors.foreground }]}>
            Sonido
          </Text>
          <Switch
            value={preferences.soundEnabled}
            onValueChange={(value) =>
              updatePreferences({ soundEnabled: value })
            }
            trackColor={{ false: colors.border, true: colors.primary + "88" }}
            thumbColor={
              preferences.soundEnabled ? colors.primary : colors.muted
            }
          />
        </View>
      </View>

      <View style={styles.webViewWrap}>
        <WebView
          source={{ uri: TORmentar_URL }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          setSupportMultipleWindows={false}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          style={styles.webView}
        />
        {loading && (
          <View
            style={[
              styles.loadingOverlay,
              { backgroundColor: colors.background },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.muted }]}>
              Abriendo Tormentar…
            </Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Configurar alertas moderadas y fuertes"
        onPress={() =>
          updatePreferences({
            notificationsEnabled: true,
            minSeverity: "moderada",
          })
        }
        style={({ pressed }) => [
          styles.statusPill,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <MaterialIcons
          name="notifications-active"
          size={16}
          color={colors.primary}
        />
        <Text style={[styles.statusText, { color: colors.foreground }]}>
          Alertas moderadas y fuertes
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nativeBar: {
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  brandBlock: { flexDirection: "row", alignItems: "center", gap: 9, flex: 1 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontSize: 16, fontWeight: "800" },
  brandSubtitle: { fontSize: 10, marginTop: 1 },
  soundControl: { flexDirection: "row", alignItems: "center", gap: 5 },
  soundLabel: { fontSize: 11, fontWeight: "700" },
  webViewWrap: { flex: 1 },
  webView: { flex: 1, backgroundColor: "transparent" },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13 },
  statusPill: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  statusText: { fontSize: 11, fontWeight: "700" },
});
