const { Umzug, SequelizeStorage } = require('umzug');
const sequelize = require('./src/db.js').default;

const umzug = new Umzug({
  migrations: { glob: 'migrations/*.js' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

umzug
  .up()
  .then(() => {
    console.log('✅ Migrations exécutées avec succès');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur pendant la migration :', err);
    process.exit(1);
  });
