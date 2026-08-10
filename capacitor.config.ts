import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.coordinate.helper.engroconnect',
  appName: 'Engro Connect',
  webDir: 'dist',
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false, // We will manually handle OTA updates in App.tsx using the GitHub token to bypass private repo blocks
    },
  },
};

export default config;
