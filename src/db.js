// src/db.js
import { Sequelize, Op } from 'sequelize';
import defineUser from './models/User.js';
import defineLikedTrack from './models/LikedTrack.js'; // Ajout du modèle LikedTrack

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'db',
  dialect: 'postgres',
  logging: false,
});

// Initialisation des modèles
export const User = defineUser(sequelize);
export const LikedTrack = defineLikedTrack(sequelize);

// Associations : un utilisateur peut avoir plusieurs morceaux likés
User.hasMany(LikedTrack, { foreignKey: 'UserId', onDelete: 'CASCADE' });
LikedTrack.belongsTo(User, { foreignKey: 'UserId' });

export default sequelize;

// La fonction initDatabase reste inchangée
export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('🎉 Connexion réussie à la base de données PostgreSQL.');
    await sequelize.sync();
    console.log('🔄 Les modèles ont été synchronisés avec la base de données.');

    // Création de l'administrateur (code existant)...
    const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
    if (ADMIN_EMAIL && ADMIN_USERNAME && ADMIN_PASSWORD) {
      const existingAdmin = await User.findOne({
        where: {
          [Op.or]: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }],
        },
      });
      if (!existingAdmin) {
        await User.create({
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          role: 'admin',
        });
        console.log(`✅ Compte administrateur créé : ${ADMIN_EMAIL}`);
      } else {
        console.log(`ℹ️ Compte administrateur déjà existant : ${existingAdmin.email}`);
      }
    } else {
      console.log(
        "⚠️ Variables d'environnement pour l'administrateur non définies. Aucun admin créé.",
      );
    }
  } catch (error) {
    console.error(
      '❌ Erreur lors de la connexion ou de la synchronisation à la base de données:',
      error,
    );
  }
}
