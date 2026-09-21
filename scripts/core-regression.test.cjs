// Run with: node --test scripts/core-regression.test.cjs
// Exercise the production functions without starting Leaflet or making network calls.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const names=['requestGuard','invalidateRequest','json','timelineTime','hourlyQuery','hourlyIndex','chunks','batchResults','normalizeMarine','marineJson','currentKnots','live','marineBatch','weatherBatch','fallbackSamples','fetchWindSamples','fetchTempSamples','fetchSeaLevelSamples','fetchWaveSamples','refreshConditionStrip','uvFrom','vdFrom','componentFrom','parseCurrentFeature','score','scoreDetailed','angleDiff','inPoly','featureContainsPoint','pointInProtection','compass','exposure','editCustom'];
function setup(){
  const now=Date.parse('2026-09-15T12:00:00Z');
  const points=Array.from({length:151},(_,i)=>({lat:57+i/1000,lon:18}));
  const context={requestVersions:{},weatherGeneration:0,Date,console:{warn(){}},URL,Map,timelineIndex:0,timelineHours:Array.from({length:73},(_,i)=>new Date(now+i*3600000)),currentSourcePoints:()=>points, fallbackProbePoints:()=>points.slice(0,3),viewCacheKey:()=> 'test',windCache:new Map(),tempCache:new Map(),levelCache:new Map(),waveCache:new Map()};
  vm.createContext(context);
  for(const name of names){const line=source.split(/\r?\n/).find(l=>l.startsWith('function '+name+'(')||l.startsWith('async function '+name+'('));assert.ok(line,name);vm.runInContext(line,context)}
  vm.runInContext(source.slice(source.indexOf('async function openSpot('),source.indexOf('\nfunction renderSpots(')),context);
  return {c:context,points,now};
}
function response(c,value=1){return {hourly:{time:c.timelineHours.map(t=>+t/1000),wind_speed_10m:Array(73).fill(value),wind_direction_10m:Array(73).fill(90),sea_surface_temperature:Array(73).fill(value),wave_height:Array(73).fill(value),sea_level_height_msl:Array(73).fill(value)}}}
test('chunks handles empty/short/exact/remainder inputs and rejects invalid sizes without mutation',()=>{
  const {c}=setup();const input=[1,2,3,4,5];
  for(const [items,size,expected] of [[[],3,[]],[input,8,[[1,2,3,4,5]]],[input,5,[[1,2,3,4,5]]],[input,2,[[1,2],[3,4],[5]]]])assert.deepEqual(Array.from(c.chunks(items,size),x=>Array.from(x)),expected);
  for(const size of [0,-1,1.5,NaN,Infinity,'2',null,undefined])assert.throws(()=>c.chunks(input,size),/Invalid batch size/);
  assert.deepEqual(input,[1,2,3,4,5]);
});
test('both batch APIs split 151 points into 75/75/1, preserve order and accept singleton objects',async()=>{
  for(const name of ['marineBatch','weatherBatch']){
    const {c,points}=setup();let sizes=[],offset=0;
    c.json=async url=>{const q=new URL(url).searchParams,n=q.get('latitude').split(',').length;sizes.push(n);if(name==='marineBatch')assert.equal(q.get('wind_speed_unit'),'ms');assert.equal(q.get('timeformat'),'unixtime');assert.equal(q.get('timezone'),'GMT');assert.equal(q.get('start_hour'),'2026-09-15T12:00');assert.equal(q.get('end_hour'),'2026-09-18T12:00');const arr=Array.from({length:n},()=>({...response(c),id:offset++}));return n===1?arr[0]:arr};
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
    const {c}=setup();c.json=async url=>{if(new URL(url).searchParams.get('latitude').includes(',')){c.timelineIndex=72;throw Error('offline')}const d=response(c);d.hourly.wind_speed_10m[0]=12;d.hourly.sea_surface_temperature[0]=12;return d};
    const samples=await c[name]();assert.equal(samples[0].v??samples[0].value,12);
  }
});
test('all 73 timeline hours match timestamps, independent of response start and DST offsets',()=>{
  const {c}=setup();const d=response(c);d.hourly.time.unshift(d.hourly.time[0]-3600);
  for(let i=0;i<73;i++){c.timelineIndex=i;assert.equal(c.hourlyIndex(d),i+1)}
  assert.equal(c.hourlyIndex({hourly:{time:[]}}),-1);
  assert.equal(c.hourlyIndex(d,new Date('2020-01-01T00:00Z')),-1);
  const a=new Date('2026-10-25T02:00:00+02:00'),b=new Date('2026-10-25T02:00:00+01:00');
  const dst={hourly:{time:[+a/1000,+b/1000]}};assert.equal(c.hourlyIndex(dst,a),0);assert.equal(c.hourlyIndex(dst,b),1);
});
test('wind, temperature, waves and sea level read current/future by timestamp',async()=>{
  for(const name of ['fetchWindSamples','fetchTempSamples','fetchSeaLevelSamples','fetchWaveSamples'])for(const index of [0,24,48,72]){
    const {c}=setup();c.timelineIndex=index;c.json=async url=>{const d=response(c);for(const key of Object.keys(d.hourly))if(key!=='time')d.hourly[key]=Array.from({length:73},(_,i)=>i);for(const key of Object.keys(d.hourly))d.hourly[key].unshift(key==='time'?d.hourly.time[0]-3600:-999);return Array.from({length:new URL(url).searchParams.get('latitude').split(',').length},()=>d)};
    const samples=await c[name]();assert.equal(samples[0].v??samples[0].value,index);
  }
});
test('condition strip uses the captured map time even when timeline changes during request',async()=>{
  const {c}=setup();const elements={};c.map={getCenter:()=>({lat:57,lng:18})};c.document={querySelector:id=>elements[id]??=( {})};c.active={turbidity:false};
  c.live=async()=>{const d=response(c);d.hourly.sea_surface_temperature[0]=12;d.hourly.wave_height[0]=.5;d.hourly.sea_level_height_msl[0]=.15;c.timelineIndex=72;return {m:d}};
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
  const {c}=setup();c.json=async url=>url.includes('marine-api')?{current:{ocean_current_velocity:1},current_units:{ocean_current_velocity:'kn'},hourly:{time:c.timelineHours.map(t=>+t/1000),ocean_current_velocity:Array(73).fill(1),ocean_current_direction:Array(73).fill(90)},hourly_units:{ocean_current_velocity:'kn'}}:response(c);
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
      assert.equal(q.get('start_hour'),'2026-09-15T12:00');assert.equal(q.get('end_hour'),'2026-09-18T12:00');assert.equal(q.get('timezone'),'GMT');assert.equal(q.get('timeformat'),'unixtime');
      if(!url.includes('marine-api'))return response(c);
      marineRequests++;assert.equal(q.get('wind_speed_unit'),'ms');
      return {current:{ocean_current_velocity:value},current_units:{ocean_current_velocity:unit},hourly:{time:c.timelineHours.map(t=>+t/1000),ocean_current_velocity:Array(73).fill(value),ocean_current_direction:Array(73).fill(90)},hourly_units:{ocean_current_velocity:unit}};
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
test('current parser rejects unrelated field names and substring matches',()=>{
  const {c}=setup();
  for(const data of [{quote:3,volume:4},{metadata:{quote:3,volume:4}},{uo_quality:3,vo_error:4},{eastward_error:3,northward_error:4},{'foreign.uo':3,'foreign.vo':4},{uo:{quote:3},vo:{volume:4}}])assert.equal(c.parseCurrentFeature(data),null,JSON.stringify(data));
  const parsed=c.parseCurrentFeature({quote:99,volume:88,properties:{uo:0,vo:-.4}});assert.equal(parsed.u,0);assert.equal(parsed.n,-.4);
});
test('current parser accepts exact names and the observed Copernicus WMTS component metadata',()=>{
  const {c}=setup();
  // Observed GetFeatureInfo response, 2026-09-14T22:15:00Z, Hoburgen west.
  const real={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[56.97476686327146,17.986198765712146]},properties:{lat:56.97476686327146,lon:17.986198765712146,variableId:'sea_water_velocity',datasetId:'BALTICSEA_ANALYSISFORECAST_PHY_003_006/cmems_mod_bal_phy_anfc_PT15M-i_202411',value:.05100088107520634,units:'m s-1',component1VariableId:'uo',component1Value:-.04065295308828354,component1Units:'m s-1',component2VariableId:'vo',component2Value:.03079654648900032,component2Units:'m s-1'}}]};
  const parsed=c.parseCurrentFeature(real);assert.ok(parsed);assert.equal(parsed.u,-.04065295308828354);assert.equal(parsed.n,.03079654648900032);assert.ok(Math.abs(parsed.v-Math.hypot(parsed.u,parsed.n))<1e-12);
  for(const data of [{uo:.3,vo:.4},{features:[{properties:{uo:'0.3',vo:'0.4'}}]},{eastward_sea_water_velocity:.3,northward_sea_water_velocity:.4},{u:.3,v:.4}])assert.equal(c.parseCurrentFeature(data)?.v,.5);
  assert.equal(c.parseCurrentFeature({component1VariableId:'quote',component1Value:.3,component2VariableId:'volume',component2Value:.4}),null);
  assert.equal(c.parseCurrentFeature({component1VariableId:'foreign.uo',component1Value:.3,component2VariableId:'foreign.vo',component2Value:.4}),null);
  assert.equal(c.parseCurrentFeature({uo:0,vo:0})?.v,0);assert.equal(c.parseCurrentFeature({uo:null,vo:.4}),null);
});
test('protection polygons exclude holes, including each member of a MultiPolygon',()=>{
  const {c}=setup(),outer=[[10,50],[20,50],[20,60],[10,60],[10,50]],hole=[[12,52],[14,52],[14,54],[12,54],[12,52]],secondHole=[[16,56],[18,56],[18,58],[16,58],[16,56]],island=[[30,50],[40,50],[40,60],[30,60],[30,50]];
  const polygon={geometry:{type:'Polygon',coordinates:[outer,hole,secondHole]}};
  assert.equal(c.featureContainsPoint(polygon,53,13),false);assert.equal(c.featureContainsPoint(polygon,57,17),false);assert.equal(c.featureContainsPoint(polygon,51,11),true);assert.equal(c.featureContainsPoint(polygon,49,11),false);
  const multi={geometry:{type:'MultiPolygon',coordinates:[[outer,hole],[island]]}};
  assert.equal(c.featureContainsPoint(multi,53,13),false);assert.equal(c.featureContainsPoint(multi,55,35),true);
  const reversed={geometry:{type:'Polygon',coordinates:[outer.slice().reverse(),hole.slice().reverse()]}};assert.equal(c.featureContainsPoint(reversed,53,13),false);
  c.officialProtectionFeatures=[multi];assert.equal(c.pointInProtection(53,13),false);assert.equal(c.pointInProtection(55,35),true);
  assert.equal(c.featureContainsPoint({geometry:null},53,13),false);assert.equal(c.featureContainsPoint({geometry:{type:'Polygon',coordinates:[]}},53,13),false);
});
test('spot details preserve north 0 degrees for scoring and wind exposure',async()=>{
  const {c}=setup(),elements={};c.$=id=>elements[id]??={};c.map={setView(){}};c.favs=new Set();c.customSpots=[];c.openSheet=()=>{};c.satCenters=()=>[];c.setTimeout=()=>{};
  c.live=async()=>({w:{current:{wind_direction_10m:0}},m:{current:{}}});
  const spot={id:1,name:'North',lat:57,lon:18,rating:3,facing:0};await c.openSpot(spot);
  assert.match(elements['#spotLive'].innerHTML,/<b>52\/100<\/b>/);assert.match(elements['#spotLive'].innerHTML,/N · auflandig/);
  delete spot.facing;await c.openSpot(spot);assert.match(elements['#spotLive'].innerHTML,/<b>43\/100<\/b>/);assert.match(elements['#spotLive'].innerHTML,/N · seitlich/);
});
function formHarness(c,spot){
  let html='',saved=0;const form={};c.openSheet=value=>{html=value};c.$=id=>{assert.equal(id,'#cf');return form};c.saveCustom=()=>saved++;c.renderCustom=()=>{};c.openSpot=()=>{};
  // Read the generated option selection as a browser would; submit these unchanged values.
  function selected(name){const options=html.match(new RegExp('<select name="'+name+'">([\\s\\S]*?)</select>'))[1];const matches=Array.from(options.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g));const option=matches.find(m=>/\bselected\b/.test(m[1]))||matches[0];return option[1].match(/value="([^"]*)"/)?.[1]??option[2]}
  c.FormData=class{get(name){return name==='rating'||name==='facing'?selected(name):spot[name]||''}};
  c.editCustom(spot);return {selected,submit(){form.onsubmit({preventDefault(){},target:form});assert.equal(saved,1)}};
}
test('editing a custom spot preserves its actual rating and direction on unchanged submit',()=>{
  for(const rating of [1,2,3,4,5])for(const facing of [0,45,90,135,180,225,270,315,37]){
    const {c}=setup(),spot={name:'Own',note:'unchanged',rating,facing},form=formHarness(c,spot);
    assert.equal(+form.selected('rating'),rating);assert.equal(+form.selected('facing'),facing);form.submit();assert.equal(spot.rating,rating);assert.equal(spot.facing,facing);
  }
});
test('new custom spots keep defaults and an already generated coast direction',()=>{
  for(const facing of [undefined,45,0]){const {c}=setup(),spot={name:'New',...(facing==null?{}:{rating:3,facing})},form=formHarness(c,spot);form.submit();assert.equal(spot.rating,3);assert.equal(spot.facing,facing??270)}
});
test('explicit current pairs take priority over preceding generic metadata',()=>{
  const {c}=setup();
  for(const properties of [{uo:.03,vo:.04},{component1VariableId:'uo',component1Value:.03,component2VariableId:'vo',component2Value:.04}]){
    const result=c.parseCurrentFeature({metadata:{u:3,v:4},features:[{properties}]});
    assert.ok(result);assert.equal(result.u,.03);assert.equal(result.n,.04);assert.equal(result.v,.05);
  }
});
test('current pairs never combine incomplete components across objects or features',()=>{
  const {c}=setup();
  for(const data of [
    {features:[{properties:{uo:null,vo:.4}},{properties:{uo:.3,vo:null}}]},
    {first:{uo:.3},second:{vo:.4}},
    {uo:.3,child:{vo:.4}},
    {first:{u:.3},second:{v:.4}},
    {features:[{properties:{component1VariableId:'uo',component1Value:.3}},{properties:{component2VariableId:'vo',component2Value:.4}}]}
  ])assert.equal(c.parseCurrentFeature(data),null,JSON.stringify(data));
  const result=c.parseCurrentFeature({first:{uo:.3},second:{uo:0,vo:.4}});assert.equal(result.u,0);assert.equal(result.n,.4);assert.equal(result.v,.4);
});
