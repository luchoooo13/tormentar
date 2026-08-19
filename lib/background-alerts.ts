/**
 * Background Alerts Module
 * Maneja las notificaciones de alertas climáticas en segundo plano
 * para Android y iOS usando expo-background-fetch y expo-task-manager.
 */

import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getWeatherAlerts } from "./services/weatherService";
import { getEnabledSeverities } from "../hooks/useAlertPreferences";
import {
  getAlertNotificationPrefix,
  isAlertInNotificationWindow,
} from "../shared/alert-timing";

const NATIVE_BACKGROUND_INTERVAL_SECONDS = 60;
const NATIVE_MIN_SEVERITIES = ["moderada", "severa"] as const;
const ALERT_SOUND_FILE = "eas_alarm_canada.mp3";

const BACKGROUND_ALERT_TASK = "background-weather-alerts";
const LAST_LOCATION_KEY = "tormentar_location"; // Coincidir con useLocation.ts
const KNOWN_ALERTS_KEY = "tormentar_known_alerts";
const PREFERENCES_KEY = "tormentar_preferences";

// Definir la tarea que se ejecuta en segundo plano
TaskManager.defineTask(BACKGROUND_ALERT_TASK, async () => {
  try {
    console.log("[BackgroundAlerts] Task started");

    // Obtener ubicación guardada
    const locationRaw = await AsyncStorage.getItem(LAST_LOCATION_KEY);
    if (!locationRaw) {
      console.log("[BackgroundAlerts] No location stored");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const location = JSON.parse(locationRaw);

    // Obtener preferencias
    const prefsRaw = await AsyncStorage.getItem(PREFERENCES_KEY);
    const preferences = prefsRaw
      ? JSON.parse(prefsRaw)
      : {
          notificationsEnabled: true,
          minSeverity: "moderada",
          soundEnabled: true,
          vibrationEnabled: true,
        };

    if (!preferences.notificationsEnabled) {
      console.log("[BackgroundAlerts] Notifications disabled");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Obtener alertas reales desde el servicio de clima
    const weatherData = await getWeatherAlerts(
      location.latitude,
      location.longitude,
    );

    if (
      !weatherData ||
      !weatherData.alerts ||
      weatherData.alerts.length === 0
    ) {
      console.log("[BackgroundAlerts] No alerts found");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Obtener alertas conocidas para no repetir notificaciones
    const knownIdsRaw = await AsyncStorage.getItem(KNOWN_ALERTS_KEY);
    const knownIds = new Set(knownIdsRaw ? JSON.parse(knownIdsRaw) : []);

    const enabledSeverities = getEnabledSeverities(
      preferences.minSeverity,
    ).filter((severity) =>
      NATIVE_MIN_SEVERITIES.includes(
        severity as (typeof NATIVE_MIN_SEVERITIES)[number],
      ),
    );
    const newRelevantAlerts = weatherData.alerts.filter(
      (a) =>
        isAlertInNotificationWindow(a) &&
        !knownIds.has(a.id) &&
        enabledSeverities.includes(a.severity),
    );

    if (newRelevantAlerts.length === 0) {
      console.log("[BackgroundAlerts] No new relevant alerts");
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Notificar cada nueva alerta
    for (const alert of newRelevantAlerts) {
      await sendLocalNotification(
        `${getAlertNotificationPrefix(alert)}${alert.event}`,
        alert.description,
        {
          alertId: alert.id,
          severity: alert.severity,
          soundEnabled: preferences.soundEnabled,
        },
      );
      knownIds.add(alert.id);
    }

    // Guardar el historial actualizado de alertas conocidas
    await AsyncStorage.setItem(
      KNOWN_ALERTS_KEY,
      JSON.stringify(Array.from(knownIds)),
    );

    console.log(
      `[BackgroundAlerts] Notified ${newRelevantAlerts.length} new alerts at ${new Date().toLocaleTimeString()}`,
    );

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error("[BackgroundAlerts] Error:", error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Registra la tarea de fondo para verificar alertas periódicamente
 */
export async function registerBackgroundAlertsAsync() {
  try {
    // Configurar el manejador de notificaciones
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Crear canales de notificación en Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("weather_alerts", {
        name: "Alertas de Clima",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 300, 150, 300, 150, 500],
        lightColor: "#F97316",
        sound: ALERT_SOUND_FILE,
        enableVibrate: true,
        enableLights: true,
      } as any);

      await Notifications.setNotificationChannelAsync("storm_alerts", {
        name: "Alertas de Tormentas Severas",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 150, 500, 150, 800],
        lightColor: "#DC2626",
        sound: ALERT_SOUND_FILE,
        enableVibrate: true,
        enableLights: true,
      } as any);
    }

    // Pedir permisos de notificación
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== "granted") {
      console.warn("[BackgroundAlerts] Notification permissions not granted");
    }

    // Registrar la tarea de fondo con el intervalo fijo de toda la app.
    await BackgroundFetch.registerTaskAsync(BACKGROUND_ALERT_TASK, {
      minimumInterval: NATIVE_BACKGROUND_INTERVAL_SECONDS,
      // Android puede retrasar este trabajo para ahorrar batería; 60 s es
      // el mínimo solicitado, no una garantía exacta de entrega.
      stopOnTerminate: false, // Seguir corriendo si la app se cierra
      startOnBoot: true, // Empezar al reiniciar el dispositivo
    });

    console.log(
      `[BackgroundAlerts] Background task registered with interval: ${NATIVE_BACKGROUND_INTERVAL_SECONDS}s`,
    );
    return true;
  } catch (error) {
    console.error("[BackgroundAlerts] Failed to register:", error);
    return false;
  }
}

/**
 * Desregistra la tarea de fondo
 */
export async function unregisterBackgroundAlertsAsync() {
  try {
    await BackgroundFetch.unregisterTaskAsync(BACKGROUND_ALERT_TASK);
    console.log("[BackgroundAlerts] Background task unregistered");
    return true;
  } catch (error) {
    console.error("[BackgroundAlerts] Failed to unregister:", error);
    return false;
  }
}

/**
 * Guarda la ubicación actual para usarla en las tareas de fondo
 */
export async function saveLocationForBackground(
  latitude: number,
  longitude: number,
) {
  try {
    await AsyncStorage.setItem(
      LAST_LOCATION_KEY,
      JSON.stringify({ latitude, longitude }),
    );
  } catch (error) {
    console.error("[BackgroundAlerts] Failed to save location:", error);
  }
}

/**
 * Envía una notificación local
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  try {
    const severity = data?.severity === "severa" ? "severa" : "moderada";
    const channelId = severity === "severa" ? "storm_alerts" : "weather_alerts";
    const soundEnabled = data?.soundEnabled !== false;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        channelId,
        sound: soundEnabled ? ALERT_SOUND_FILE : null,
        vibrate: [0, 350, 150, 350, 150, severity === "severa" ? 800 : 500],
        priority:
          severity === "severa"
            ? Notifications.AndroidNotificationPriority.MAX
            : Notifications.AndroidNotificationPriority.HIGH,
        sticky: severity === "severa",
        autoDismiss: severity !== "severa",
        // Android trata esto como una solicitud de superficie urgente; el
        // permiso especial puede ser revocado por el usuario o por el sistema.
        fullScreenIntent: severity === "severa",
      } as any,
      trigger: null,
    });
  } catch (error) {
    console.error("[BackgroundAlerts] Failed to send notification:", error);
  }
}
