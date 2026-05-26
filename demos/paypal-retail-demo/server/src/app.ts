import express from "express";

export function createApp() {
  const app = express();

  app.get("/health", (_request, response) => {
    response.json({
      service: "paypal-retail-demo",
      status: "ok",
    });
  });

  return app;
}
