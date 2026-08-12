import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Animated, Easing } from "react-native";
import { useEffect, useMemo, useRef } from "react";

type WeatherIconKind = "clear" | "cloud" | "rain" | "storm" | "snow" | "fog";

function getWeatherIconKind(weatherId: number): WeatherIconKind {
  if (weatherId >= 200 && weatherId <= 232) return "storm";
  if ([500, 501, 502, 503, 504, 511, 520, 521, 522, 531].includes(weatherId)) return "rain";
  if ([600, 601, 602, 611, 612, 613, 615, 616, 621, 622].includes(weatherId)) return "snow";
  if ([741].includes(weatherId)) return "fog";
  if ([801, 802, 803, 804].includes(weatherId)) return "cloud";
  return "clear";
}

const ICONS: Record<WeatherIconKind, keyof typeof MaterialIcons.glyphMap> = {
  clear: "wb-sunny",
  cloud: "cloud",
  rain: "grain",
  storm: "flash-on",
  snow: "ac-unit",
  fog: "blur-on",
};

const COLORS: Record<WeatherIconKind, string> = {
  clear: "#F59E0B",
  cloud: "#64748B",
  rain: "#2563EB",
  storm: "#7C3AED",
  snow: "#38BDF8",
  fog: "#94A3B8",
};

export function AnimatedWeatherIcon({ weatherId, size = 64 }: { weatherId: number; size?: number }) {
  const kind = useMemo(() => getWeatherIconKind(weatherId), [weatherId]);
  const translateY = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    translateY.stopAnimation();
    rotate.stopAnimation();
    scale.stopAnimation();
    opacity.stopAnimation();
    translateY.setValue(0);
    rotate.setValue(0);
    scale.setValue(1);
    opacity.setValue(1);

    const animations = {
      clear: Animated.loop(
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.12, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ),
      cloud: Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: -4, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ),
      rain: Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: 5, duration: 380, easing: Easing.in(Easing.ease), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 380, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ])
      ),
      storm: Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.35, duration: 100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          Animated.delay(700),
        ])
      ),
      snow: Animated.loop(
        Animated.timing(rotate, { toValue: 1, duration: 2800, easing: Easing.linear, useNativeDriver: true })
      ),
      fog: Animated.loop(
        Animated.sequence([
          Animated.timing(translateY, { toValue: -3, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(translateY, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ),
    };

    const animation = animations[kind];
    animation.start();
    return () => animation.stop();
  }, [kind, opacity, rotate, scale, translateY]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }, { rotate: spin }], opacity }}>
      <MaterialIcons name={ICONS[kind]} size={size} color={COLORS[kind]} />
    </Animated.View>
  );
}
