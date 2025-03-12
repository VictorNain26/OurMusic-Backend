import dotenv from 'dotenv';
dotenv.config();

export default {
  schema: './src/db/schema.js',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
