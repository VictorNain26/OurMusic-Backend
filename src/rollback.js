const rollback = new Umzug({
  migrations: { glob: 'migrations/*.js' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

rollback
  .down()
  .then(() => {
    console.log('⏪ Dernière migration annulée');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur rollback :', err);
    process.exit(1);
  });
