// Snowflake access for the Price Clips feature: queries OPENFLOW/PROPHET
// schemas directly with a dedicated service account (key-pair auth), kept
// entirely separate from Tensor (which only works inside a Claude/MCP
// session, not a deployed server). Mirrors the lazy-singleton pattern in
// src/lib/supabase/server.ts so importing this module never crashes a build
// before the service account exists — it only throws when a query actually
// runs without credentials configured.
//
// NOT YET VERIFIED against a live account: this was written against the
// documented snowflake-sdk API and the query shapes confirmed in the sports
// toolkit's SPORTS.md, but needs a real smoke test once DevOps/Engineering
// provisions the service account (see README / plan notes on the
// event↔team-mapping risk).
import snowflake from "snowflake-sdk";

let _connection: snowflake.Connection | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} environment variable (Snowflake service account not configured yet).`);
  return value;
}

function createConnection(): snowflake.Connection {
  return snowflake.createConnection({
    account: requiredEnv("SNOWFLAKE_ACCOUNT"),
    username: requiredEnv("SNOWFLAKE_USER"),
    authenticator: "SNOWFLAKE_JWT",
    // Private key PEM, with literal "\n" sequences (as stored in a single-line
    // env var) normalized back to real newlines.
    privateKey: requiredEnv("SNOWFLAKE_PRIVATE_KEY").replace(/\\n/g, "\n"),
    warehouse: requiredEnv("SNOWFLAKE_WAREHOUSE"),
    role: process.env.SNOWFLAKE_ROLE || undefined,
    database: process.env.SNOWFLAKE_DATABASE || undefined,
  });
}

function connectAsync(connection: snowflake.Connection): Promise<snowflake.Connection> {
  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

async function getConnection(): Promise<snowflake.Connection> {
  if (_connection && _connection.isUp()) return _connection;
  _connection = await connectAsync(createConnection());
  return _connection;
}

/** Runs a parameterized query and returns the result rows. Always use binds for user-supplied values — never string-interpolate into sqlText. */
export async function querySnowflake<T = Record<string, unknown>>(sqlText: string, binds: snowflake.Binds = []): Promise<T[]> {
  const connection = await getConnection();
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText,
      binds,
      complete: (err, _statement, rows) => {
        if (err) reject(err);
        else resolve((rows ?? []) as T[]);
      },
    });
  });
}
