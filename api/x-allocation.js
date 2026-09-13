import crypto from 'node:crypto';

function parseCookies(req){const out={};(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1));});return out;}
function verify(raw){
 try{
  const [body,mac]=raw.split('.');const secret=process.env.SESSION_SECRET;if(!secret)return null;
  const expected=crypto.createHmac('sha256',secret).update(body).digest('base64url');
  if(!mac||!crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null;
  const d=JSON.parse(Buffer.from(body,'base64url').toString());if(Date.now()-d.iat>2592000000)return null;return d;
 }catch(e){return null}
}
async function redis(command){
 const url=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL;
 const token=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN;
 if(!url||!token)throw Error('Persistent allocation storage is not configured');
 const r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(command)});
 const j=await r.json();if(!r.ok||j.error)throw Error(j.error||'Storage error');return j.result;
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const user=verify(parseCookies(req).solrise_x_session);
 if(!user)return res.status(401).json({error:'Not connected to X'});
 const key='solrise:allocation:'+user.id;
 try{
  if(req.method==='GET'){
   const raw=await redis(['GET',key]);
   return res.status(200).json({allocation:raw?JSON.parse(raw):null});
  }
  if(req.method==='POST'){
   const body=req.body||{};
   if(!body.wallet||typeof body.amount!=='number'||typeof body.count!=='number')return res.status(400).json({error:'Invalid allocation'});
   const value=JSON.stringify({...body,updatedAt:new Date().toISOString()});
   await redis(['SET',key,value]);
   return res.status(200).json({ok:true});
  }
  return res.status(405).end();
 }catch(e){return res.status(500).json({error:e.message||'Storage unavailable'});}
}