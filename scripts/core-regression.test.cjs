// Run with: node --test scripts/core-regression.test.cjs
// Exercise the production functions without starting Leaflet or making network calls.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const names=['json','timelineTime','hourlyQuery','hourlyIndex','chunks','batchResults','normalizeMarine','marineJson','currentKnots','live','marineBatch','weatherBatch','fallbackSamples','fetchWindSamples','fetchTempSamples','fetchSeaLevelSamples','fetchWaveSamples','refreshConditionStrip','uvFrom','vdFrom','flattenNumeric','componentFrom','parseCurrentFeature','score','scoreDetailed','angleDiff'];
function setup(){
  const now=Date.parse('2026-09-15T12:00:00Z');
  const points=Array.from({length:151},(_,i)=>({lat:57+i/1000,lon:18}));
  const context={Date,console:{warn(){}},URL,Map,timelineIndex:24,timelineHours:Array.from({length:49},(_,i)=>new Date(now+(i-24)*3600000)),currentSourcePoints:()=>points, fallbackProbePoints:()=>points.slice(0,3),viewCacheKey:()=> 'test',windCache:new Map(),tempCache:new Map(),levelCache:new Map(),waveCache:new Map()};
  vm.createContext(context);
  for(const name of names){const line=source.split(/\r?\n/).find(l=>l.startsWith('function '+name+'(')||l.startsWith('async function '+name+'('));assert.ok(line,name);vm.runInContext(line,context)}
  return {c:context,points,now};
}
function response(c,value=1){return {hourly:{time:c.timelineHours.map(t=>+t/1000),wind_speed_10m:Array(49).fill(value),wind_direction_10m:Array(49).fill(90),sea_surface_temperature:Array(49).fill(value),wave_height:Array(49).fill(value),sea_level_height_msl:Array(49).fill(value)}}}
test('chunks handles empty/short/exact/remainder inputs and rejects invalid sizes without mutation',()=>{
  const {c}=setup();const input=[1,2,3,4,5];
  for(const [items,size,expected] of [[[],3,[]],[input,8,[[1,2,3,4,5]]],[input,5,[[1,2,3,4,5]]],[input,2,[[1,2],[3,4],[5]]]])assert.deepEqual(Array.from(c.chunks(items,size),x=>Array.from(x)),expected);
  for(const size of [0,-1,1.5,NaN,Infinity,'2',null,undefined])assert.throws(()=>c.chunks(input,size),/Invalid batch size/);
  assert.deepEqual(input,[1,2,3,4,5]);
});
test('both batch APIs split 151 points into 75/75/1, preserve order and accept singleton objects',async()=>{
  for(const name of ['marineBatch','weatherBatch']){
    const {c,points}=setup();let sizes=[],offset=0;
    c.json=async url=>{const q=new URL(url).searchParams,n=q.get('latitude').split(',').length;sizes.push(n);if(name==='marineBatch')assert.equal(q.get('wind_speed_unit'),'ms');assert.equal(q.get('timeformat'),'unixtime');assert.equal(q.get('timezone'),'GMT');assert.equal(q.get('start_hour'),'2026-09-14T12:00');assert.equal(q.get('end_hour'),'2026-09-16T12:00');const arr=Array.from({length:n},()=>({...response(c),id:offset++}));return n===1?arr[0]:arr};
    const result=await c[name](points,'sea_surface_temperature');assert.deepEqual(sizes,[75,75,1]);assert.deepEqual(Array.from(result,x=>x.id),points.map((_,i)=>i));
    assert.equal((await c[name]([],'wave_height')).length,0);
    c.json=async()=>[];await assert.rejects(c[name](points,'wave_height'),/Incomplete/);
  }
});
test('failed and malformed batches use existing single-point wind/temperature fallbacks',async()=>{
  for(const name of ['fetchWindSamples','fetchTempSamples'])for(const mode of ['reject','malformed','second-batch']){
    const {c}=setup();let calls=0;
    c.json=async url=>{const q=new URL(url).searchParams,n=q.get('latitude').split(',').length;if(n>1){calls++;if(mode==='reject'||(mode==='second-batch'&&calls===2))throw Error('offline');if(mode==='malformed')return {};return Array.from({length:n},()=>response(c))}return response(c,7)};
    const samples=await c[name]();assert.equal(samples.length,3);assert.equal(samples[0].v??samples[0].value,7);
  }
});
test('complete provider failure returns controlled errors',async()=>{
  for(const name of ['fetchWindSamples','fetchTempSamples','fetchSeaLevelSamples','fetchWaveSamples']){const {c}=setup();c.json=async()=>{throw Error('offline')};await assert.rejects(c[name]())}
});
test('real json wrapper routes HTTP errors, bad JSON and incomplete batch payloads to fallback',async()=>{
  for(const name of ['fetchWindSamples','fetchTempSamples'])for(const mode of ['http','json','count','missing-series','short-series','invalid-value','invalid-time']){
    const {c}=setup();let fallbackCalls=0;
    c.fetch=async url=>{
      const n=new URL(url).searchParams.get('latitude').split(',').length;
      if(n===1){fallbackCalls++;return {ok:true,json:async()=>response(c,7)}}
      if(mode==='http')return {ok:false,status:503,json:()=>{throw Error('must not parse HTTP error')}};
      if(mode==='json')return {ok:true,json:async()=>{throw new SyntaxError('invalid JSON')}};
      const arr=Array.from({length:n},()=>response(c));const last=arr.at(-1).hourly,variable=name==='fetchWindSamples'?'wind_speed_10m':'sea_surface_temperature';
      if(mode==='count')arr.pop();
      if(mode==='missing-series')delete last[variable];
      if(mode==='short-series')last[variable].pop();
      if(mode==='invalid-value')last[variable][24]='invalid';
      if(mode==='invalid-time')last.time[24]='not a UTC timestamp';
      return {ok:true,json:async()=>arr};
    };
    const samples=await c[name]();assert.equal(fallbackCalls,3,`${name}: ${mode}`);assert.equal(samples.length,3);assert.equal(samples[0].v??samples[0].value,7);
  }
});
test('fallback retains the requested hour when a batch fails after a timeline change',async()=>{
  for(const name of ['fetchWindSamples','fetchTempSamples']){
    const {c}=setup();c.json=async url=>{if(new URL(url).searchParams.get('latitude').includes(',')){c.timelineIndex=48;throw Error('offline')}const d=response(c);d.hourly.wind_speed_10m[24]=12;d.hourly.sea_surface_temperature[24]=12;return d};
    const samples=await c[name]();assert.equal(samples[0].v??samples[0].value,12);
  }
});
test('all 49 timeline hours match timestamps, independent of response start and DST offsets',()=>{
  const {c}=setup();const d=response(c);d.hourly.time.unshift(d.hourly.time[0]-3600);
  for(let i=0;i<49;i++){c.timelineIndex=i;assert.equal(c.hourlyIndex(d),i+1)}
  assert.equal(c.hourlyIndex({hourly:{time:[]}}),-1);
  assert.equal(c.hourlyIndex(d,new Date('2020-01-01T00:00Z')),-1);
  const a=new Date('2026-10-25T02:00:00+02:00'),b=new Date('2026-10-25T02:00:00+01:00');
  const dst={hourly:{time:[+a/1000,+b/1000]}};assert.equal(c.hourlyIndex(dst,a),0);assert.equal(c.hourlyIndex(dst,b),1);
});
test('wind, temperature, waves and sea level read past/current/future by timestamp',async()=>{
  for(const name of ['fetchWindSamples','fetchTempSamples','fetchSeaLevelSamples','fetchWaveSamples'])for(const index of [0,24,48]){
    const {c}=setup();c.timelineIndex=index;c.json=async url=>{const d=response(c);for(const key of Object.keys(d.hourly))if(key!=='time')d.hourly[key]=Array.from({length:49},(_,i)=>i);for(const key of Object.keys(d.hourly))d.hourly[key].unshift(key==='time'?d.hourly.time[0]-3600:-999);return Array.from({length:new URL(url).searchParams.get('latitude').split(',').length},()=>d)};
    const samples=await c[name]();assert.equal(samples[0].v??samples[0].value,index);
  }
});
test('condition strip uses the captured map time even when timeline changes during request',async()=>{
  const {c}=setup();const elements={};c.map={getCenter:()=>({lat:57,lng:18})};c.document={querySelector:id=>elements[id]??=( {})};c.active={turbidity:false};
  c.live=async()=>{const d=response(c);d.hourly.sea_surface_temperature[24]=12;d.hourly.wave_height[24]=.5;d.hourly.sea_level_height_msl[24]=.15;c.timelineIndex=48;return {m:d}};
  await c.refreshConditionStrip();assert.equal(elements['#stripTemp'].textContent,'12.0°');assert.equal(elements['#stripWave'].textContent,'0.5 m');assert.equal(elements['#stripLevel'].textContent,'15 cm');
});
test('source units normalize at ingestion; nulls and already-normalized values survive',()=>{
  const {c}=setup();
  for(const [unit,value] of [['m/s',.5],['km/h',1.8],['kn',.5*3600/1852],['mph',.5/.44704]]){
    const data={current:{ocean_current_velocity:value},current_units:{ocean_current_velocity:unit},hourly:{ocean_current_velocity:[value,null]},hourly_units:{ocean_current_velocity:unit}};
    c.normalizeMarine(data);assert.ok(Math.abs(data.current.ocean_current_velocity-.5)<1e-12);assert.equal(data.hourly.ocean_current_velocity[1],null);c.normalizeMarine(data);assert.ok(Math.abs(data.hourly.ocean_current_velocity[0]-.5)<1e-12);
  }
  assert.throws(()=>c.normalizeMarine({current:{ocean_current_velocity:1},current_units:{ocean_current_velocity:'unknown'}}),/Unknown/);
});
test('live and current fallback normalize before scoring/vector construction; Copernicus stays m/s',async()=>{
  const {c}=setup();c.json=async url=>url.includes('marine-api')?{current:{ocean_current_velocity:1},current_units:{ocean_current_velocity:'kn'},hourly:{time:c.timelineHours.map(t=>+t/1000),ocean_current_velocity:Array(49).fill(1),ocean_current_direction:Array(49).fill(90)},hourly_units:{ocean_current_velocity:'kn'}}:response(c);
  const live=await c.live({lat:57,lon:18},true);const samples=await c.fallbackSamples('current');const speed=1852/3600;
  assert.equal(live.m.current.ocean_current_velocity,speed);assert.equal(samples[0].v,speed);assert.equal(samples[0].u,speed);assert.equal(c.currentKnots(speed),1);
  const copernicus=c.parseCurrentFeature({uo:.3,vo:.4});assert.equal(copernicus.v,.5);
  const spot={rating:3,facing:270};assert.equal(c.scoreDetailed(null,{ocean_current_velocity:.5,ocean_current_direction:copernicus.dir},spot).score,c.scoreDetailed(null,null,spot,copernicus).score);
  // Identical .5 m/s physical current has the same scoring contribution from either source.
  const om=c.normalizeMarine({current:{ocean_current_velocity:.5*3600/1852},current_units:{ocean_current_velocity:'kn'}});
  assert.equal(c.scoreDetailed(null,om.current,spot).score,c.scoreDetailed(null,{ocean_current_velocity:.5},spot).score);
});
test('requested m/s stays m/s through every marine entry point; only delivered knots use the knot factor',async()=>{
  for(const [unit,value,expected] of [['m/s',.5,.5],['kn',1,1852/3600],['km/h',1.8,.5]]){
    const {c,points}=setup();let marineRequests=0;
    c.json=async url=>{
      const q=new URL(url).searchParams;
      assert.equal(q.get('start_hour'),'2026-09-14T12:00');assert.equal(q.get('end_hour'),'2026-09-16T12:00');assert.equal(q.get('timezone'),'GMT');assert.equal(q.get('timeformat'),'unixtime');
      if(!url.includes('marine-api'))return response(c);
      marineRequests++;assert.equal(q.get('wind_speed_unit'),'ms');
      return {current:{ocean_current_velocity:value},current_units:{ocean_current_velocity:unit},hourly:{time:c.timelineHours.map(t=>+t/1000),ocean_current_velocity:Array(49).fill(value),ocean_current_direction:Array(49).fill(90)},hourly_units:{ocean_current_velocity:unit}};
    };
    const live=await c.live(points[0],true),batch=await c.marineBatch(points.slice(0,1),'ocean_current_velocity,ocean_current_direction','&wind_speed_unit=ms'),fallback=await c.fallbackSamples('current');
    assert.equal(marineRequests,5);assert.equal(live.m.current.ocean_current_velocity,expected);assert.equal(batch[0].hourly.ocean_current_velocity[24],expected);assert.equal(fallback[0].v,expected);
  }
});
test('spot score and ranking share unchanged m/s threshold boundaries and knot display conversion',()=>{
  const {c}=setup(),spot={rating:3,facing:270};
  for(const [speed,bonus] of [[0,-4],[.0499,-4],[.05,0],[.1199,0],[.12,13],[.65,13],[.6501,7],[.9,7],[.9001,0]]){
    assert.equal(c.score(null,{ocean_current_velocity:speed},spot),43+bonus);
    assert.equal(c.scoreDetailed(null,null,spot,{v:speed}).score,43+bonus);
  }
  assert.equal(c.scoreDetailed(null,null,spot,{v:.5,edge:.0599}).score,56);assert.equal(c.scoreDetailed(null,null,spot,{v:.5,edge:.06}).score,68);
  assert.equal(c.currentKnots(.5),.97);assert.equal(c.currentKnots(0),0);assert.equal(c.currentKnots(null),'–');
});
