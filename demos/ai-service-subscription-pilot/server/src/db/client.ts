import postgres from "postgres";

export type DatabaseClient = ReturnType<typeof postgres>;

export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  return postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });
}
