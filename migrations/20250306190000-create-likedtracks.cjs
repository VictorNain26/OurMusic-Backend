module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.createTable('LikedTracks', {
      id: {
        type: 'INTEGER',
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      title: {
        type: 'VARCHAR(255)',
        allowNull: false,
      },
      artist: {
        type: 'VARCHAR(255)',
        allowNull: false,
      },
      artwork: {
        type: 'VARCHAR(1024)',
        allowNull: false,
      },
      youtubeUrl: {
        type: 'VARCHAR(1024)',
        allowNull: false,
      },
      UserId: {
        type: 'INTEGER',
        allowNull: false,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE',
      },
      created_at: {
        type: 'TIMESTAMP',
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
    await queryInterface.addConstraint('LikedTracks', {
      fields: ['UserId', 'title', 'artist'],
      type: 'unique',
      name: 'unique_user_track',
    });
  },
  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('LikedTracks');
  },
};
