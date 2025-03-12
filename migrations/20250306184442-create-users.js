export const up = async ({ context: queryInterface }) => {
  await queryInterface.createTable('Users', {
    id: { type: 'INTEGER', primaryKey: true, autoIncrement: true, allowNull: false },
    username: { type: 'VARCHAR(255)', allowNull: false, unique: true },
    email: { type: 'VARCHAR(255)', allowNull: false, unique: true },
    password: { type: 'VARCHAR(255)', allowNull: false },
    role: { type: 'VARCHAR(50)', allowNull: false, defaultValue: 'user' },
    created_at: { type: 'TIMESTAMP', defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
  });
};

export const down = async ({ context: queryInterface }) => {
  await queryInterface.dropTable('Users');
};
