import { z } from 'zod'
export const USE_TYPES = { publication_use: 'Publication use', member_borrowing: 'Member borrowing', external_borrowing: 'External borrowing' } as const
export type UseType = keyof typeof USE_TYPES
export const externalSchema = z.object({
 name:z.string().trim().min(1).max(120), organization:z.string().trim().max(160).default(''),
 contactMethod:z.enum(['email','phone']), contact:z.string().trim().min(1).max(160),
}).superRefine((v,ctx)=>{
 const valid=v.contactMethod==='email'?z.email().safeParse(v.contact).success:/^[+\d\s().-]+$/.test(v.contact)&&v.contact.replace(/\D/g,'').length>=7&&v.contact.replace(/\D/g,'').length<=15
 if(!valid)ctx.addIssue({code:'custom',path:['contact'],message:'Enter a valid email or phone number (7–15 digits).'})
})
const base={purpose:z.string().trim().min(1,'Enter the event or purpose.').max(200)}
export const releaseDetailsSchema=z.discriminatedUnion('useType',[
 z.object({...base,useType:z.literal('publication_use'),borrowerId:z.string().min(1)}),
 z.object({...base,useType:z.literal('member_borrowing'),borrowerId:z.string().min(1)}),
 z.object({...base,useType:z.literal('external_borrowing'),external:externalSchema}),
])
export type ReleaseDetails=z.infer<typeof releaseDetailsSchema>
