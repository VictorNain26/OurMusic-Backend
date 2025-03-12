import bcrypt from "bcryptjs";
import { User } from "../db.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";
import { jsonResponse, errorResponse, unauthorizedResponse } from "../utils/response.js";
import { createRefreshCookie, clearRefreshCookie } from "../utils/cookies.js";

export async function register(req, headers) {
  const { username, email, password } = await req.json();
  if (!username || !email || !password) {
    return errorResponse("Tous les champs sont requis", 400, headers);
  }
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) return errorResponse("Cet email est déjà utilisé", 400, headers);
    const newUser = await User.create({ username, email, password });
    return jsonResponse({
      message: "Utilisateur créé",
      user: { id: newUser.id, email: newUser.email, username: newUser.username },
    }, 201, headers);
  } catch (err) {
    return errorResponse(err.message, 500, headers);
  }
}

export async function login(req, headers) {
  const { email, password } = await req.json();
  const user = await User.findOne({ where: { email } });
  if (!user) return unauthorizedResponse(headers);
  const match = await bcrypt.compare(password, user.password);
  if (!match) return unauthorizedResponse(headers);

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  const refreshCookie = createRefreshCookie(refreshToken);

  return new Response(JSON.stringify({
    message: "Connexion réussie",
    accessToken,
    user: { id: user.id, email: user.email, username: user.username, role: user.role },
  }), {
    status: 200,
    headers: {
      ...headers,
      "Set-Cookie": refreshCookie,
      "Content-Type": "application/json",
    },
  });
}

export async function refresh(req, headers) {
  const cookieHeader = req.headers.get("Cookie") || "";
  const match = cookieHeader.match(/(^|;\s*)refresh=([^;]+)/);
  if (!match) return unauthorizedResponse(headers);

  const token = match[2];
  const decoded = verifyToken(token);
  if (!decoded) return unauthorizedResponse(headers);

  const user = await User.findByPk(decoded.id);
  if (!user) return unauthorizedResponse(headers);

  const newAccess = signAccessToken(user);
  return jsonResponse({ accessToken: newAccess }, 200, headers);
}

export async function me(req, headers) {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return unauthorizedResponse(headers);
  const token = authHeader.replace("Bearer ", "").trim();
  const decoded = verifyToken(token);
  if (!decoded) return unauthorizedResponse(headers);

  const user = await User.findByPk(decoded.id);
  if (!user) return unauthorizedResponse(headers);

  return jsonResponse({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
  }, 200, headers);
}

export async function logout(req, headers) {
  const clearedCookie = clearRefreshCookie();
  return new Response(JSON.stringify({ message: "Déconnexion réussie" }), {
    status: 200,
    headers: {
      ...headers,
      "Set-Cookie": clearedCookie,
      "Content-Type": "application/json",
    },
  });
}