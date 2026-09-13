const RPCS=['https://api.mainnet-beta.solana.com','https://solana-rpc.publicnode.com'];

const sleep=ms=>new Promise(r=>setTimeout(r,ms));

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
    if(JSON.stringify(body).length>1000000) return res.status(413).json({error:'Request too large'});
    let lastStatus=502;
    for(const endpoint of RPCS){
      for(let attempt=0;attempt<3;attempt++){
        try{
          const upstream=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
          const data=await upstream.text();
          lastStatus=upstream.status;
          if(upstream.status!==429 && upstream.status<500){
            res.status(upstream.status);
            res.setHeader('Content-Type','application/json');
            res.setHeader('Cache-Control','no-store');
            return res.send(data);
          }
        }catch(e){}
        await sleep(350*(attempt+1));
      }
    }
    return res.status(lastStatus===429?429:502).json({error:'Solana RPC rate limited or unavailable. Please retry.'});
  }catch(e){
    return res.status(502).json({error:'Solana RPC unavailable'});
  }
}