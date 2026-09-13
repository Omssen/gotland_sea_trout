/* Gotland Sea Trout v6.2.4 numeric current test */
let numericGridCache=null;
async function loadNumericGridFile(){
 if(numericGridCache)return numericGridCache;
 const response=await fetch('data/current/latest.json?v=6240');
 if(!response.ok)throw Error('Grid HTTP '+response.status);
 const data=await response.json();
 const samples=(data.points||[]).map(p=>{
  const u=+p.u,n=+p.v,x=vdFrom(u,n);
  return {lat:+p.lat,lon:+p.lon,u,n,v:x.v,dir:x.dir};
 }).filter(p=>Number.isFinite(p.u)&&Number.isFinite(p.n));
 numericGridCache={data,samples};
 return numericGridCache;
}
console.info('v6.2.4 numeric current module loaded');
