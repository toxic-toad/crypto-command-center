import crypto from 'node:crypto';
function parseCookies(req){const out={};(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1));});return out;}
function verify(raw){
 try{
  const [body,mac]=raw.split('.');const secret=process.env.SESSION_SECRET;if(!secret)return null;
  const expected=crypto.createHmac('sha256',secret).update(body).digest('base64url');
  if(!crypto.timingSafeEqual(Buffer.from(mac),Buffer.from(expected)))return null;
  const d=JSON.parse(Buffer.from(body,'base64url').toString());if(Date.now()-d.iat>2592000000)return null;return d;
 }catch(e){return null}
}
export default function handler(req,res){
 const d=verify(parseCookies(req).solrise_x_session);
 res.setHeader('Cache-Control','no-store');
 res.status(200).json(d?{authenticated:true,user:d}:{authenticated:false});
}