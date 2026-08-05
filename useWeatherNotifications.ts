/**
 * useWeatherNotifications Hook
 * Hook para manejar notificaciones de alertas de clima
 */

import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";
import { Platform } from "react-native";
import type { WeatherAlert, AlertSeverity } from "@/shared/types/weather";

// Configurar comportamiento de notificaciones. Esto NO puede ejecutarse
// al importar el módulo: la app usa `output: "static"` (Expo Router
// pre-renderiza cada página en Node.js durante el build), y expo-notifications
// depende de APIs de navegador que no existen ahí. Si corre en ese momento,
// rompe el pre-renderizado de la página sin ningún error visible (la
// página termina en blanco). Por eso se protege con un chequeo de entorno
// y se hace en cuanto el módulo carga en un navegador real, no antes.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function useWeatherNotifications() {
  const soundRef = useRef<Audio.Sound | null>(null);

  // Pedir permiso de notificaciones. Sin esto, en Android 13+ e iOS las
  // notificaciones programadas con scheduleNotificationAsync no se
  // muestran nunca, aunque el código no tire ningún error.
  const requestPermissions = async () => {
    try {
      const { status: existing } = await Notifications.getPermissionsAsync();
      if (existing === "granted") return true;
      const { status } = await Notifications.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return false;
    }
  };

  // Inicializar audio
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });
      } catch (error) {
        console.error("Error setting audio mode:", error);
      }
    };

    setupAudio();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Obtener información de notificación según severidad
  const getNotificationConfig = (severity: AlertSeverity) => {
    const configs: Record<AlertSeverity, any> = {
      leve: {
        title: "⚠️ Alerta de Clima Leve",
        sound: null,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
      },
      moderada: {
        title: "⚠️ Alerta de Clima Moderada",
        sound: "default",
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      severa: {
        title: "🚨 ALERTA DE TORMENTA FUERTE",
        sound: "alert",
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
    };

    return configs[severity];
  };

  // Reproducir sonido si corresponde y el usuario lo tiene activado
  const playAlertSound = async (severity: AlertSeverity) => {
    try {
      // Liberar sonido anterior
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => {});
      }

      let soundUri: string;

      if (severity === "severa") {
        // Usar sonido de alerta fuerte para tormentas severas
        soundUri =
          "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
      } else if (severity === "moderada") {
        // Sonido moderado
        soundUri =
          "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
      } else {
        return; // Sin sonido para alertas leves
      }

      const { sound } = await Audio.Sound.createAsync({ uri: soundUri });
      soundRef.current = sound;

      await sound.playAsync();
    } catch (error) {
      console.error("Error playing alert sound:", error);
    }
  };

  // Enviar notificación local. Respeta las preferencias de sonido y
  // vibración elegidas en Configuración (antes se ignoraban siempre
  // se reproducía sonido, sin importar los toggles del usuario).
  const sendNotification = async (
    alert: WeatherAlert,
    options?: { soundEnabled?: boolean; vibrationEnabled?: boolean }
  ) => {
    const soundEnabled = options?.soundEnabled ?? true;
    const vibrationEnabled = options?.vibrationEnabled ?? true;

    try {
      const config = getNotificationConfig(alert.severity);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: config.title,
          body: alert.description,
          data: {
            alertId: alert.id,
            latitude: alert.latitude,
            longitude: alert.longitude,
            severity: alert.severity,
            event: alert.event,
          },
          sound: soundEnabled ? config.sound : null,
          priority: config.priority,
          vibrate: vibrationEnabled ? [0, 250, 250, 250] : undefined,
        } as any,
        trigger: null,
      });

      // Reproducir sonido si corresponde y el usuario lo tiene activado
      if (soundEnabled && alert.severity !== "leve") {
        await playAlertSound(alert.severity);
      }
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  // Crear canales de notificación en Android
  const setupNotificationChannels = async () => {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("weather_alerts", {
        name: "Alertas de Clima",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6B35",
      } as any);

      await Notifications.setNotificationChannelAsync("storm_alerts", {
        name: "Alertas de Tormentas Severas",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250, 250, 250],
        lightColor: "#EF4444",
      } as any);
    }
  };

  return {
    sendNotification,
    setupNotificationChannels,
    playAlertSound,
    requestPermissions,
  };
}
