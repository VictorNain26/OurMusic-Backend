const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    // Vérifier si l'admin existe déjà avant de le créer
    const existingAdmin = await queryInterface.rawSelect('Users', {
      where: {
        username: process.env.ADMIN_USERNAME,
      },
    }, ['id']);

    if (!existingAdmin) {
      await queryInterface.bulkInsert('Users', [{
        username: process.env.ADMIN_USERNAME,
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      }], {});
    } else {
      console.log('Admin user existe déjà, skipping seeder.');
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', { email: process.env.ADMIN_EMAIL }, {});
  }
};
