import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coordinate.helper.engroconnect',
  appName: 'Engro Connect',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      // Self-hosted OTA via GitHub — completely free, no limits
      // GitHub Actions pushes version.json here after every successful build
      updateUrl: 'https://raw.githubusercontent.com/Techmastergojo/Coordinate-helper/main/version.json',
      statsUrl: '',      // disable usage tracking
      channelUrl: '',    // disable Capgo channels (we're self-hosted)
      autoUpdate: true,  // silently check & download updates in background
    },
  },
};

export default config;
