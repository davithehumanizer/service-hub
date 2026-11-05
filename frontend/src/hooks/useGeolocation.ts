import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setDetectedGeolocation } from "../stores/authSlice";
import { RootState } from "../stores/globalStore";

export const useGeolocation = () => {
  const dispatch = useDispatch();

  const user = useSelector((state: RootState) => state.auth.user);

  useEffect(() => {
    const getBrowserGeolocation = () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            dispatch(
              setDetectedGeolocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                source: "browser",
              })
            );
          },
          (error) => {
            console.error("Browser geolocation error:", error);
            getIpGeolocation(); // Fallback to IP geolocation on error or denial
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        console.warn("Browser does not support Geolocation.");
        getIpGeolocation(); // Fallback if geolocation is not supported
      }
    };

    const getIpGeolocation = async () => {
      try {
        // ip-api.com only serves HTTPS on a paid plan, and our CSP
        // (connect-src 'self' https:) blocks its plain HTTP endpoint outright,
        // so the fallback was dead in production. geojs is HTTPS, keyless and
        // unmetered; ipapi.co, the other candidate, rate-limits anonymous
        // callers aggressively.
        const response = await fetch("https://get.geojs.io/v1/ip/geo.json");
        const data = await response.json();

        // geojs returns coordinates as strings.
        const latitude = parseFloat(data.latitude);
        const longitude = parseFloat(data.longitude);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          dispatch(
            setDetectedGeolocation({
              latitude,
              longitude,
              source: "ip",
            })
          );
        } else {
          console.error("IP geolocation returned no usable coordinates", data);
        }
      } catch (error) {
        console.error("Error fetching IP geolocation:", error);
      }
    };

    const geocodeAddress = async (address: string) => {
      try {
        // Use Nominatim (OpenStreetMap) for simple free geocoding
        const q = encodeURIComponent(address);
        const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
        const resp = await fetch(url, {
          headers: { "User-Agent": "service-hub/1.0" },
        });
        const data = await resp.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);
          dispatch(
            setDetectedGeolocation({ latitude: lat, longitude: lon, source: "profile" })
          );
          return true;
        }
      } catch (err) {
        console.warn("Profile address geocoding failed", err);
      }
      return false;
    };

    const tryProfileAddressFirst = async () => {
      if (user && user.profile && user.profile.address) {
        const fullAddress = `${user.profile.address}${
          user.profile.city ? ", " + user.profile.city : ""
        }${user.profile.country ? ", " + user.profile.country : ""}`;
        const ok = await geocodeAddress(fullAddress);
        if (ok) return;
      }
      // Fallback to browser/IP geolocation
      getBrowserGeolocation();
    };

    tryProfileAddressFirst();
  }, [dispatch]);
};
