import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elviobarbosa.voicetask',
  appName: 'voice-task',
  webDir: 'public',
  server: {
    url: 'https://voice2task-ten.vercel.app',
  }
};

export default config;
