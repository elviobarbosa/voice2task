import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elviobarbosa.voicetask',
  appName: 'voice-task',
  webDir: 'public',
  server: {
    url: 'http://192.168.0.94:3000',
    cleartext: true
  }
};

export default config;
