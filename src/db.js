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
  }
);

// Initialisation du modèle User
export const User = defineUser(sequelize);
export default sequelize;

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log("🎉 Connexion réussie à la base de données PostgreSQL.");

    // Vérifie si un administrateur existe déjà
    const existingAdmin = await User.findOne({ where: { email: process.env.ADMIN_EMAIL } });

    if (!existingAdmin) {
      // Crée uniquement l'admin s'il n'existe pas
      await User.create({
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD,
        role: "admin",
      });
      console.log(`✅ Compte administrateur créé : ${process.env.ADMIN_EMAIL}`);
    } else {
      console.log(`ℹ️ Compte administrateur déjà existant : ${existingAdmin.email}`);
    }

  } catch (error) {
    console.error("❌ Impossible de se connecter à la base de données :", error.message);
  }
}

