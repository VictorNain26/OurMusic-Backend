const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    await queryInterface.bulkInsert('Users', [{
      username: process.env.ADMIN_USERNAME,
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }], {});
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('Users', { email: process.env.ADMIN_EMAIL }, {});
  }
};
