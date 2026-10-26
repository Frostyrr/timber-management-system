import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
export function sessionId() { return randomBytes(32).toString('base64url') }
export function sessionHash(value:string) { return createHash('sha256').update(value).digest('hex') }
export function seal(value:unknown,key:string,aad:string) {
 const secret=Buffer.from(key,'base64');if(secret.length!==32)throw Error('BFF encryption key must be 32 bytes.')
 const iv=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',secret,iv);cipher.setAAD(Buffer.from(aad))
 return Buffer.concat([iv,cipher.update(JSON.stringify(value)),cipher.final(),cipher.getAuthTag()]).toString('base64url')
}
export function unseal<T>(value:string,key:string,aad:string):T {
 const packed=Buffer.from(value,'base64url');const decipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),packed.subarray(0,12));decipher.setAAD(Buffer.from(aad));decipher.setAuthTag(packed.subarray(-16));
 return JSON.parse(Buffer.concat([decipher.update(packed.subarray(12,-16)),decipher.final()]).toString('utf8')) as T
}
export function checkMutationRequest(method:string,origin:string|undefined,contentType:string|undefined,marker:string|undefined,expectedOrigin:string) {
 return method==='POST' && origin===expectedOrigin && contentType?.split(';')[0]==='application/json' && marker==='1'
}
export function cookie(name:string,value:string,seconds:number,secure=true) {
 return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}${secure?'; Secure':''}`
}
