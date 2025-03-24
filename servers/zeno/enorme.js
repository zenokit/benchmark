/**
 * Script pour migrer automatiquement d'une structure basée sur fichiers
 * vers une structure basée sur dossiers
 * 
 * Usage: node migrate-to-folder-structure.js
 */

const fs = require('fs').promises;
const path = require('path');
const { existsSync } = require('fs');

// Configuration
const ROOT_DIR = path.resolve(process.cwd());
const ROUTES_DIR = path.join(ROOT_DIR, 'routes');
const BACKUP_DIR = path.join(ROOT_DIR, 'routes_backup_' + Date.now());

// Statistiques
const stats = {
  filesToProcess: 0,
  filesProcessed: 0,
  foldersCreated: 0,
  skipped: 0,
  errors: []
};

/**
 * Crée une sauvegarde du dossier routes
 */
async function backupRoutes() {
  console.log(`Sauvegarde du dossier routes dans ${BACKUP_DIR}...`);
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  
  async function copyDir(src, dest) {
    const entries = await fs.readdir(src, { withFileTypes: true });
    await fs.mkdir(dest, { recursive: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
  
  await copyDir(ROUTES_DIR, BACKUP_DIR);
  console.log('Sauvegarde terminée!');
}

/**
 * Compte le nombre de fichiers à traiter
 */
async function countFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let count = 0;
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      count += await countFiles(fullPath);
    } else if (entry.name.endsWith('.ts') && entry.name !== '+middleware.ts') {
      count++;
    }
  }
  
  return count;
}

/**
 * Migre un fichier de route vers la structure de dossiers
 */
async function migrateFile(filePath) {
  try {
    const dirPath = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    // Ignorer les fichiers middleware et non-typescript
    if (fileName === '+middleware.ts' || !fileName.endsWith('.ts')) {
      stats.skipped++;
      return;
    }
    
    // Extraire le nom de la route sans extension
    const routeName = fileName.replace(/\.ts$/, '');
    
    // Créer le nouveau dossier pour cette route
    const newDirPath = path.join(dirPath, routeName);
    const newFilePath = path.join(newDirPath, 'index.ts');
    
    // Vérifier si le dossier existe déjà
    if (existsSync(newDirPath)) {
      console.log(`⚠️ Le dossier ${newDirPath} existe déjà, vérification...`);
      
      // Si le fichier index.ts existe aussi, nous devons le vérifier
      if (existsSync(newFilePath)) {
        console.log(`⚠️ Le fichier ${newFilePath} existe déjà, ignoré!`);
        stats.skipped++;
        return;
      }
    }
    
    // Créer le dossier
    await fs.mkdir(newDirPath, { recursive: true });
    stats.foldersCreated++;
    
    // Copier le contenu du fichier vers index.ts
    const content = await fs.readFile(filePath, 'utf8');
    await fs.writeFile(newFilePath, content, 'utf8');
    
    // Supprimer le fichier original
    await fs.unlink(filePath);
    
    stats.filesProcessed++;
    console.log(`✅ Migré: ${filePath} -> ${newFilePath}`);
  } catch (error) {
    stats.errors.push({ file: filePath, error: error.message });
    console.error(`❌ Erreur lors de la migration de ${filePath}:`, error.message);
  }
}

/**
 * Migre tous les fichiers dans un dossier de façon récursive
 */
async function migrateDir(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  // Traiter d'abord les fichiers
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      await migrateFile(path.join(dir, entry.name));
    }
  }
  
  // Puis traiter les sous-dossiers
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await migrateDir(path.join(dir, entry.name));
    }
  }
}

/**
 * Point d'entrée principal
 */
async function main() {
  try {
    console.log('🚀 Début de la migration vers une structure basée sur les dossiers');
    
    // Vérifier si le dossier routes existe
    if (!existsSync(ROUTES_DIR)) {
      console.error(`❌ Le dossier routes n'existe pas à l'emplacement: ${ROUTES_DIR}`);
      process.exit(1);
    }
    
    // Faire une sauvegarde
    await backupRoutes();
    
    // Compter les fichiers à traiter
    stats.filesToProcess = await countFiles(ROUTES_DIR);
    console.log(`Fichiers à traiter: ${stats.filesToProcess}`);
    
    // Commencer la migration
    await migrateDir(ROUTES_DIR);
    
    // Afficher les statistiques
    console.log('\n📊 Statistiques de migration:');
    console.log(`- Fichiers traités: ${stats.filesProcessed}/${stats.filesToProcess}`);
    console.log(`- Dossiers créés: ${stats.foldersCreated}`);
    console.log(`- Fichiers ignorés: ${stats.skipped}`);
    console.log(`- Erreurs: ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️ Certains fichiers n\'ont pas pu être migrés:');
      stats.errors.forEach(err => {
        console.log(`- ${err.file}: ${err.error}`);
      });
      console.log(`\nVous pouvez les migrer manuellement ou restaurer la sauvegarde depuis ${BACKUP_DIR}`);
    }
    
    console.log('\n✅ Migration terminée!');
    console.log('N\'oubliez pas de mettre à jour src/core/router.ts vers le nouveau folderRouter.ts');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    console.log(`Vous pouvez restaurer la sauvegarde depuis ${BACKUP_DIR}`);
    process.exit(1);
  }
}

// Lancer le script
main().catch(console.error);