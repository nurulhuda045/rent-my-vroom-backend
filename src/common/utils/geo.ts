const EARTH_RADIUS_KM = 6371;
const MAX_LONGITUDE_SPAN = 180;

export type GeoBoundingBox = {
  minLatitude: number;
  maxLatitude: number;
  minLongitude: number;
  maxLongitude: number;
  crossesAntimeridian: boolean;
};

export class GeoUtils {
  static getBoundingBox(latitude: number, longitude: number, radiusKm: number): GeoBoundingBox {
    const latitudeDelta = this.toDegrees(radiusKm / EARTH_RADIUS_KM);
    const minLatitude = Math.max(-90, latitude - latitudeDelta);
    const maxLatitude = Math.min(90, latitude + latitudeDelta);
    const longitudeDelta = this.getLongitudeDelta(latitude, radiusKm);

    if (longitudeDelta >= MAX_LONGITUDE_SPAN) {
      return {
        minLatitude,
        maxLatitude,
        minLongitude: -180,
        maxLongitude: 180,
        crossesAntimeridian: false,
      };
    }

    const rawMinLongitude = longitude - longitudeDelta;
    const rawMaxLongitude = longitude + longitudeDelta;

    return {
      minLatitude,
      maxLatitude,
      minLongitude: this.normalizeLongitude(rawMinLongitude),
      maxLongitude: this.normalizeLongitude(rawMaxLongitude),
      crossesAntimeridian: rawMinLongitude < -180 || rawMaxLongitude > 180,
    };
  }

  private static getLongitudeDelta(latitude: number, radiusKm: number): number {
    const cosineLatitude = Math.cos(this.toRadians(latitude));

    if (Math.abs(cosineLatitude) < Number.EPSILON) {
      return MAX_LONGITUDE_SPAN;
    }

    return this.toDegrees(radiusKm / (EARTH_RADIUS_KM * cosineLatitude));
  }

  private static normalizeLongitude(longitude: number): number {
    return ((((longitude + 180) % 360) + 360) % 360) - 180;
  }

  private static toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }

  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }
}
