import { IncomingMessage, ServerResponse } from "node:http";
import { Duplex } from "node:stream";

import type { Express } from "express";

export interface AppResponse {
  readonly status: number;
  readonly json: unknown;
}

export async function requestApp(
  app: Express,
  method: string,
  path: string,
): Promise<AppResponse> {
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
