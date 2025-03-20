export default {
  schema: './src/db/schema.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
