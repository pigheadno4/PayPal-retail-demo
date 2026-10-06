import express from "express";
import request from "supertest";
import { expect, it } from "vitest";
import { createReactivationRouter } from "./reactivation.js";
const unavailable=async()=>{throw new Error("reactivation_not_found");};
const app=express();app.use(express.json());app.use("/api/v1",createReactivationRouter({verifyToken:async token=>token==='synthetic'?{userId:"synthetic-user",email:"fixture@example.test"}:null,entry:unavailable,review:unavailable,confirm:unavailable,status:unavailable}));
it("authenticates owned recovery routes and conceals missing/cross-owner state",async()=>{
  expect((await request(app).get("/api/v1/me/reactivation")).status).toBe(401);
  const response=await request(app).get("/api/v1/me/reactivation").set("Authorization","Bearer synthetic");expect(response.status).toBe(404);expect(response.body).toEqual({error:{code:"not_found"}});expect(response.headers['cache-control']).toBe("private, no-store");
});
it("rejects client token/amount overrides and invalid status IDs",async()=>{
  const response=await request(app).post("/api/v1/me/reactivation/confirm").set("Authorization","Bearer synthetic").send({token:"injected",amount:1});expect(response.status).toBe(400);
  expect((await request(app).get("/api/v1/me/reactivation/operations/not-an-id").set("Authorization","Bearer synthetic")).status).toBe(400);
});
