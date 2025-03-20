export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
