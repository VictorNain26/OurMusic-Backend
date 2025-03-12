import { DataTypes } from 'sequelize';

export default sequelize => {
  return sequelize.define(
    'LikedTrack',
    {
      title: { type: DataTypes.STRING, allowNull: false },
      artist: { type: DataTypes.STRING, allowNull: false },
      artwork: { type: DataTypes.STRING, allowNull: false },
      youtubeUrl: { type: DataTypes.STRING, allowNull: false, validate: { isUrl: true } },
    },
    {
      indexes: [{ unique: true, fields: ['UserId', 'title', 'artist'] }],
    }
  );
};
