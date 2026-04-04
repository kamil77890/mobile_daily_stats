/**
 * Google Maps (react-native-maps) needs an API key in dev/production builds.
 * Local: put GOOGLE_MAPS_API_KEY in `.env` (gitignored). EAS cloud build: use secret (see below).
 */
require('dotenv').config();

module.exports = function appConfig() {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

  const openWeatherApiKey = process.env.OPENWEATHER_API_KEY ?? '';

  if (!apiKey && process.env.EAS_BUILD === 'true') {
    console.warn(
      '\n[app.config] Missing GOOGLE_MAPS_API_KEY. Set EAS secret or maps will crash.\n',
    );
  }

  if (!openWeatherApiKey) {
    console.log(
      '\n[app.config] OPENWEATHER_API_KEY not set. Weather will show error. Add to .env\n',
    );
  }

  return {
    expo: {
      name: 'mobile_daily_stats',
      slug: 'mobile_daily_stats',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      userInterfaceStyle: 'dark',
      splash: {
        image: './assets/splash-icon.png',
        resizeMode: 'contain',
        backgroundColor: '#000000',
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.kamjak7786.mobiledailystats',
        infoPlist: {
          NSMotionUsageDescription: 'Motion is used to count your steps for daily stats.',
          NSLocationWhenInUseUsageDescription:
            'Location is used to draw your walking route on the map while you use the app.',
          NSLocationAlwaysAndWhenInUseUsageDescription:
            'Location is used to keep recording your walking route when the app is in the background.',
        },
        config: {
          googleMapsApiKey: apiKey,
        },
      },
      android: {
        adaptiveIcon: {
          backgroundColor: '#000000',
          foregroundImage: './assets/android-icon-foreground.png',
          backgroundImage: './assets/android-icon-background.png',
          monochromeImage: './assets/android-icon-monochrome.png',
        },
        predictiveBackGestureEnabled: false,
        permissions: [
          'ACCESS_COARSE_LOCATION',
          'ACCESS_FINE_LOCATION',
          'ACCESS_BACKGROUND_LOCATION',
          'android.permission.ACTIVITY_RECOGNITION',
          'android.permission.FOREGROUND_SERVICE',
          'android.permission.FOREGROUND_SERVICE_LOCATION',
        ],
        package: 'com.kamjak7786.mobile_daily_stats',
        config: {
          googleMaps: {
            apiKey,
          },
        },
      },
      web: {
        favicon: './assets/favicon.png',
      },
      plugins: [
        [
          'expo-location',
          {
            locationWhenInUsePermission:
              'Allow $(PRODUCT_NAME) to record your walking routes on the map.',
            locationAlwaysAndWhenInUsePermission:
              'Allow $(PRODUCT_NAME) to record your walking route in the background for all-day walking.',
            isIosBackgroundLocationEnabled: true,
            isAndroidBackgroundLocationEnabled: true,
            isAndroidForegroundServiceEnabled: true,
          },
        ],
        [
          'expo-notifications',
          {
            icon: './assets/icon.png',
            color: '#c62828',
          },
        ],
      ],
      extra: {
        eas: {
          projectId: 'ca9b47d2-5a14-4ca5-acc8-de157f75464b',
        },
        openWeatherApiKey,
      },
    },
  };
};