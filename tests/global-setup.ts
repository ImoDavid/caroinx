import { MongoMemoryServer } from "mongodb-memory-server";
import type { TestProject } from "vitest/node";

/**
 * Starts one in-memory MongoDB for the entire test run and hands its base URI to
 * every test file. Nothing in the suite ever touches a real cluster, so tests
 * need no credentials and cannot corrupt real data.
 */
declare module "vitest" {
  interface ProvidedContext {
    mongoBaseUri: string;
  }
}

export default async function setup(project: TestProject) {
  // Cached between runs; the directory is already gitignored.
  process.env.MONGOMS_DOWNLOAD_DIR ??= ".cache/mongodb-binaries";

  const server = await MongoMemoryServer.create();
  project.provide("mongoBaseUri", server.getUri());

  return async () => {
    await server.stop();
  };
}
