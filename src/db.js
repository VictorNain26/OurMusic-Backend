// src/db.js
import { Sequelize } from "sequelize";
import bcrypt from 'bcryptjs';

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "db",
    dialect: "postgres",
  }
);

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log("🎉 Connexion réussie à la base de données PostgreSQL.");

    const User = sequelize.define("User", {
      username: { type: Sequelize.STRING, allowNull: false, unique: true },
      email: { type: Sequelize.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
      password: { type: Sequelize.STRING, allowNull: false },
    });

    User.beforeCreate(async (user) => {
      user.password = await bcrypt.hash(user.password, 10);
    });

    User.prototype.verifyPassword = function (password) {
      return bcrypt.compare(password, this.password);
    };

    await sequelize.sync({ alter: true });

    const [admin, created] = await User.findOrCreate({
      where: { email: process.env.ADMIN_EMAIL },
      defaults: {
        username: process.env.ADMIN_USERNAME,
        password: process.env.ADMIN_PASSWORD,
      },
    });

    if (created) {
      console.log(`✅ Compte administrateur créé : ${admin.email}`);
    } else {
      console.log(`ℹ️ Compte administrateur déjà existant : ${admin.email}`);
    }

  } catch (error) {
    console.error("❌ Impossible de se connecter à la base de données :", error.message);
  }
}

export default sequelize;