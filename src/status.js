const status = new Umzug({
  migrations: { glob: 'migrations/*.js' },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

status
  .pending()
  .then(pending => {
    console.log('🕓 Migrations en attente :');
    console.table(pending.map(m => m.name));

    return status.executed();
  })
  .then(executed => {
    console.log('✅ Migrations exécutées :');
    console.table(executed.map(m => m.name));
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur status :', err);
    process.exit(1);
  });
