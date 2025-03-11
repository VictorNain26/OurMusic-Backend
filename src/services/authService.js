import bcrypt from "bcryptjs";
import { User } from "../db.js";
import { signAccessToken, signRefreshToken } from "../utils/jwt.js";
import { jsonResponse, errorResponse, unauthorizedResponse } from "../utils/response.js";

export async function register(req, headers) {
  const { username, email, password } = await req.json();
  if (!username || !email || !password) {
    return errorResponse("Tous les champs sont requis", 400, headers);
  }
  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return errorResponse("Cet email est déjà utilisé", 400, headers);
    }
    const newUser = await User.create({ username, email, password });
    return jsonResponse({
      message: "Utilisateur créé",
      user: { id: newUser.id, email: newUser.email, username: newUser.username },
    }, 201, headers);
  } catch (err) {
    return errorResponse(err.message, 500, headers);
  }
}