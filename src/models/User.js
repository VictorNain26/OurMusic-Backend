// src/models/User.js
import { DataTypes } from "sequelize";
import sequelize from "../db.js";
import bcrypt from "bcrypt";

const User = sequelize.define(
  "User",
  {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

// Hachage du mot de passe avant création
User.beforeCreate(async (user) => {
  const saltRounds = 10;
  user.password = await bcrypt.hash(user.password, saltRounds);
});

// Méthode d’instance pour vérifier le mot de passe
User.prototype.verifyPassword = function (password) {
  return bcrypt.compare(password, this.password);
};

export default User;
