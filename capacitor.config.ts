import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coordinate.helper.engroconnect',
  appName: 'Engro Enfrashare',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      // Self-hosted OTA via GitHub — completely free, no limits
      // GitHub Actions pushes version.json here after every successful build
      updateUrl: 'https://raw.githubusercontent.com/Techmastergojo/Engro-Connect/main/version.json',
      statsUrl: '',      // disable usage tracking
      channelUrl: '',    // disable Capgo channels (we're self-hosted)
      autoUpdate: false,  // silently check & download updates in background
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#090d0a", // Engro Green theme bg
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    }
  },
};

export default config;
