import { handleApi } from '@/lib/api';
export const dynamic='force-dynamic';
export const GET=(req:Request)=>handleApi(req);
export const POST=(req:Request)=>handleApi(req);

export const maxDuration=120;
