//import axios from "axios";
//import { store } from "../stores/globalStore"; // Assurez-vous que le chemin est correct

import { APIResponse } from "../models/api.response";
import { API_URL } from "../utils/globals";
import api from "./api";
import { getRecaptchaToken } from "../utils/recaptcha";

export const authService = {
  login: async (email: string, password: string) => {
    try {
      console.log(process.env.API_URL);
      const token = await getRecaptchaToken("login");
      const response = await api.post(
        `${API_URL}/v1/auth/login`,
        {
          email,
          password,
          recaptchaToken: token,
        },
        { headers: { "Content-Type": "application/json" } },
      );
      return {
        user: response.data.user,
        token: response.data.access_token,
        refreshToken: response.data.refresh_token,
      };
    } catch (error: any) {
      throw error.response?.data?.message || "Login failed";
    }
  },
  /**
   * Exchanges the refresh token for a new access token.
   * The token is single-use: the response carries its replacement, which the
   * caller must persist before the next refresh.
   */
  async refreshToken(refreshToken: string) {
    try {
      const { data } = await api.post(`${API_URL}/v1/auth/refresh`, {
        refresh_token: refreshToken,
      });
      return data;
    } catch (error) {
      console.error("Erreur lors du rafraîchissement du token :", error);
      throw error;
    }
  },
  /** Revokes the refresh token server-side so the session cannot be resumed. */
  async logout(refreshToken: string) {
    try {
      await api.post(`${API_URL}/v1/auth/logout`, {
        refresh_token: refreshToken,
      });
    } catch (error) {
      // Best-effort: the local session is cleared regardless.
      console.warn("Erreur lors de la révocation du refresh token :", error);
    }
  },
  async me() {
    try {
      const { data } = await api.get(`${API_URL}/v1/users/me`);
      return data;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'utilisateur :", error);
      throw error;
    }
  },
  async register(
    email: string,
    password: string,
    userType: "customer" | "repairer" = "customer",
  ): Promise<APIResponse> {
    try {
      const token = await getRecaptchaToken("register");
      const { data } = await api.post(`${API_URL}/v1/users/register`, {
        email,
        password,
        recaptchaToken: token,
        userType,
      });
      return {
        data,
        ok: true,
      };
    } catch (error: any) {
      console.log(error.response.data);
      if (error.response.data && error.response.data.message) {
        return {
          ok: false,
          error: error.response.data.message,
        };
      }
      console.error("Erreur lors de l'inscription :", error);
      throw error;
    }
  },
  async updateProfile(
    userId: number,
    firstName: string,
    lastName: string,
    phone: string,
    address: string,
    city: string,
    country: string,
  ) {
    try {
      const { data } = await api.put(`${API_URL}/v1/users/`, {
        userId: userId,
        profile: {
          firstName,
          lastName,
          phone,
          address,
          city,
          country,
        },
      });
      return data;
    } catch (error) {
      console.error("Erreur lors de l'inscription :", error);
      throw error;
    }
  },

  async confirmAccount(token: string): Promise<APIResponse> {
    try {
      const { data } = await api.get(`${API_URL}/v1/users/confirm/${token}`);
      return {
        ok: true,
        data,
      };
    } catch (error) {
      console.error("Erreur lors de la confirmation du token:", error);
      return {
        ok: false,
        error: "Error confirming token",
      };
    }
  },

  async resetPasswordRequest(email: string): Promise<APIResponse> {
    try {
      const { data } = await api.post(
        `${API_URL}/v1/users/reset-password-request`,
        { email },
      );
      return {
        ok: true,
        data,
      };
    } catch (error) {
      console.error("Error requesting password reset:", error);
      return {
        ok: false,
        error: "Error requesting password reset",
      };
    }
  },
  async resetPassword(
    token: string,
    newPassword: string,
    email: string,
  ): Promise<APIResponse> {
    try {
      const { data } = await api.post(
        `${API_URL}/v1/users/reset-password/${token}`,
        { newPassword, email },
      );
      return {
        ok: true,
        data,
      };
    } catch (error: any) {
      console.error("Error resetting password:", error.response.data.message);
      return {
        ok: false,
        error: error.response.data.message ?? "Error resetting password",
      };
    }
  },
};
