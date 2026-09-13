const RPC='https://api.mainnet-beta.solana.com';

export default async function handler(req,res){
  if(req.method==='OPTIONS'){
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','content-type');
    res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
    return res.status(204).end();
  }
  if(req.method!=='POST') return res.status(405).json({error:'POST only'});
  try{
    const body=req.body;
    if(!body) return res.status(400).json({error:'Missing JSON-RPC body'});
    const text=JSON.stringify(body);
    if(text.length>1000000) return res.status(413).json({error:'Request too large'});
    const upstream=await fetch(RPC,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:text
    });
    const data=await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type','application/json');
    res.setHeader('Cache-Control','no-store');
    return res.send(data);
  }catch(e){
    return res.status(502).json({error:'Solana RPC unavailable'});
  }
}