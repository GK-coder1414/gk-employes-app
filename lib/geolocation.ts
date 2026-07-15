export interface GeoResult {
  lat: number;
  lng: number;
  accuracy: number;
}

export const DEFAULT_WORKPLACE_RADIUS_METERS = 250;

export function distanceInMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function isWithinWorkplace(
  point: { lat: number; lng: number },
  workplace: { lat: number; lng: number; radius?: number }
): boolean {
  const radius = workplace.radius ?? DEFAULT_WORKPLACE_RADIUS_METERS;
  return distanceInMeters(point, { lat: workplace.lat, lng: workplace.lng }) <= radius;
}

const ERROR_MESSAGES: Record<number, string> = {
  1: "Permission de géolocalisation refusée. Activez-la dans les paramètres de votre navigateur pour pointer.",
  2: "Position introuvable. Vérifiez votre connexion et réessayez.",
  3: "La demande de position a expiré. Réessayez.",
};

export function getCurrentPosition(): Promise<GeoResult> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("La géolocalisation n'est pas prise en charge par cet appareil."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(new Error(ERROR_MESSAGES[error.code] ?? "Impossible d'obtenir votre position."));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

export function mapsLink(lat: number, lng: number): string {
  return `https://maps.google.com/?q=${lat},${lng}`;
}
