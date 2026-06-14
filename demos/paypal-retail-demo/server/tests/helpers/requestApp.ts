import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";

import type { Express } from "express";

export interface AppResponse {
  readonly status: number;
  readonly headers: Record<string, number | string | string[] | undefined>;
  readonly json: unknown;
}

export interface RequestAppOptions {
  readonly headers?: Record<string, string>;
  readonly json?: unknown;
}

export async function requestApp(
  app: Express,
  method: string,
  path: string,
  options: RequestAppOptions = {},
): Promise<AppResponse> {
  const requestBody =
    options.json === undefined ? null : Buffer.from(JSON.stringify(options.json));
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
  request.headers = {
    ...options.headers,
    ...(requestBody
      ? {
          "content-type": "application/json",
          "content-length": String(requestBody.length),
        }
      : {}),
  };
  const response = new ServerResponse(request);
  response.assignSocket(socket);

  await new Promise<void>((resolve, reject) => {
    response.on("finish", resolve);
    response.on("error", reject);
    app.handle(request, response, (error: unknown) => {
      reject(error ?? new Error(`request was not handled: ${method} ${path}`));
    });

    if (requestBody) {
      request.emit("data", requestBody);
    }
    request.emit("end");
  });

  const rawResponse = Buffer.concat(responseChunks).toString("utf8");
  const [, body = ""] = rawResponse.split("\r\n\r\n");

  return {
    status: response.statusCode,
    headers: response.getHeaders(),
    json: JSON.parse(body),
  };
}
