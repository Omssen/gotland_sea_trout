/* BUILD 6275 — persistent full-grid DMI cache + shared in-flight request. */
(function(){
 const networkGrid=gstDmiGrid,mem=new Map(),pending=new Map(),PREFIX='gst-dmi-grid-v4:',MAX_AGE=8*60*60*1000;
 function target(){const d=new Date(timelineHours[timelineIndex]||Date.now());d.setMinutes(0,0,0);return d}
 function key(){return target().toISOString()}
 function pack(g){return {saved:Date.now(),run:g.data&&g.data._gstRun||null,time:g.data&&g.data._gstTime||key(),pts:(g.samples||[]).map(p=>[p.lat,p.lon,p.u,p.n])}}
 function unpack(x){
  if(!x||!Array.isArray(x.pts)||x.pts.length<100)return null;
  const pts=x.pts.map(a=>{const q=vdFrom(a[2],a[3]);return {lat:a[0],lon:a[1],u:a[2],n:a[3],v:q.v,dir:q.dir}});
  return {data:{_gstRun:x.run,_gstTime:x.time},samples:prepareNumericGrid(pts)};
 }
 function load(k){try{const raw=localStorage.getItem(PREFIX+k);if(!raw)return null;const x=JSON.parse(raw);if(Date.now()-x.saved>MAX_AGE){localStorage.removeItem(PREFIX+k);return null}return unpack(x)}catch(_){return null}}
 function save(k,g){try{localStorage.setItem(PREFIX+k,JSON.stringify(pack(g)))}catch(_){}}
 gstDmiGrid=async function(){
  const k=key();if(mem.has(k))return mem.get(k);
  const disk=load(k);if(disk){mem.set(k,disk);return disk}
  if(pending.has(k))return pending.get(k);
  const p=networkGrid().then(g=>{mem.set(k,g);save(k,g);pending.delete(k);return g},e=>{pending.delete(k);throw e});pending.set(k,p);return p;
 };
 function prefetch(){const k=key();if(mem.has(k)||load(k)||pending.has(k))return;gstDmiGrid().catch(()=>{})}
 if('requestIdleCallback'in window)requestIdleCallback(prefetch,{timeout:1800});else setTimeout(prefetch,900);
})();
