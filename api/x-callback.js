import crypto from 'node:crypto';

function parseCookies(req){
 const out={};(req.headers.cookie||'').split(';').forEach(p=>{const i=p.indexOf('=');if(i>0)out[p.slice(0,i).trim()]=decodeURIComponent(p.slice(i+1));});return out;
}
function sign(payload){
 const secret=process.env.SESSION_SECRET;
 if(!secret)throw Error('SESSION_SECRET is not configured');
 const body=Buffer.from(JSON.stringify(payload)).toString('base64url');
 const mac=crypto.createHmac('sha256',secret).update(body).digest('base64url');
 return body+'.'+mac;
}
export default async function handler(req,res){
 try{
  if(req.method!=='GET')return res.status(405).end();
  const q=req.query||{}; if(q.error)return res.redirect('/?x=denied');
  const c=parseCookies(req);
  if(!q.code||!q.state||q.state!==c.solrise_x_state)return res.status(400).send('Invalid X OAuth state.');
  const clientId=process.env.X_CLIENT_ID;
  if(!clientId)return res.status(500).send('X OAuth is not configured.');
  const redirect=process.env.X_REDIRECT_URI||((req.headers['x-forwarded-proto']||'https')+'://'+req.headers.host+'/api/x-callback');
  const form=new URLSearchParams({code:q.code,grant_type:'authorization_code',client_id:clientId,redirect_uri:redirect,code_verifier:c.solrise_x_verifier||''});
  const token=await fetch('https://api.x.com/2/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:form});
  const tj=await token.json();if(!token.ok||!tj.access_token)throw Error(tj.error_description||'X token exchange failed');
  const me=await fetch('https://api.x.com/2/users/me?user.fields=username,name',{headers:{Authorization:'Bearer '+tj.access_token}});
  const mj=await me.json();if(!me.ok||!mj.data)throw Error('Unable to read X account');
  const session=sign({id:mj.data.id,username:mj.data.username,name:mj.data.name||'',iat:Date.now()});
  res.setHeader('Set-Cookie','solrise_x_session='+encodeURIComponent(session)+'; Path=/; Max-Age=2592000; SameSite=Lax; Secure; HttpOnly');
  res.redirect('/?x=connected');
 }catch(e){res.status(500).send('X connection failed: '+(e.message||'unknown error'))}
}