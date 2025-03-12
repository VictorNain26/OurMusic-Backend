// migrations/20250306190000-create-likedtracks.cjs
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('LikedTracks', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      artist: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      artwork: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      youtubeUrl: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      UserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
    // Index composite pour éviter les doublons par utilisateur
    await queryInterface.addIndex('LikedTracks', ['UserId', 'title', 'artist'], {
      unique: true,
      name: 'unique_user_track',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('LikedTracks');
  },
};
