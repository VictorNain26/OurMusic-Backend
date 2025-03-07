// src/db.js
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || "db",
  dialect: "postgres",
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("🎉 Connexion réussie à la base de données PostgreSQL.");
  } catch (error) {
    console.error("❌ Impossible de se connecter à la base de données :", error.message);
  }
}

// Appel immédiat pour tester la connexion au lancement
testConnection();

export default sequelize;
