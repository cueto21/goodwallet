import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.goodwallet.finanzas',
  appName: 'GoodWallet',
  webDir: 'dist/goodwallet/browser',
  server: {
    androidScheme: 'https'
  }
};

export default config;
