/* BUILD 6274 — viewport-aware persistent DMI cache. */
(function(){
 const networkGrid=gstDmiGrid,mem=new Map(),pending=new Map(),PREFIX='gst-dmi-grid-v3:',MAX_AGE=8*60*60*1000;
 function hour(){const d=new Date(timelineHours[timelineIndex]||Date.now());d.setMinutes(0,0,0);return d.toISOString()}
 function boxKey(){try{return gstVisibleBBox().map(x=>x.toFixed(2)).join(',')}catch(_){return 'default'}}
 function key(){return hour()+'|'+boxKey()}
 function pack(g,k){const pts=(g.samples||[]).map(p=>[p.lat,p.lon,p.u,p.n]);return {saved:Date.now(),run:g.data&&g.data._gstRun||null,time:g.data&&g.data._gstTime||hour(),bbox:g.data&&g.data._gstBBox||boxKey(),key:k,pts}}
 function unpack(x){if(!x||!Array.isArray(x.pts)||x.pts.length<40)return null;const pts=x.pts.map(a=>{const q=vdFrom(a[2],a[3]);return {lat:a[0],lon:a[1],u:a[2],n:a[3],v:q.v,dir:q.dir}});return {data:{_gstRun:x.run,_gstTime:x.time,_gstBBox:x.bbox},samples:prepareNumericGrid(pts)}}
 function load(k){try{const raw=localStorage.getItem(PREFIX+k);if(!raw)return null;const x=JSON.parse(raw);if(Date.now()-x.saved>MAX_AGE){localStorage.removeItem(PREFIX+k);return null}return unpack(x)}catch(_){return null}}
 function save(k,g){try{localStorage.setItem(PREFIX+k,JSON.stringify(pack(g,k)));const keys=[];for(let i=0;i<localStorage.length;i++){const x=localStorage.key(i);if(x&&x.startsWith(PREFIX))keys.push(x)}if(keys.length>8){keys.sort((a,b)=>{try{return JSON.parse(localStorage.getItem(a)).saved-JSON.parse(localStorage.getItem(b)).saved}catch(_){return 0}});while(keys.length>8)localStorage.removeItem(keys.shift())}}catch(_){}}
 gstDmiGrid=async function(){const k=key();if(mem.has(k))return mem.get(k);const disk=load(k);if(disk){mem.set(k,disk);return disk}if(pending.has(k))return pending.get(k);const p=networkGrid().then(g=>{mem.set(k,g);save(k,g);pending.delete(k);return g},e=>{pending.delete(k);throw e});pending.set(k,p);return p};
 function prefetch(){const k=key();if(mem.has(k)||load(k)||pending.has(k))return;gstDmiGrid().catch(()=>{})}
 setTimeout(prefetch,150);
})();