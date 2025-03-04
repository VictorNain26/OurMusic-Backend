// src/utils.js
import fs from "fs/promises";

export async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
    await fs.chmod(dirPath, 0o777);
  } catch {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o777 });
    console.log(`Directory created: ${dirPath}`);
  }
}

export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function runCommand(cmd, options = {}) {
  const proc = Bun.spawn(cmd, { ...options, stdout: "pipe", stderr: "pipe" });
  await proc.exited;
  const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : "";
  const stderrText = proc.stderr ? await new Response(proc.stderr).text() : "";
  if (stderrText.trim()) {
    console.error(stderrText.trim());
    throw new Error(stderrText.trim());
  }
  return stdoutText.trim();
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function getCorsHeaders(req) {
  const origin = req.headers.get("Origin") || "https://ourmusic.fr";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}
