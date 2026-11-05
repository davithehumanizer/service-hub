import axios from "axios";
import { type RootState } from "../stores/globalStore"; // Type du state
import { logout, refreshAccessToken } from "../stores/authSlice";
import { API_URL } from "../utils/globals";
import { telemetry } from "./telemetry.service";

const api = axios.create({
  baseURL: API_URL,
});

let getState: () => RootState; // Stockage de la fonction getState
let dispatch: any; // On stocke aussi `dispatch`

export const setStore = (store: any) => {
  getState = store.getState; // Injection dynamique du store
  dispatch = store.dispatch;
};

// ✅ Fonction pour récupérer dynamiquement le token sans import circulaire
api.interceptors.request.use(
  (config) => {
    try {
      const traceId = telemetry.generateTraceId();
      config.headers["x-trace-id"] = traceId;
      config.headers["x-correlation-id"] = traceId; // Start of a chain, so correlationId = traceId
      config.headers["x-session-id"] = telemetry.getSessionId();

      if (getState) {
        // Vérifie si la fonction est définie
        const state = getState();
        const token = state.auth.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de l'ajout du token dans l'intercepteur :",
        error,
      );
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si l'erreur est un 401 (Unauthorized) et que la requête n'a pas déjà été retentée
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Ne jamais tenter de rafraîchir la requête de refresh elle-même, ni la
      // révocation : sinon on boucle.
      if (
        originalRequest.url === `${API_URL}/v1/auth/refresh` ||
        originalRequest.url === `${API_URL}/v1/auth/logout`
      ) {
        console.warn("Refresh token request failed. Logging out.");
        dispatch(logout());
        return Promise.reject(error);
      }

      try {
        console.log("Rafraichissement du token...");
        const refreshResult = await dispatch(refreshAccessToken());
        if (
          refreshAccessToken.fulfilled.match(refreshResult) &&
          refreshResult.payload?.token
        ) {
          const newToken = refreshResult.payload.token;

          // Le store a déjà été mis à jour par le reducer ; on réinjecte juste
          // le nouveau token dans la requête rejouée.
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          dispatch(logout()); // Déconnecter l'utilisateur si le refresh échoue
        }
      } catch (refreshError) {
        console.error("Erreur lors du refresh token :", refreshError);
        dispatch(logout());
      }
    }

    return Promise.reject(error);
  },
);

export default api;
