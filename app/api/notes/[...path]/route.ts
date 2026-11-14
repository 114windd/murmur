import { handleApi } from '@/lib/api';
export const dynamic='force-dynamic';
type Context={params:Promise<{path:string[]}>};
const handle=async(req:Request,ctx:Context)=>handleApi(req,(await ctx.params).path);
export {handle as GET,handle as POST,handle as PATCH,handle as PUT,handle as DELETE};

export const maxDuration=120;
