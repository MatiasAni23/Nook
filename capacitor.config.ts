import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.pinwi.app',
  appName: 'Pinwi',
  webDir: 'dist-mobile',
  backgroundColor: '#ffffff',
  // Bundle the application. Never point a release at a development server.
  android: { allowMixedContent: false },
  ios: { contentInset: 'automatic', preferredContentMode: 'mobile' },
  plugins: {
    SplashScreen: { launchAutoHide: false, launchFadeOutDuration: 160, backgroundColor: '#21183f', androidScaleType: 'CENTER_INSIDE', showSpinner: false },
    SystemBars: { insetsHandling: 'native', initialViewportFitValueHint: 'contain', style: 'LIGHT' },
  },
};

export default config;
