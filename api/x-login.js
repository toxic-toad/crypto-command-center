import crypto from 'node:crypto';

function cookie(name,value,maxAge=600,httpOnly=true){
  return name+'='+encodeURIComponent(value)+'; Path=/; Max-Age='+maxAge+'; SameSite=Lax; Secure'+(httpOnly?'; HttpOnly':'');
}
function base64url(buf){return Buffer.from(buf).toString('base64url');}

export default async function handler(req,res){
  if(req.method!=='GET')return res.status(405).end();
  const clientId=process.env.X_CLIENT_ID;
  if(!clientId)return res.redirect('/?x=setup');
  const redirect=process.env.X_REDIRECT_URI||((req.headers['x-forwarded-proto']||'https')+'://'+req.headers.host+'/api/x-callback');
  const state=base64url(crypto.randomBytes(32));
  const verifier=base64url(crypto.randomBytes(48));
  const challenge=base64url(crypto.createHash('sha256').update(verifier).digest());
  const params=new URLSearchParams({
    response_type:'code',client_id:clientId,redirect_uri:redirect,
    scope:'users.read',state,code_challenge:challenge,code_challenge_method:'S256'
  });
  res.setHeader('Set-Cookie',[cookie('solrise_x_state',state),cookie('solrise_x_verifier',verifier)]);
  res.writeHead(302,{Location:'https://x.com/i/oauth2/authorize?'+params.toString()});res.end();
}