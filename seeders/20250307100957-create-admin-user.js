// seeders/create-admin-user.js
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

export default {
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
