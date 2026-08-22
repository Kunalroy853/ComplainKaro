import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/vocallabs';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: dbUrl,
  },
});
