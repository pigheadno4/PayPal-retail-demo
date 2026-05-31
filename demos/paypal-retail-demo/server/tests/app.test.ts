import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";

import type { Express } from "express";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";

describe("Express app shell", () => {
  it("returns the standard API success shape from the health endpoint", async () => {
    const response = await requestApp(createApp(), "GET", "/api/health");

    expect(response.status).toBe(200);
    expect(response.json).toEqual({
      ok: true,
      data: {
        service: "paypal-retail-demo",
        status: "ok",
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });

  it("returns the standard API error shape for unknown routes", async () => {
    const response = await requestApp(createApp(), "GET", "/api/missing-route");

    expect(response.status).toBe(404);
    expect(response.json).toEqual({
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "The requested API route was not found.",
        details: {
          path: "/api/missing-route",
        },
      },
      debug_id: expect.stringMatching(/^dbg_[a-z0-9]+$/),
    });
  });
});

async function requestApp(
  app: Express,
  method: string,
  path: string,
): Promise<{ readonly status: number; readonly json: unknown }> {
  const responseChunks: Buffer[] = [];
  const socket = new Duplex({
    read() {
      return undefined;
    },
    write(chunk: Buffer | string, _encoding, callback) {
      responseChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      callback();
    },
  });
  const request = new IncomingMessage(socket);
  request.method = method;
  request.url = path;
  request.headers = {};
  const response = new ServerResponse(request);
  response.assignSocket(socket);

  await new Promise<void>((resolve, reject) => {
    response.on("finish", resolve);
    response.on("error", reject);
    app.handle(request, response, (error: unknown) => {
      reject(error ?? new Error(`request was not handled: ${method} ${path}`));
    });
  });

  const rawResponse = Buffer.concat(responseChunks).toString("utf8");
  const [, body = ""] = rawResponse.split("\r\n\r\n");

  return {
    status: response.statusCode,
    json: JSON.parse(body),
  };
}
