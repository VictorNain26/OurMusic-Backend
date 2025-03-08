const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config();

module.exports = {
  async up(queryInterface) {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

    // Vérification préalable pour éviter la duplication
    const [existingUsers] = await queryInterface.sequelize.query(
      `SELECT id FROM "Users" WHERE username = :username LIMIT 1;`,
      {
        replacements: { username: process.env.ADMIN_USERNAME },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );

    if (!existingUsers) {
      await queryInterface.bulkInsert('Users', [
        {
          username: process.env.ADMIN_USERNAME,
          email: process.env.ADMIN_EMAIL,
          password: hashedPassword,
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      console.log('✅ Admin user created successfully.');
    } else {
      console.log('⚠️ Admin user already exists, skipping seed.');
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete(
      'Users',
      { email: process.env.ADMIN_EMAIL },
      {},
    );
  },
};
