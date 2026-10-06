import { Router, type Response } from "express";
import { z } from "zod";
import { requireBearerAuth } from "../middleware/auth.js";
import { reactivationEntrySchema, reactivationReviewRequestSchema, reactivationReviewSchema, reactivationConfirmRequestSchema, reactivationOutcomeSchema } from "../../../shared/src/reactivation.js";
import type { VerifyToken } from "../middleware/auth.js";
import type { ReactivationConfirm, ReactivationEntry, ReactivationOutcome, ReactivationReview } from "../../../shared/src/reactivation.js";
export type ReactivationDependencies={verifyToken:VerifyToken;entry(userId:string):Promise<ReactivationEntry>;review(userId:string,input:{arrangementId:string;currentQuoteId?:string}):Promise<ReactivationReview>;confirm(userId:string,input:ReactivationConfirm):Promise<ReactivationOutcome>;status(userId:string,id:string):Promise<ReactivationOutcome>};
export function createReactivationRouter(deps:ReactivationDependencies){
  const router=Router();const auth=requireBearerAuth(deps.verifyToken);
  router.use('/me/reactivation',(_request,response,next)=>{response.set('Cache-Control','private, no-store');next();});
  async function run(response:Response,operation:()=>Promise<unknown>,schema:z.ZodType){
    try{response.json(schema.parse(await operation()));}
    catch(error){const message=error instanceof Error?error.message:'';const status=message==='reactivation_not_found'?404:['reactivation_not_available','stale_quote'].includes(message)?409:500;response.status(status).json({error:{code:status===404?'not_found':status===409?message:'internal_error'}});}
  }
  router.get('/me/reactivation',auth,(_request,response)=>{void run(response,()=>deps.entry(response.locals.auth.userId),reactivationEntrySchema);});
  router.post('/me/reactivation/review',auth,(request,response)=>{const input=reactivationReviewRequestSchema.safeParse(request.body);if(!input.success){response.status(400).json({error:{code:'invalid_request'}});return;}void run(response,()=>deps.review(response.locals.auth.userId,input.data),reactivationReviewSchema);});
  router.post('/me/reactivation/confirm',auth,(request,response)=>{const input=reactivationConfirmRequestSchema.safeParse(request.body);if(!input.success){response.status(400).json({error:{code:'invalid_request'}});return;}void run(response,()=>deps.confirm(response.locals.auth.userId,input.data),reactivationOutcomeSchema);});
  router.get('/me/reactivation/operations/:operationId',auth,(request,response)=>{const input=z.uuid().safeParse(request.params.operationId);if(!input.success){response.status(400).json({error:{code:'invalid_request'}});return;}void run(response,()=>deps.status(response.locals.auth.userId,input.data),reactivationOutcomeSchema);});
  return router;
}
