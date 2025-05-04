import fs from 'fs/promises';

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
export async function runCommand(args, options = {}) {
  const proc = Bun.spawn(args, {
    stdout: 'pipe',
    stderr: 'pipe',
    ...options,
  });

  const stdout = new TextDecoder().decode((await proc.stdout?.text()) ?? '').trim();
  const stderr = new TextDecoder().decode((await proc.stderr?.text()) ?? '').trim();

  if (proc.exitCode !== 0) {
    console.error('[runCommand Error]', stderr);
    throw new Error(stderr || `Commande échouée avec code ${proc.exitCode}`);
  }

  // Afficher le stderr en warning non bloquant
  if (stderr) {
    console.warn('[runCommand Warning]', stderr);
  }

  return stdout;
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
