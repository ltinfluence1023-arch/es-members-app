/**
 * Promise wrapper around navigator.geolocation.getCurrentPosition
 * with high-accuracy mode and a sensible timeout.
 */
export function getCurrentPosition(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      reject(new Error("位置情報がサポートされていません"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("位置情報の利用を許可してください"));
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          reject(new Error("位置情報を取得できませんでした"));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("位置情報の取得がタイムアウトしました"));
        } else {
          reject(new Error("位置情報の取得に失敗しました"));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });
}
