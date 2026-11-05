import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Calls `tick` every `intervalMs` while `enabled`, the screen is focused and
 * the app is in the foreground (`AppState` also follows the browser tab's
 * visibility on web). Leaving the screen or the app stops it; coming back
 * starts a fresh wait.
 */
export function usePolling(tick: () => void, intervalMs: number, enabled: boolean): void {
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState !== 'background');
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state !== 'background'));
    return () => subscription.remove();
  }, []);

  const running = enabled && focused && active;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => tickRef.current(), intervalMs);
    return () => clearInterval(timer);
  }, [running, intervalMs]);
}
