import { login, register, refresh, logout, me } from "../services/authService.js";

export const authRoutes = {
  "POST:/api/auth/register": (req, headers) => register(req, headers),
  "POST:/api/auth/login": (req, headers) => login(req, headers),
  "POST:/api/auth/refresh": (req, headers) => refresh(req, headers),
  "GET:/api/auth/me": (req, headers) => me(req, headers),
  "POST:/api/auth/logout": (req, headers) => logout(req, headers),
};