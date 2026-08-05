const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// forceWriteFileSystem hace que react-native-css-interop escriba un
// archivo de cache interno (.cache/web.css) a mitad del bundling.
// En local (Mac/Windows, con watchman corriendo) no da problema, pero
// en un build "limpio" de Docker/CI ese archivo se crea despues de que
// Metro ya escaneo el proyecto, y al intentar hashearlo (SHA-1) para
// bundlearlo revienta con:
// "Failed to get the SHA-1 for: .../react-native-css-interop/.cache/web.css"
// Esta opcion solo existe para arreglar estilos de iOS en modo desarrollo
// (ver comentario original abajo), asi que la desactivamos en produccion
// (que es el modo que usa "npx expo export").
const isProduction = process.env.NODE_ENV === "production";

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: !isProduction,
});
