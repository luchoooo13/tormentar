const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const exclusionList = require("metro-config/src/defaults/exclusionList");

const config = getDefaultConfig(__dirname);

// react-native-css-interop escribe un archivo de cache interno
// (.cache/web.css) durante el bundling cuando forceWriteFileSystem
// esta activado. En un build "limpio" (Docker/CI, sin watchman previo)
// ese archivo se crea a mitad del proceso y Metro no lo encuentra al
// intentar calcular su SHA-1, lo que tira:
// "Failed to get the SHA-1 for: .../react-native-css-interop/.cache/web.css"
// Lo excluimos del resolver porque es solo un cache interno, no algo
// que necesitemos bundlear.
config.resolver.blockList = exclusionList([
  /node_modules\/react-native-css-interop\/\.cache\/.*/,
]);

module.exports = withNativeWind(config, {
  input: "./global.css",
  // Force write CSS to file system instead of virtual modules
  // This fixes iOS styling issues in development mode
  forceWriteFileSystem: true,
});
