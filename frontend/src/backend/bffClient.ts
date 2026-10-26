type UserSession = { user: { id:string;email?:string } }
type Result<T> = {data:T|null;error:{message:string}|null}
type Factor = {id:string;status:'verified'|'unverified';factor_type:'totp'|'phone'}
type Listener = (event:string,session:UserSession|null)=>void
const listeners=new Set<Listener>()
export async function request<T>(op:string,extra:Record<string,unknown>={}):Promise<Result<T>> {
 try {
  const endpoint = typeof window !== 'undefined' && window.location?.origin
    ? new URL('/api/bff', window.location.origin).href
    : 'http://localhost/api/bff'
  const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Timber-Request':'1'},body:JSON.stringify({op,...extra}),cache:'no-store'})
  if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Server endpoints are unavailable. Check the deployment configuration.')
  return await response.json() as Result<T>
 }catch(error){return {data:null,error:{message:error instanceof Error?error.message:'Unable to reach the server.'}}}
}
async function notify(event:string) {
 const result=await request<UserSession>('session')
 if(result.error)return
 for(const callback of listeners)callback(event,result.data)
}
export const bffClient={
 rpc:<T=unknown>(name:string,args:Record<string,unknown>={})=>request<T>('rpc',{name,args}),
 auth:{
  onAuthStateChange:(callback:Listener)=>{
   listeners.add(callback)
   let disposed=false
   void request<UserSession>('session').then(result=>{if(!disposed)callback('INITIAL_SESSION',result.data)})
   const visible=()=>{if(document.visibilityState==='visible')void notify('SESSION_CHECK')}
   const channel=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('timber-auth'):null
   if(channel)channel.onmessage=()=>void notify('SESSION_CHECK')
   document.addEventListener('visibilitychange',visible)
   return {data:{subscription:{unsubscribe:()=>{disposed=true;listeners.delete(callback);document.removeEventListener('visibilitychange',visible);channel?.close()}}}}
  },
  getUser:async()=>{const result=await request<UserSession>('session');return {data:{user:result.data?.user??null},error:result.error}},
  signInWithOAuth:async(_options:unknown)=>{
   const result=await request<{url:string}>('login')
   if(result.data)window.location.assign(result.data.url)
   return result
  },
  signOut:async()=>{
   const result=await request<null>('logout')
   if(!result.error){for(const callback of listeners)callback('SIGNED_OUT',null);if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('timber-auth');channel.postMessage('signed-out');channel.close()}}
   return result
  },
  mfa:{
   listFactors:()=>request<{totp:Factor[];all:Factor[]}>('factors'),
   enroll:(_options:unknown)=>request<{id:string;totp:{qr_code:string;secret:string;uri:string}}>('enroll'),
   unenroll:(args:{factorId:string})=>request<null>('unenroll',{args}),
   challengeAndVerify:async(args:{factorId:string;code:string})=>{
    const result=await request<{verified:boolean}>('verify',{args})
    // The server retains the elevated session. No tokens are emitted or stored here.
    return result
   },
  },
 },
}
