import fs from 'fs/promises';
import jwt from 'jsonwebtoken';

export const delay = ms => new Promise(res => setTimeout(res, ms));

export async function runCommand(cmd, options = {}) {
  const proc = Bun.spawn(cmd, { ...options, stdout: 'pipe', stderr: 'pipe' });
  await proc.exited;
  const stdout = proc.stdout ? await new Response(proc.stdout).text() : '';
  const stderr = proc.stderr ? await new Response(proc.stderr).text() : '';
  if (stderr.trim()) throw new Error(stderr.trim());
  return stdout.trim();
}

export const fileExists = async path => {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
};

export const ensureDirectoryExists = async path => {
  try {
    await fs.access(path);
    await fs.chmod(path, 0o777);
  } catch {
    await fs.mkdir(path, { recursive: true, mode: 0o777 });
  }
};

export const signAccessToken = user =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, Bun.env.JWT_SECRET, {
    expiresIn: '15m',
  });
export const signRefreshToken = user =>
  jwt.sign({ id: user.id, email: user.email, role: user.role }, Bun.env.JWT_SECRET, {
    expiresIn: '7d',
  });
export const verifyToken = token => {
  try {
    return jwt.verify(token, Bun.env.JWT_SECRET);
  } catch {
    return null;
  }
};

export const createRefreshCookie = token =>
  `refresh=${token}; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=604800`;
export const clearRefreshCookie = () =>
  `refresh=; HttpOnly; Secure; SameSite=None; Path=/; Max-Age=0`;

export const jsonResponse = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
export const errorResponse = (message, status = 500, headers = {}) =>
  jsonResponse({ error: message }, status, headers);
export const unauthorizedResponse = (headers = {}) =>
  errorResponse('Non authentifié', 401, headers);
