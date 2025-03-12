import { Umzug, SequelizeStorage } from 'umzug';
import sequelize from './db.js';

const runMigrations = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connexion DB OK');
    const umzug = new Umzug({
      migrations: { glob: 'migrations/*.js' },
      context: sequelize.getQueryInterface(),
      storage: new SequelizeStorage({ sequelize }),
      logger: console,
    });
    await umzug.up();
    console.log('✅ Migrations terminées');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erreur migration:', err.message);
    process.exit(1);
  }
};
runMigrations();
