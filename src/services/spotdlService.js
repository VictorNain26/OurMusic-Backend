import path from 'path';
import fs from 'fs/promises';

if (!PLAYLIST_PATH) {
  throw new Error('❌ La variable PLAYLIST_PATH est requise pour spotDL');
}

// ✅ Nettoie les vieux fichiers `.temp`, `.spotdl`
export async function cleanupSpotdlFiles(send) {
  const allDirs = await fs.readdir(PLAYLIST_PATH);
  for (const dir of allDirs) {
    const fullPath = path.join(PLAYLIST_PATH, dir);
    const stat = await fs.stat(fullPath);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(fullPath);
    for (const file of files) {
      if (file.endsWith('.temp') || file.endsWith('.spotdl')) {
        const filePath = path.join(fullPath, file);
        await fs.unlink(filePath);
        send({ message: `🗑️ Fichier supprimé : ${filePath}` });
      }
    }
  }

  send({ message: `✅ Nettoyage terminé.` });
}
