import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface DevicePosition {
  coords: { latitude: number; longitude: number };
}
export interface DeviceLocationError {
  code: number;
  message: string;
}

function locationError(error: unknown): DeviceLocationError {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  const normalizedCode = code === '1' || code === 'OS-PLUG-GLOC-0003' ? 1 : code === '3' || code === 'OS-PLUG-GLOC-0010' ? 3 : 2;
  return {
    code: normalizedCode,
    message: normalizedCode === 1
      ? 'La ubicación está bloqueada. Revisa el permiso de este sitio o de la app en los ajustes de tu dispositivo.'
      : normalizedCode === 3
        ? 'La ubicación está tardando demasiado. Intenta nuevamente.'
        : 'No se pudo obtener tu ubicación. Comprueba que la localización esté activada e intenta nuevamente.',
  };
}

function webGeolocation(): Navigator['geolocation'] {
  if (window.isSecureContext === false) {
    throw { code: 2, message: 'Abre Pinwi mediante HTTPS para poder usar tu ubicación.' };
  }
  if (!navigator.geolocation) {
    throw { code: 2, message: 'Este navegador no permite acceder a la ubicación. Puedes explorar los lugares manualmente.' };
  }
  return navigator.geolocation;
}

export async function getDeviceLocation(): Promise<DevicePosition> {
  if (Capacitor.isNativePlatform()) {
    try {
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        permissions = await Geolocation.requestPermissions({ permissions: ['location'] });
      }
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        throw { code: 1 };
      }
      return await Geolocation.getCurrentPosition({ enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 });
    } catch (error) {
      throw locationError(error);
    }
  }
  return new Promise((resolve, reject) => {
    try {
      webGeolocation().getCurrentPosition(resolve, error => reject(locationError(error)),
        { enableHighAccuracy: true, maximumAge: 30_000, timeout: 12_000 });
    } catch (error) { reject(error); }
  });
}

// Passive tracking never prompts on native. Only getDeviceLocation, called by a
// user action, may request permission. Watches stop when hidden and on unmount.
export function watchDeviceLocation(
  onPosition: (position: DevicePosition) => void,
  onError: (error: DeviceLocationError) => void = () => undefined,
): () => void {
  let disposed = false;
  let generation = 0;
  let clearCurrent: (() => void) | undefined;
  let nativeActive = true;
  const stop = () => { generation++; clearCurrent?.(); clearCurrent = undefined; };
  const start = async () => {
    stop();
    if (disposed || document.hidden || !nativeActive) return;
    const current = generation;
    const active = () => !disposed && generation === current;
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Geolocation.checkPermissions();
        if (!active() || (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted')) return;
        const id = await Geolocation.watchPosition(
          { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000, minimumUpdateInterval: 10_000 },
          (position, error) => {
            if (!active()) return;
            if (position) onPosition(position);
            else if (error) onError(locationError(error));
          },
        );
        if (!active()) { await Geolocation.clearWatch({ id }); return; }
        clearCurrent = () => { void Geolocation.clearWatch({ id }).catch(() => undefined); };
      } catch (error) { if (active()) onError(locationError(error)); }
    } else {
      try {
        const api = webGeolocation();
        // Ask for an initial fix when the authenticated view becomes visible.
        // Start ongoing tracking only after that request has succeeded.
        api.getCurrentPosition(position => {
          if (!active()) return;
          onPosition(position);
          if (!active()) return;
          const id = api.watchPosition(
            next => { if (active()) onPosition(next); },
            error => {
              if (!active()) return;
              if (error.code === 1) stop();
              onError(locationError(error));
            },
            { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
          );
          clearCurrent = () => api.clearWatch(id);
        }, error => { if (active()) onError(locationError(error)); },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 12_000 });
      } catch (error) { if (active()) onError(error as DeviceLocationError); }
    }
  };
  const onVisibility = () => { void start(); };
  const onState = (event: Event) => {
    nativeActive = (event as CustomEvent<{ isActive: boolean }>).detail.isActive;
    void start();
  };
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pinwi:app-state', onState);
  void start();
  return () => {
    disposed = true;
    stop();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pinwi:app-state', onState);
  };
}
