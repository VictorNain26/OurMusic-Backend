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

    await sequelize.sync({ alter: true });

    const [admin, created] = await User.findOrCreate({
      where: { email: process.env.ADMIN_EMAIL },
      defaults: {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
        role: "admin" // ✅ Assure-toi que le compte admin a bien le rôle "admin"
      },
    });

    if (created) {
      console.log(`✅ Compte administrateur créé : ${admin.email} (rôle: ${admin.role})`);
    } else {
      console.log(`ℹ️ Compte administrateur déjà existant : ${admin.email} (rôle: ${admin.role})`);
    }

  } catch (error) {
    console.error("❌ Impossible de se connecter à la base de données :", error.message);
  }
}
