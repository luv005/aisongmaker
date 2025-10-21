import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

const connectionUrl = new URL(connectionString);
const database = connectionUrl.pathname.replace(/^\//, "");
if (!database) {
  throw new Error("DATABASE_URL must include a database name");
}

const port = connectionUrl.port
  ? Number.parseInt(connectionUrl.port, 10)
  : 3306;

const credentials: {
  host: string;
  port?: number;
  database: string;
  user?: string;
  password?: string;
  ssl?: {
    rejectUnauthorized: boolean;
  };
} = {
  host: connectionUrl.hostname,
  port,
  database,
};

if (connectionUrl.username) {
  credentials.user = decodeURIComponent(connectionUrl.username);
}

if (connectionUrl.password) {
  credentials.password = decodeURIComponent(connectionUrl.password);
}

const isLocalhost = ["localhost", "127.0.0.1"].includes(connectionUrl.hostname);
if (!isLocalhost) {
  credentials.ssl = { rejectUnauthorized: true };
}

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: credentials,
});
