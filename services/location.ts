export type Coordinates = { lat: number; lng: number };

const isSecureOrigin = (): boolean => {
  if (typeof window === 'undefined') return true;
  return window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname);
};

const fetchApproximateLocation = async (): Promise<Coordinates | null> => {
  try {
    const res = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.latitude && data?.longitude) {
      return { lat: Number(data.latitude), lng: Number(data.longitude) };
    }
  } catch (err) {
    console.warn('[location] IP-based fallback failed', err);
  }
  return null;
};

export const getLocationWithFallback = async (): Promise<{
  coords: Coordinates | null;
  source: 'gps' | 'ip' | 'none';
  error?: string;
}> => {
  const secure = isSecureOrigin();

  // Some mobile browsers block GPS on insecure origins; fall back to IP-based lookup early.
  if (typeof navigator === 'undefined' || !navigator.geolocation || !secure) {
    const ipLocation = await fetchApproximateLocation();
    if (ipLocation) {
      return {
        coords: ipLocation,
        source: 'ip',
        error: secure
          ? '使用網路定位，精度可能較低。'
          : '瀏覽器在非 HTTPS 網站會封鎖 GPS，已改用網路定位。'
      };
    }
    return {
      coords: null,
      source: 'none',
      error: secure
        ? '此瀏覽器不支援定位，且無法取得網路位置。'
        : '瀏覽器在非 HTTPS 網站封鎖定位，且無法取得網路位置。'
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          source: 'gps'
        }),
      async (err) => {
        let message = 'Unable to retrieve your location';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = '請允許本頁存取定位 (GPS 權限被拒絕)';
            break;
          case err.POSITION_UNAVAILABLE:
            message = '定位服務不可用，請確認手機 GPS 已開啟';
            break;
          case err.TIMEOUT:
            message = '取得定位逾時，請移動到空曠處再試一次';
            break;
        }

        const ipLocation = await fetchApproximateLocation();
        if (ipLocation) {
          resolve({
            coords: ipLocation,
            source: 'ip',
            error: `${message}。已改用網路定位，精度較低。`
          });
        } else {
          resolve({ coords: null, source: 'none', error: message });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  });
};
