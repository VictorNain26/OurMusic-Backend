// backend/models/User.js
export default (sequelize, DataTypes) => {
  const User = sequelize.define("User", {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      defaultValue: "user", // par défaut, rôle "user"
    },
  }, { timestamps: true });

  User.beforeCreate(async (user) => {
    const bcrypt = await import('bcryptjs');
    user.password = await bcrypt.hash(user.password, 10);
  });

  User.prototype.verifyPassword = async function (password) {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, this.password);
  };

  return User;
};
