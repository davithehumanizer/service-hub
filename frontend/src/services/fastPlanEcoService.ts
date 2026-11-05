import api from "./api"; // Assuming a common API client
import { API_URL } from "../utils/globals"; // Assuming API_URL is defined here

interface Location {
  address: string;
  lat: number;
  lng: number;
}

interface Point {
  address: string;
  lat: number;
  lng: number;
}

interface CalculateRouteRequest {
  baseAddress: Location;
  followingAddresses: Location[];
  vehicle:
    | "car"
    | "electricCar"
    | "utility"
    | "electricUtility"
    | "bike"
    | "byFoot";
}

interface GeocodeAddressRequest {
  query: string;
}

interface GeocodeAddressResponse {
  address: string;
  lat: number;
  lng: number;
}

interface Geometry {
  coordinates: [number, number][]; // Array of [longitude, latitude] pairs
}

export interface CalculateRouteResponse {
  optimizedPoints: any[]; // Adjust based on actual response
  geometry: Geometry;
  totalDistance: number;
  totalTime: number;
  carbonFootprint: number;
}

interface ExportGoogleMapsRequest {
  waypoints: Point[];
  mode?: string;
  origin?: string;
  destination?: string;
  route?: Record<string, unknown>;
}

interface ExportGoogleMapsResponse {
  url: string;
}

export const fastPlanEcoService = {
  calculateRoute: async (
    data: CalculateRouteRequest
  ): Promise<CalculateRouteResponse> => {
    try {
      const response = await api.post(
        `${API_URL}/v1/fast-plan-eco/calculate-route`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to calculate route";
    }
  },

  geocodeAddress: async (
    data: GeocodeAddressRequest
  ): Promise<GeocodeAddressResponse> => {
    try {
      const response = await api.post(
        `${API_URL}/v1/fast-plan-eco/geocode-address`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to geocode address";
    }
  },

  exportGoogleMaps: async (
    data: ExportGoogleMapsRequest
  ): Promise<ExportGoogleMapsResponse> => {
    try {
      const response = await api.post(
        `${API_URL}/v1/fast-plan-eco/export-googlemaps`,
        data
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data?.message || "Failed to export to Google Maps";
    }
  },
};
