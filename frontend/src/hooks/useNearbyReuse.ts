import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../stores/globalStore";
import { repairerService } from "../services/repairerService";
import { haversineDistance } from "../utils/geolocation";
import { repairerDeviceTypeFor } from "../utils/repairerDeviceTypeUtils";

/** How far around the user a reuse actor still counts as nearby. */
const RADIUS_KM = 30;

export interface NearbyReuse {
  count: number;
  nearestKm: number | null;
}

/**
 * Second-hand shops and other reuse actors near the user that take this kind
 * of device (PBI 13851). Null without a position or while loading: the option
 * then offers advice rather than an empty map.
 *
 * The device type is a requirement here, not a preference as for repairers:
 * a clothes shop is no answer to a phone.
 */
export const useNearbyReuse = (enabled = true) => {
  const { latitude, longitude } = useSelector((state: RootState) => state.auth);
  const { wizardDevice, selectedDeviceType } = useSelector(
    (state: RootState) => state.repairWorkflow,
  );
  const category =
    wizardDevice?.categories?.[0]?.canonicalName ??
    wizardDevice?.categories?.[0]?.name ??
    selectedDeviceType;

  const [nearby, setNearby] = useState<NearbyReuse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || latitude == null || longitude == null) {
      setNearby(null);
      return;
    }
    let cancelled = false;
    const dLat = RADIUS_KM / 111;
    const dLng = RADIUS_KM / (111 * Math.cos((latitude * Math.PI) / 180));
    setLoading(true);
    repairerService
      .listPaginated({
        page: 1,
        limit: 1,
        partner_type: "reuse",
        device_type: category ? repairerDeviceTypeFor(category) : undefined,
        latitude,
        longitude,
        north: latitude + dLat,
        south: latitude - dLat,
        east: longitude + dLng,
        west: longitude - dLng,
      })
      .then(({ data, meta }) => {
        if (cancelled) return;
        const nearest = data[0];
        setNearby({
          count: meta.total,
          nearestKm: nearest
            ? haversineDistance(latitude, longitude, nearest.latitude, nearest.longitude)
            : null,
        });
      })
      .catch(() => {
        if (!cancelled) setNearby(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, latitude, longitude, category]);

  return { nearby, loading };
};
