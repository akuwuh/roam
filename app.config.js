// app.config.js - Dynamic Expo config with environment variables
module.exports = {
  expo: {
    name: "Roam",
    slug: "roam",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FFFFFF"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.akuwuh.roam",
      infoPlist: {
        UIFileSharingEnabled: true,
        LSSupportsOpeningDocumentsInPlace: true
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      edgeToEdgeEnabled: true,
      package: "com.akuwuh.roam"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-dev-client"
    ],
    extra: {
      // OpenRouter API key for hybrid cloud inference
      openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
    }
  }
};

