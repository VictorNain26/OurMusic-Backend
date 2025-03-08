// src/db.js
import { Sequelize } from "sequelize";
import defineUser from "./models/User.js";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "db",
    dialect: "postgres",
    logging: false, // Désactive les logs SQL (optionnel)
  }
);

// Initialisation du modèle User
export const User = defineUser(sequelize);
export default sequelize;

export async function initDatabase() {
  try {
    // Vérification de la connexion
    await sequelize.authenticate();
    console.log("🎉 Connexion réussie à la base de données PostgreSQL.");

    // Synchronisation des modèles avec la base de données
    await sequelize.sync();
    console.log("🔄 Les modèles ont été synchronisés avec la base de données.");

    // Création de l'administrateur si les variables d'environnement sont définies
    const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
    if (ADMIN_EMAIL && ADMIN_USERNAME && ADMIN_PASSWORD) {
      const existingAdmin = await User.findOne({ where: { email: ADMIN_EMAIL } });
      if (!existingAdmin) {
        await User.create({
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          role: "admin",
        });
        console.log(`✅ Compte administrateur créé : ${ADMIN_EMAIL}`);
      } else {
        console.log(`ℹ️ Compte administrateur déjà existant : ${existingAdmin.email}`);
      }
    } else {
      console.log("⚠️ Variables d'environnement pour l'administrateur non définies. Aucun admin créé.");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la connexion ou de la synchronisation à la base de données:", error);
  }
}
