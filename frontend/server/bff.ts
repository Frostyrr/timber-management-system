import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { checkMutationRequest, cookie, seal, sessionHash, sessionId, unseal } from './security.js'

type Request = IncomingMessage & { body?: unknown }
type Vault = { kind:'oauth'|'session'; storage:Record<string,string> }
const rpcNames = new Set(['inventory_identity','inventory_snapshot','inventory_mutate','operator_access','operator_lock','operator_begin','operator_complete','security_snapshot','security_mutate'])
export async function handler(req:Request,res:ServerResponse) {
 res.setHeader('Cache-Control','no-store, private');res.setHeader('Pragma','no-cache');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer')
 const send=(status:number,data:unknown,error:string|null=null)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({data,error:error?{message:error}:null}))}
 let release:(()=>Promise<void>)|undefined
 try {
  const origin=process.env.APP_ORIGIN
  const url=process.env.SUPABASE_URL
  const publishable=process.env.SUPABASE_PUBLISHABLE_KEY
  const service=process.env.SUPABASE_SERVICE_ROLE_KEY
  const encryption=process.env.BFF_ENCRYPTION_KEY
  if(!origin||!url||!publishable||!service||!encryption)throw Error('Server authentication is not configured.')
  const app=new URL(origin)
  if(app.origin!==origin || (app.protocol!=='https:' && !['localhost','127.0.0.1'].includes(app.hostname)))throw Error('Invalid application origin configuration.')
  const secure=app.protocol==='https:'
  const authCookie=secure?'__Host-timber-session':'timber-dev-session'
  const oauthCookie=secure?'__Host-timber-oauth':'timber-dev-oauth'
  const location=new URL(req.url??'/',origin)
  const callback=req.method==='GET'&&location.searchParams.get('action')==='callback'
  if(!callback&&!checkMutationRequest(req.method??'',req.headers.origin,req.headers['content-type'],req.headers['x-timber-request'] as string|undefined,origin)){send(403,null,'Request origin or method rejected.');return}
  if(Number(req.headers['content-length']??0)>65536){send(413,null,'Request too large.');return}
  const raw=typeof req.body==='string'?req.body:JSON.stringify(req.body??{})
  if(Buffer.byteLength(raw)>65536){send(413,null,'Request too large.');return}
  const body=JSON.parse(raw) as {op?:string;name?:string;args?:Record<string,unknown>}
  const op=callback?'callback':body.op
  const fetchWithTimeout:typeof fetch=(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(10000)})
  // This client accesses only the private vault RPCs. Never use it for user operations.
  const vaultClient=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:fetchWithTimeout}})
  const vaultRpc=async(name:string,args:Record<string,unknown>)=>{const result=await vaultClient.rpc(name,args);if(result.error)throw Error('Session storage is unavailable. Please retry.');return result.data}
  const cookies=Object.fromEntries((req.headers.cookie??'').split(';').map(part=>part.trim().split('=')))
  const newClient=(storage:Record<string,string>)=>createClient(url,publishable,{global:{fetch:fetchWithTimeout},auth:{storageKey:'timber-auth',flowType:'pkce',persistSession:true,autoRefreshToken:false,detectSessionInUrl:false,storage:{getItem:key=>storage[key]??null,setItem:(key,value)=>{storage[key]=value},removeItem:key=>{delete storage[key]}}}})
  const saveNew=async(record:Vault,seconds:number)=>{const id=sessionId();const hash=sessionHash(id);await vaultRpc('bff_create',{id_hash:hash,ciphertext:seal(record,encryption,hash),expires_at:new Date(Date.now()+seconds*1000).toISOString()});return id}
  if(op==='login'){
   const storage:Record<string,string>={};const auth=newClient(storage)
   const result=await auth.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${origin}/api/bff?action=callback`,skipBrowserRedirect:true}})
   if(result.error||!result.data.url){send(502,null,'Unable to start Google sign-in.');return}
   const id=await saveNew({kind:'oauth',storage},600)
   res.setHeader('Set-Cookie',cookie(oauthCookie,id,600,secure));send(200,{url:result.data.url});return
  }
  if(op==='rpc'&&body.name==='recent_public_activity'){
   const result=await newClient({}).rpc('recent_public_activity')
   send(result.error?400:200,result.data,result.error?'Unable to load recent activity.':null);return
  }
  const id=cookies[callback?oauthCookie:authCookie]
  if(!id||!/^[-_a-zA-Z0-9]{43}$/.test(id)){send(op==='session'?200:401,null,op==='session'?null:'Sign in again.');return}
  const hash=sessionHash(id);const owner=randomUUID()
  let stored:{ciphertext:string;expires_at:string}|null=null
  for(let attempt=0;attempt<15;attempt++){
   stored=await vaultRpc('bff_acquire',{session_hash:hash,owner_id:owner}) as {ciphertext:string;expires_at:string}|null
   if(stored)break
   await new Promise(resolve=>setTimeout(resolve,150))
  }
  if(!stored){send(409,null,'Session expired or busy. Retry, or sign in again.');return}
  const sessionEntry=stored as {ciphertext:string;expires_at:string}
  const record=unseal<Vault>(sessionEntry.ciphertext,encryption,hash)
  if(record.kind!==(callback?'oauth':'session'))throw Error('Invalid session type.')
  const auth=newClient(record.storage)
  let deleted=false
  const persist=async()=>{
   if(deleted)return
   const committed=await vaultRpc('bff_commit',{session_hash:hash,owner_id:owner,encrypted_value:seal(record,encryption,hash)})
   if(!committed)throw Error('Session update expired. Sign in again.')
  }
  release=persist
  if(callback){
   await vaultRpc('bff_delete',{session_hash:hash});deleted=true;release=undefined
   const code=location.searchParams.get('code')
   if(!code)throw Error('Google sign-in was cancelled. Please try again.')
   const result=await auth.auth.exchangeCodeForSession(code)
   if(result.error||!result.data.session)throw Error('Google sign-in expired. Please try again.')
   const next=await saveNew({kind:'session',storage:record.storage},28800)
   res.setHeader('Set-Cookie',[cookie(authCookie,next,28800,secure),cookie(oauthCookie,'',0,secure)])
   res.statusCode=303;res.setHeader('Location',`${origin}/`);res.end();return
  }
  // Refresh is serialized by the vault lease; refreshed tokens are persisted even if the action fails.
  const sessionResult=await auth.auth.getSession()
  if(sessionResult.error||!sessionResult.data.session){await vaultRpc('bff_delete',{session_hash:hash});deleted=true;release=undefined;res.setHeader('Set-Cookie',cookie(authCookie,'',0,secure));send(op==='session'?200:401,null,op==='session'?null:'Sign in again.');return}
  const verified=await auth.auth.getUser()
  if(verified.error||!verified.data.user){send(401,null,'Sign in again.');return}
  let data:unknown=null;let error:string|null=null
  const args=body.args??{}
  if(op==='session')data={user:{id:verified.data.user.id,email:verified.data.user.email}}
  else if(op==='logout'){
   await auth.rpc('operator_lock')
   await auth.auth.signOut({scope:'local'})
   await vaultRpc('bff_delete',{session_hash:hash});deleted=true;release=undefined
   res.setHeader('Set-Cookie',cookie(authCookie,'',0,secure))
  } else if(op==='rpc'){
   if(!body.name||!rpcNames.has(body.name)){send(403,null,'Operation not allowed.');return}
   const result=await auth.rpc(body.name,args);data=result.data;error=result.error?.message??null
  } else if(op==='factors'){
   const result=await auth.auth.mfa.listFactors();error=result.error?.message??null
   if(result.data)data={totp:result.data.totp.map(f=>({id:f.id,status:f.status,factor_type:f.factor_type})),all:result.data.all.map(f=>({id:f.id,status:f.status,factor_type:f.factor_type}))}
  } else if(op==='enroll'){
   const result=await auth.auth.mfa.enroll({factorType:'totp',friendlyName:'Timber authenticator',issuer:'Timber'});error=result.error?.message??null
   if(result.data)data={id:result.data.id,totp:result.data.totp}
  } else if(op==='unenroll'){
   const factors=await auth.auth.mfa.listFactors()
   if(factors.error)throw Error('Unable to check authenticator.')
   if(!factors.data.all.some(f=>f.id===args.factorId&&f.status==='unverified')){send(403,null,'Verified authenticators require owner-assisted recovery.');return}
   const result=await auth.auth.mfa.unenroll({factorId:String(args.factorId)});error=result.error?.message??null
  } else if(op==='verify'){
   if(typeof args.code!=='string'||!/^\d{6}$/.test(args.code)||typeof args.factorId!=='string'){send(400,null,'Enter a six-digit code.');return}
   const result=await auth.auth.mfa.challengeAndVerify({factorId:args.factorId,code:args.code});error=result.error?.message??null
   // Never return result.data: it contains access and refresh tokens.
   if(!error)data={verified:true}
  } else {send(404,null,'Unknown operation.');return}
  await persist();release=undefined
  send(error?400:200,data,error)
 }catch{
  if(!res.writableEnded)send(503,null,'Authentication service unavailable. Please retry or sign in again.')
 }finally{
  if(release){try{await release()}catch{/* Do not log encrypted sessions, tokens, codes, or secrets. */}}
 }
}
