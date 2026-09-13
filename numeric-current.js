/* Gotland Sea Trout v6.2.4 numeric current test */
let numericGridCache=null;
function prepareNumericGrid(samples){
 const ys=[...new Set(samples.map(p=>p.lat))].sort((a,b)=>a-b),xs=[...new Set(samples.map(p=>p.lon))].sort((a,b)=>a-b);
 const yi=new Map(ys.map((v,i)=>[v,i])),xi=new Map(xs.map((v,i)=>[v,i])),cols=xs.length;
 const uu=new Float32Array(ys.length*cols),nn=new Float32Array(ys.length*cols);uu.fill(NaN);nn.fill(NaN);
 for(const p of samples){const k=yi.get(p.lat)*cols+xi.get(p.lon);uu[k]=p.u;nn[k]=p.n}
 samples.numericGrid={ys,xs,cols,uu,nn};
 return samples;
}
async function loadNumericGridFile(){
 if(numericGridCache)return numericGridCache;
 const response=await fetch('data/current/latest.json?v=6240');
 if(!response.ok)throw Error('Grid HTTP '+response.status);
 const data=await response.json();
 const samples=prepareNumericGrid((data.points||[]).map(p=>{const u=+p.u,n=+p.v,x=vdFrom(u,n);return{lat:+p.lat,lon:+p.lon,u,n,v:x.v,dir:x.dir}}).filter(p=>Number.isFinite(p.u)&&Number.isFinite(p.n)));
 if(samples.length<1000)throw Error('Grid unvollständig: '+samples.length);
 numericGridCache={data,samples};return numericGridCache;
}
console.info('v6.2.4 numeric current module loaded');
