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
      autoUpdate: false, // We manage updates manually in App.tsx silentCheckForUpdates()
    },
    SplashScreen: {
      launchShowDuration: 0,   // hide splash immediately
      launchAutoHide: true,
      backgroundColor: "#090d0a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    }
  },
};

export default config;
