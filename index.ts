import './src/background/walkingLocationTask';
import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

// Suppress Reanimated strict mode warnings
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const msg = args[0];
  if (typeof msg === 'string' && msg.includes('[Reanimated] Writing to `value` during component render')) {
    return; // Skip this specific warning
  }
  originalWarn.apply(console, args);
};

import App from './App';

registerRootComponent(App);
