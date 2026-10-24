import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { getDeviceLocation, watchDeviceLocation, type DevicePosition, type DeviceLocationError } from '../../services/deviceLocationService';

type Coordinates = { lat: number; lng: number };
const coordinatesFrom = (position: DevicePosition): Coordinates => ({ lat: position.coords.latitude, lng: position.coords.longitude });

// Mounted only inside the authenticated discovery/map routes, never the landing.
export function useDeviceLocation() {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [error, setError] = useState('');
  const [isLocating, setIsLocating] = useState(() => !Capacitor.isNativePlatform());
  const [trackingVersion, setTrackingVersion] = useState(0);
  const generation = useRef(0);
  const mounted = useRef(false);
  const stopWatch = useRef<(() => void) | null>(null);

  useEffect(() => {
    mounted.current = true;
    const current = ++generation.current;
    const active = () => mounted.current && current === generation.current;
    const stop = watchDeviceLocation(position => {
      if (!active()) return;
      setCoordinates(coordinatesFrom(position));
      setError('');
      setIsLocating(false);
    }, failure => {
      if (!active()) return;
      setError(failure.message);
      setIsLocating(false);
      if (failure.code === 1) setCoordinates(null);
    });
    stopWatch.current = stop;
    return () => {
      mounted.current = false;
      generation.current++;
      stop();
      stopWatch.current = null;
    };
  }, [trackingVersion]);

  const requestLocation = useCallback(async (): Promise<Coordinates | null> => {
    stopWatch.current?.();
    const current = ++generation.current;
    setIsLocating(true);
    setError('');
    try {
      const position = await getDeviceLocation();
      if (!mounted.current || current !== generation.current) return null;
      const next = coordinatesFrom(position);
      setCoordinates(next);
      setIsLocating(false);
      setTrackingVersion(version => version + 1);
      return next;
    } catch (failure) {
      if (!mounted.current || current !== generation.current) return null;
      const cause = failure as DeviceLocationError;
      setError(cause.message || 'No se pudo obtener tu ubicación. Intenta nuevamente.');
      setIsLocating(false);
      if (cause.code === 1) setCoordinates(null);
      return null;
    }
  }, []);

  return { coordinates, error, isLocating, requestLocation };
}
