import { Sequelize, Op } from 'sequelize';
import defineUser from './models/User.js';
import defineLikedTrack from './models/LikedTrack.js';

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST || 'db',
  dialect: 'postgres',
  logging: false,
});

export const User = defineUser(sequelize);
export const LikedTrack = defineLikedTrack(sequelize);

User.hasMany(LikedTrack, { foreignKey: 'UserId', onDelete: 'CASCADE' });
LikedTrack.belongsTo(User, { foreignKey: 'UserId' });

export default sequelize;

export async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('🎉 Connexion réussie à PostgreSQL.');
    await sequelize.sync();
    console.log('🔄 Modèles synchronisés.');

    const { ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
    if (ADMIN_EMAIL && ADMIN_USERNAME && ADMIN_PASSWORD) {
      const adminExists = await User.findOne({
        where: { [Op.or]: [{ email: ADMIN_EMAIL }, { username: ADMIN_USERNAME }] },
      });
      if (!adminExists) {
        await User.create({
          username: ADMIN_USERNAME,
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          role: 'admin',
        });
        console.log(`✅ Admin créé : ${ADMIN_EMAIL}`);
      }
    }
  } catch (err) {
    console.error('❌ Erreur DB:', err);
  }
}
