// src/models/LikedTrack.js
import { DataTypes } from 'sequelize';

export default sequelize => {
  const LikedTrack = sequelize.define(
    'LikedTrack',
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      artist: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      artwork: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      youtubeUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isUrl: true,
        },
      },
    },
    {
      indexes: [
        {
          unique: true,
          // Empêche qu'un utilisateur like deux fois le même morceau (même titre et artiste)
          fields: ['UserId', 'title', 'artist'],
        },
      ],
    },
  );
  return LikedTrack;
};
