import fs from 'fs/promises';
import { Bun } from 'bun';

// ✅ Vérifie et crée un dossier s'il n'existe pas, avec permissions adaptées
export async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
    await fs.chmod(dirPath, 0o777);
  } catch {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o777 });
    console.log(`✅ Dossier créé : ${dirPath}`);
  }
}

// ✅ Exécute une commande externe et retourne la sortie standard ou génère une erreur
export async function runCommand(cmd, options = {}) {
  const proc = Bun.spawn(cmd, { ...options, stdout: 'pipe', stderr: 'pipe' });
  await proc.exited;

  const stdoutText = proc.stdout ? await new Response(proc.stdout).text() : '';
  const stderrText = proc.stderr ? await new Response(proc.stderr).text() : '';

  if (stderrText.trim()) {
    console.error('[runCommand Error]', stderrText.trim());
    throw new Error(stderrText.trim());
  }

  return stdoutText.trim();
}

// ✅ Attente asynchrone
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ✅ Vérifie l'existence d'un fichier
export async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
