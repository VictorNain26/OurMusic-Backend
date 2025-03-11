import { verifyAccessToken } from "./verifyAccessToken.js";

export async function verifyAdmin(req) {
  const user = await verifyAccessToken(req);
  if (!user || user.role !== "admin") throw new Error("Accès refusé: droits administrateur requis.");
  return user;
}