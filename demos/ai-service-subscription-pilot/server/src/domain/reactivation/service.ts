import type { ReactivationConfirm, ReactivationOutcome, ReactivationReview } from "../../../../shared/src/reactivation.js";
import type { SavedWalletGateway } from "../paypal/gateway.js";
import type { PostgresReactivationRepository } from "./repository.js";
import { projectSavedWalletFundingEvidence } from "../paypal/http-gateway.js";
import { PayPalDefinitiveError } from "../paypal/gateway.js";
export class ReactivationService {
  constructor(private readonly repository:PostgresReactivationRepository,private readonly gateway:SavedWalletGateway,private readonly clock:()=>Date){}
  async review(userId:string,input:{arrangementId:string;currentQuoteId?:string}):Promise<ReactivationReview>{return this.repository.review(userId,input,this.clock());}
  async confirm(userId:string,input:ReactivationConfirm):Promise<ReactivationOutcome>{
    const claim=await this.repository.claim(userId,input,this.clock());
    if(!claim.ownsCreate)return this.repository.readOutcome(userId,claim.operationId);
    let raw:unknown;
    try{raw=await this.gateway.createSavedWalletOrder({payload:claim.payload,requestId:claim.requestId,clientMetadataId:input.clientMetadataId});}
    catch(error){await this.repository.recordNonFunding(claim.operationId,error instanceof PayPalDefinitiveError?"failed":"pending",null);return this.repository.readOutcome(userId,claim.operationId);}
    const body=typeof raw==='object'&&raw!==null?raw as Record<string,unknown>:{};
    const orderId=typeof body.id==='string'&&body.id.length?body.id:null;
    if(body.status==='PAYER_ACTION_REQUIRED'){await this.repository.recordNonFunding(claim.operationId,"action_required",orderId);}
    else{
      try{if(!orderId)throw new Error("invalid_funding_evidence");await this.repository.complete(userId,claim.operationId,projectSavedWalletFundingEvidence(raw,orderId,claim.operationId),this.clock());}
      catch{await this.repository.recordNonFunding(claim.operationId,"pending",orderId);}
    }
    return this.repository.readOutcome(userId,claim.operationId);
  }
  async status(userId:string,operationId:string):Promise<ReactivationOutcome>{
    const prior=await this.repository.readOutcome(userId,operationId);
    if(prior.state!=='pending')return prior;
    const orderId=await this.repository.claimReconcile(userId,operationId,this.clock());
    if(orderId){try{const raw=await this.gateway.readSavedWalletOrder(orderId);const body=typeof raw==='object'&&raw!==null?raw as Record<string,unknown>:{};if(body.id===orderId&&body.status==='PAYER_ACTION_REQUIRED')await this.repository.recordNonFunding(operationId,"action_required",orderId);else await this.repository.complete(userId,operationId,projectSavedWalletFundingEvidence(raw,orderId,operationId),this.clock());}catch{/* A single uncertain same-order GET never creates a new obligation. */}}
    return this.repository.readOutcome(userId,operationId);
  }
}
