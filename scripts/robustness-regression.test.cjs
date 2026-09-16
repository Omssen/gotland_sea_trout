const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
function setup(){
  const elements={},callbacks={},statuses=[];
  const element=id=>elements[id]??={innerHTML:'',textContent:'unchanged',classList:{items:new Set(),add(k){this.items.add(k)},remove(k){this.items.delete(k)},contains(k){return this.items.has(k)}},querySelectorAll:()=>[]};
  const c={console:{warn(){}},Date,Map,Set,URL,requestVersions:{},weatherGeneration:0,timelineHours:[new Date('2026-09-15T12:00Z'),new Date('2026-09-15T13:00Z')],timelineIndex:0,active:{},document:{querySelector:element},$:element,status:s=>statuses.push(s),setTimeout:()=>1,clearTimeout(){},updateTimeline(){},updateLandCover(){},renderLegends(){},cancelModes(){},applySpotVisibility(){},satCenters:()=>[],favs:new Set(),customSpots:[],coastSegments:[],coastMaskPolys:[],coastMaskPromise:null,stitchCoastWays:()=>[],validLandRing:()=>true,live:async()=>({w:{current:{}},m:{current:{}}}),score:()=>50,compass:()=> 'N',exposure:()=> 'auflandig',currentKnots:()=>0,roundedCurrentTime:()=>new Date('2026-09-15T12:00Z')};
  c.map={layers:new Set(),setView(){},getCenter:()=>({lat:57,lng:18}),hasLayer(l){return this.layers.has(l)},removeLayer(l){this.layers.delete(l)},on(name,fn){callbacks[name]=fn}};
  for(const name of ['spotLayer','customLayer','homeLayer','protectedLayer','parkingLayer','bathy','windLayer','currentLayer','tempLayer','turbidityLayer','seaLevelLayer','waveLayer','shore50Layer'])c[name]={drawn:null,clearLayers(){this.drawn=null},addTo(map){map.layers.add(this)}};
  c.officialCurrentWmtsLayer=()=>({addTo(){}});c.drawScalarBands=(samples,layer)=>{layer.drawn=samples[0].value};c.drawStaticVectors=()=>{};
  for(const name of ['currentColor','windColor','tempColor','levelColor','waveColor'])c[name]=()=>'';
  vm.createContext(c);
  for(const name of ['readStored','storedPoint','requestGuard','invalidateRequest','timelineTime','hourlyIndex','openSheet','closeSheet','snapOneSpot','loadCoastMask','loadParkingNear','loadVectors','loadTemp','loadSeaLevel','loadWave','refreshConditionStrip','setLayer','today','fetchWindSamples','fetchTempSamples','fetchSeaLevelSamples','fetchWaveSamples','fetchCurrentSamples','uvFrom']){
    const line=source.split(/\r?\n/).find(l=>l.startsWith('function '+name+'(')||l.startsWith('async function '+name+'('));if(line)vm.runInContext(line,c);
  }
  vm.runInContext(source.slice(source.indexOf('async function openSpot('),source.indexOf('\nfunction renderSpots(')),c);
  vm.runInContext(source.split(/\r?\n/).find(l=>l.startsWith('let refreshTimer;')),c);
  vm.runInContext(source.split(/\r?\n/).find(l=>l.startsWith('let viewportTimer=')),c);
  return {c,elements,element,callbacks,statuses};
}
function storage(c,data){const writes=[];c.localStorage={getItem:key=>data[key]??null,setItem:(...args)=>writes.push(args),removeItem:(...args)=>writes.push(args)};return writes}
function startup(c){const lines=source.split(/\r?\n/).filter(l=>l.startsWith('let customSpots=')||l.startsWith('const favs='));vm.runInContext(lines.join('\n')+'\nthis.loaded={customSpots,home,favs:[...favs]};',c);return JSON.parse(JSON.stringify(c.loaded))}
test('invalid persisted JSON and wrong container types fall back without modifying storage',async()=>{
  for(const key of ['gst-custom-v6','gst-home-v6','gst-favs','gst-coastsnap-v611'])for(const value of ['{broken','null','42','"wrong"']){
    const {c}=setup(),writes=storage(c,{[key]:value});c.json=async()=>({elements:[]});
    assert.deepEqual(startup(c),{customSpots:[],home:null,favs:[]});
    await assert.doesNotReject(c.snapOneSpot({id:1,lat:57,lon:18}));assert.equal(writes.length,0);
  }
});
test('valid user storage and coast-snap entries load unchanged without writes',async()=>{
  const {c}=setup(),custom=[{id:'c1',name:'Own',lat:57,lon:18,rating:4,facing:0}],home={lat:57.1,lon:18.1,name:'Home'},favs=[1,3];
  const writes=storage(c,{'gst-custom-v6':JSON.stringify(custom),'gst-home-v6':JSON.stringify(home),'gst-favs':JSON.stringify(favs),'gst-coastsnap-v611':'{"1":[57.2,18.2]}'});
  assert.deepEqual(startup(c),{customSpots:custom,home,favs});const spot={id:1,lat:57,lon:18};assert.equal(await c.snapOneSpot(spot),true);assert.equal(spot.lat,57.2);assert.equal(spot.lon,18.2);assert.equal(writes.length,0);
});
test('late spot responses cannot overwrite a newer spot or a reopened same spot',async()=>{
  for(const same of [false,true]){const {c,element}=setup(),a=deferred(),b=deferred();let calls=0;c.live=()=>calls++?b.promise:a.promise;
    const spot={id:1,name:'A',rating:3,lat:57,lon:18};const first=c.openSpot(spot),second=c.openSpot(same?spot:{...spot,id:2,name:'B'});
    b.resolve({m:{current:{sea_surface_temperature:12}}});await second;const latest=element('#spotLive').innerHTML;
    a.resolve({m:{current:{sea_surface_temperature:1}}});await first;assert.equal(element('#spotLive').innerHTML,latest);
  }
});
test('closing or replacing a sheet invalidates its pending spot request',async()=>{
  for(const action of ['closeSheet','openSheet']){const {c,element}=setup(),pending=deferred();c.live=()=>pending.promise;const request=c.openSpot({id:1,name:'A',rating:3,lat:57,lon:18});c[action]('replacement');const before=element('#spotLive').innerHTML;pending.resolve({m:{current:{sea_surface_temperature:1}}});await request;assert.equal(element('#spotLive').innerHTML,before)}
});
test('condition strip ignores older responses arriving after the latest response',async()=>{
  const {c,element}=setup(),a=deferred(),b=deferred();let calls=0;c.live=()=>calls++?b.promise:a.promise;
  const first=c.refreshConditionStrip(),second=c.refreshConditionStrip();const data=value=>({m:{hourly:{time:c.timelineHours.map(t=>+t/1000),sea_surface_temperature:[value,value]}}});
  b.resolve(data(12));await second;a.resolve(data(1));await first;assert.equal(element('#stripTemp').textContent,'12.0°');
});
const layers=[['loadTemp','fetchTempSamples','tempLayer','temp'],['loadSeaLevel','fetchSeaLevelSamples','seaLevelLayer','level'],['loadWave','fetchWaveSamples','waveLayer','wave'],['loadVectors','fetchWindSamples','windLayer','wind'],['loadVectors','fetchCurrentSamples','currentLayer','current']];
test('late weather/current layer responses never redraw over a newer request',async()=>{
  for(const [load,fetch,layer,key] of layers){const {c}=setup(),a=deferred(),b=deferred();let calls=0;c[fetch]=()=>calls++?b.promise:a.promise;const first=c[load](key),second=c[load](key);b.resolve([{value:12}]);await second;a.resolve([{value:1}]);await first;assert.equal(c[layer].drawn,12,key)}
});
test('disabled layers ignore late successes and errors',async()=>{
  for(const [load,fetch,layer,key] of layers)for(const fail of [false,true]){const {c,statuses}=setup(),pending=deferred();c[fetch]=()=>pending.promise;const request=c[load](key);c.setLayer(key,false);const statusCount=statuses.length;
    if(fail)pending.reject(Error('old failure'));else pending.resolve([{value:1}]);await request;
    assert.equal(c.map.hasLayer(c[layer]),false,key);assert.equal(c[layer].drawn,null,key);assert.equal(statuses.length,statusCount,key);
  }
});
test('timeline and viewport changes invalidate pending layer work before debounce starts another request',async()=>{
  for(const [load,fetch,layer,key] of layers)for(const action of ['time','viewport']){const {c,callbacks}=setup(),pending=deferred();c[fetch]=()=>pending.promise;const request=c[load](key);
    if(action==='time'){c.timelineIndex=1;c.refreshTimed()}else callbacks['moveend zoomend']();pending.resolve([{value:1}]);await request;assert.equal(c[layer].drawn,null,key+' '+action);
  }
});
test('an older ranking run cannot overwrite a newer ranking result',async()=>{
  const {c,element}=setup(),a=deferred(),b=deferred();let calls=0;c.spots=[{id:1,name:'A'}];c.fetchCurrentSamples=async()=>null;c.live=()=>calls++?b.promise:a.promise;c.scoreDetailed=(w,m)=>({score:m.wave_height,reasons:[]});
  const first=c.today();await new Promise(setImmediate);assert.equal(calls,1);const second=c.today();await new Promise(setImmediate);assert.equal(calls,2);b.resolve({m:{current:{wave_height:90}}});await second;const latest=element('#ranking').innerHTML;a.resolve({m:{current:{wave_height:1}}});await first;assert.equal(element('#ranking').innerHTML,latest);
});
test('failed coast request is retryable; concurrent callers share the in-flight request',async()=>{
  const {c}=setup(),pending=deferred();let calls=0;c.overpass=()=>{calls++;return calls===1?pending.promise:Promise.resolve({elements:[{geometry:[{lat:57,lon:18},{lat:57.1,lon:18.1}]}]})};
  const first=c.loadCoastMask(),also=c.loadCoastMask();assert.equal(calls,1);pending.reject(Error('offline'));assert.equal((await first).length,0);assert.equal((await also).length,0);
  assert.equal((await c.loadCoastMask()).length,1);assert.equal(calls,2);await c.loadCoastMask();assert.equal(calls,2);
});

test('late sample responses cannot replace newer cached weather or current data',async()=>{
  for(const [name,cache,field] of [['fetchWindSamples','windCache','wind_speed_10m'],['fetchTempSamples','tempCache','sea_surface_temperature'],['fetchSeaLevelSamples','levelCache','sea_level_height_msl'],['fetchWaveSamples','waveCache','wave_height'],['fetchCurrentSamples','currentNumericCache',null]]){
    const {c}=setup(),a=deferred(),b=deferred();let calls=0;
    const pts=Array.from({length:8},(_,i)=>({lat:57+i/100,lon:18}));c[cache]=new Map();c.viewCacheKey=()=> 'same';c.currentSourcePoints=()=>pts;c.currentNumericPoints=()=>pts;c.sampleBounds=()=>({s:57,n:58,w:18,e:19});c.copernicusTime=()=> 'same';
    c.weatherBatch=c.marineBatch=()=>calls++?b.promise:a.promise;c.fetchCurrentPoint=p=>(calls++<8?a.promise:b.promise).then(v=>({...p,value:v}));
    const first=c[name](),second=c[name]();const data=v=>field?pts.map(()=>({hourly:{time:c.timelineHours.map(t=>+t/1000),[field]:[v,v],wind_direction_10m:[90,90]}})):v;
    b.resolve(data(12));await second;a.resolve(data(1));await first;const cached=[...c[cache].values()][0];assert.equal(cached[0].value??cached[0].v,12,name);
  }
});
test('a stale failed ranking request cannot replace a newer result',async()=>{
  const {c,element}=setup(),a=deferred(),b=deferred();let calls=0;c.spots=[{id:1,name:'A'}];c.fetchCurrentSamples=async()=>null;c.live=()=>calls++?b.promise:a.promise;c.scoreDetailed=()=>({score:90,reasons:[]});
  const first=c.today();await new Promise(setImmediate);const second=c.today();await new Promise(setImmediate);b.resolve({});await second;const latest=element('#ranking').innerHTML;a.reject(Error('offline'));await first;assert.equal(element('#ranking').innerHTML,latest);
});

function parkingSetup(){const state=setup(),{c}=state;c.loadCoastMask=async()=>[];c.parseParking=d=>d;c.parkingMarker=p=>p;c.parkingLayer.addLayer=p=>{c.parkingLayer.drawn=p};return state}
const parkingSpot={id:1,name:'A',rating:3,lat:57,lon:18};
const parkingData=name=>[{id:name,name,lat:57,lon:18,spot:100,coast:50}];
test('parking: late Spot A response never writes parking information into Spot B',async()=>{
  for(const fail of [false,true]){
    const {c,element,statuses}=parkingSetup(),pending=deferred();let calls=0;c.parkingQuery=()=>{calls++;return pending.promise};
    await c.openSpot(parkingSpot);const request=c.loadParkingNear(parkingSpot,true);await new Promise(setImmediate);assert.equal(calls,1);
    await c.openSpot({...parkingSpot,id:2,name:'B'});element('#parkResults').innerHTML='Spot B parking';const count=statuses.length;
    if(fail)pending.reject(Error('old parking error'));else pending.resolve(parkingData('Parking A'));await request;
    assert.equal(element('#parkResults').innerHTML,'Spot B parking');assert.equal(c.parkingLayer.drawn,null);assert.equal(statuses.length,count);
  }
});
test('parking: starting a parking request preserves pending live spot details and latest parking results',async()=>{
  const {c,element}=parkingSetup(),live=deferred(),a=deferred(),b=deferred();c.live=()=>live.promise;let calls=0;c.parkingQuery=()=>calls++?b.promise:a.promise;
  const spot=c.openSpot(parkingSpot),first=c.loadParkingNear(parkingSpot,true);await new Promise(setImmediate);const second=c.loadParkingNear(parkingSpot,true);await new Promise(setImmediate);
  live.resolve({m:{current:{sea_surface_temperature:12}}});await spot;assert.match(element('#spotLive').innerHTML,/12 °C/);
  b.resolve(parkingData('Latest parking'));await second;const latest=element('#parkResults').innerHTML;assert.match(latest,/Latest parking/);
  a.resolve(parkingData('Old parking'));await first;assert.equal(element('#parkResults').innerHTML,latest);
});
test('parking: a closed sheet stops work after coast loading; map-only requests remain valid',async()=>{
  const {c,element}=parkingSetup(),coast=deferred();let calls=0;c.loadCoastMask=()=>coast.promise;c.parkingQuery=async()=>{calls++;return parkingData('Map parking')};
  await c.openSpot(parkingSpot);const request=c.loadParkingNear(parkingSpot,true);c.closeSheet();coast.resolve([]);await request;assert.equal(calls,0);
  const mapRequest=c.loadParkingNear(parkingSpot,false);c.openSheet('Another sheet');await mapRequest;assert.equal(calls,1);assert.equal(c.parkingLayer.drawn.name,'Map parking');assert.equal(element('#parkResults').innerHTML,'');
});

function viewportTimers(c){const timers=new Map();let id=0;c.setTimeout=fn=>{timers.set(++id,fn);return id};c.clearTimeout=id=>timers.delete(id);return {timers,flush:async()=>{const work=[...timers.values()];timers.clear();work.forEach(fn=>fn());await new Promise(setImmediate)}}}
test('ranking viewport refresh leaves loading and rejects old responses across rapid map movements',async()=>{
  for(const phase of ['current','live']){
    const {c,element,callbacks}=setup(),clock=viewportTimers(c),requests=[];let cancellations=0;
    c.cancelModes=()=>cancellations++;c.refreshConditionStrip=()=>{};c.spots=[{id:1,name:'A'}];c.scoreDetailed=(w,m)=>({score:m.wave_height,reasons:[]});
    const delayed=()=>{const d=deferred();requests.push(d);return d.promise};c.fetchCurrentSamples=phase==='current'?delayed:async()=>null;c.live=phase==='live'?delayed:async()=>({m:{current:{wave_height:90}}});
    const first=c.today();await new Promise(setImmediate);assert.equal(requests.length,1);
    const move=()=>callbacks['moveend zoomend']();move();move();move();assert.equal(clock.timers.size,1);
    await clock.flush();assert.equal(requests.length,2,'viewport debounce must restart the invalidated ranking');
    move();move();await clock.flush();assert.equal(requests.length,3);
    requests[2].resolve(phase==='current'?null:{m:{current:{wave_height:90}}});await new Promise(setImmediate);
    const latest=element('#ranking').innerHTML;assert.doesNotMatch(latest,/Lade Wind/);assert.ok(latest.includes('90/100'));
    requests[1].resolve(phase==='current'?null:{m:{current:{wave_height:20}}});requests[0].resolve(phase==='current'?null:{m:{current:{wave_height:1}}});await first;await new Promise(setImmediate);
    assert.equal(element('#ranking').innerHTML,latest);assert.equal(cancellations,1,'automatic refresh must not cancel spot/home placement');
  }
});
test('viewport movement does not start a ranking that has never been opened',async()=>{
  const {c,element,callbacks}=setup(),clock=viewportTimers(c);element('#ranking').classList.add('hidden');let calls=0;c.today=()=>calls++;c.refreshConditionStrip=()=>{};callbacks['moveend zoomend']();await clock.flush();assert.equal(calls,0);
});

const invalidCoastEntries=[null,'broken',{},[],[57],[57,18,19],['57',18],[57,null]];
test('coast-position cache: valid entries survive a damaged neighbour without fetching or writing',async()=>{
  for(const bad of invalidCoastEntries){const {c}=setup(),data={'gst-coastsnap-v611':JSON.stringify({1:[57,18],2:bad,3:[57.3,18.3]})},writes=storage(c,data);let calls=0;c.json=async()=>{calls++;return {elements:[]}};
    for(const [id,coords] of [[1,[57,18]],[3,[57.3,18.3]]]){const spot={id,lat:0,lon:0};assert.equal(await c.snapOneSpot(spot),true);assert.deepEqual([spot.lat,spot.lon],coords)}assert.equal(calls,0);assert.equal(writes.length,0);
  }
});
test('coast-position cache: reloading a damaged entry preserves all other valid stored entries',async()=>{
  for(const bad of invalidCoastEntries){const {c}=setup(),original={1:[57,18],2:bad,3:[57.3,18.3]},writes=storage(c,{'gst-coastsnap-v611':JSON.stringify(original)});c.json=async()=>({elements:[{geometry:[{},{}]}]});c.nearestOnSegment=()=>({lat:57.2,lon:18.2});c.hav=()=>1;
    assert.equal(await c.snapOneSpot({id:2,lat:57,lon:18}),true);assert.equal(writes.length,1);assert.equal(writes[0][0],'gst-coastsnap-v611');assert.deepEqual(JSON.parse(writes[0][1]),{1:[57,18],2:[57.2,18.2],3:[57.3,18.3]});
  }
});
test('coast-position cache: completely invalid data and malformed JSON fall back without crashing',async()=>{
  for(const raw of ['{broken','null','42','[]','"bad"',JSON.stringify({1:null,2:['bad',18]})]){const {c}=setup(),writes=storage(c,{'gst-coastsnap-v611':raw});c.json=async()=>({elements:[]});const spot={id:1,lat:57,lon:18};assert.equal(await c.snapOneSpot(spot),false);assert.deepEqual(spot,{id:1,lat:57,lon:18});assert.equal(writes.length,0)}
});
test('coast-position cache: fully valid cache is reused unchanged',async()=>{
  const {c}=setup(),entries={1:[57,18],2:[57.2,18.2],3:[57.3,18.3]},writes=storage(c,{'gst-coastsnap-v611':JSON.stringify(entries)});let calls=0;c.json=async()=>{calls++;return {elements:[]}};
  for(const [id,coords] of Object.entries(entries)){const spot={id,lat:0,lon:0};assert.equal(await c.snapOneSpot(spot),true);assert.deepEqual([spot.lat,spot.lon],coords)}assert.equal(calls,0);assert.equal(writes.length,0);
});

function timedRankingSetup(){const state=setup(),{c}=state,clock=viewportTimers(c),requests=[];c.refreshConditionStrip=()=>{};c.spots=[{id:1,name:'A'}];c.fetchCurrentSamples=async()=>null;c.scoreDetailed=(w,m)=>({score:m.wave_height,reasons:[]});c.live=()=>{const d=deferred();requests.push({...d,index:c.timelineIndex});return d.promise};return {...state,clock,requests}}
test('timeline ranking: pending ranking is invalidated and restarted for the selected time',async()=>{
  const {c,element,clock,requests}=timedRankingSetup();const old=c.today();await new Promise(setImmediate);c.timelineIndex=1;c.refreshTimed();requests[0].resolve({m:{current:{wave_height:1}}});await old;assert.match(element('#ranking').innerHTML,/Lade Wind/);
  await clock.flush();assert.equal(requests.length,2);assert.equal(requests[1].index,1);requests[1].resolve({m:{current:{wave_height:90}}});await new Promise(setImmediate);assert.ok(element('#ranking').innerHTML.includes('90/100'));assert.doesNotMatch(element('#ranking').innerHTML,/Lade Wind/);
});
test('timeline ranking: late response from the old time cannot replace the new ranking',async()=>{
  const {c,element,clock,requests}=timedRankingSetup();const old=c.today();await new Promise(setImmediate);c.timelineIndex=1;c.refreshTimed();await clock.flush();assert.equal(requests.length,2);requests[1].resolve({m:{current:{wave_height:90}}});await new Promise(setImmediate);const latest=element('#ranking').innerHTML;assert.ok(latest.includes('90/100'));requests[0].resolve({m:{current:{wave_height:1}}});await old;assert.equal(element('#ranking').innerHTML,latest);
});
test('timeline ranking: rapid changes show only the latest selected state',async()=>{
  const {c,element,clock,requests}=timedRankingSetup();const old=c.today();await new Promise(setImmediate);c.timelineIndex=1;c.refreshTimed();await clock.flush();assert.equal(requests.length,2);
  for(const index of [0,1,0]){c.timelineIndex=index;c.refreshTimed()}assert.equal(clock.timers.size,1);await clock.flush();assert.equal(requests.length,3);assert.equal(requests[2].index,0);requests[2].resolve({m:{current:{wave_height:80}}});await new Promise(setImmediate);const latest=element('#ranking').innerHTML;assert.ok(latest.includes('80/100'));requests[1].resolve({m:{current:{wave_height:20}}});requests[0].resolve({m:{current:{wave_height:1}}});await old;await new Promise(setImmediate);assert.equal(element('#ranking').innerHTML,latest);
});
test('timeline ranking: changing time does not open or start a hidden ranking',async()=>{
  const {c,element,clock,requests}=timedRankingSetup();element('#ranking').classList.add('hidden');c.timelineIndex=1;c.refreshTimed();await clock.flush();assert.equal(requests.length,0);assert.ok(element('#ranking').classList.contains('hidden'));assert.equal(element('#ranking').innerHTML,'');
});

const savedOwn={id:'old',name:'Saved',lat:57,lon:18,rating:4,facing:0};
test('own storage: valid spot survives a null neighbour without writes',()=>{const {c}=setup(),writes=storage(c,{'gst-custom-v6':JSON.stringify([savedOwn,null])});assert.deepEqual(startup(c).customSpots,[savedOwn]);assert.equal(writes.length,0)});
test('own storage: subsequent normal save retains the old valid spot and the new spot',()=>{const {c}=setup(),writes=storage(c,{'gst-custom-v6':JSON.stringify([savedOwn,null])});startup(c);vm.runInContext(source.split(/\r?\n/).find(l=>l.startsWith('function saveCustom(')),c);const added={...savedOwn,id:'new'};c.added=added;vm.runInContext('customSpots.push(added);saveCustom()',c);assert.equal(writes.length,1);assert.deepEqual(JSON.parse(writes[0][1]),[savedOwn,added])});
test('own storage: mixed entries retain only individually valid spots',()=>{const {c}=setup(),second={...savedOwn,id:'second'},writes=storage(c,{'gst-custom-v6':JSON.stringify([savedOwn,null,{},42,'bad',{lat:'57',lon:18},second])});assert.deepEqual(startup(c).customSpots,[savedOwn,second]);assert.equal(writes.length,0)});
test('own storage: invalid containers and JSON use the empty default without writes',()=>{for(const raw of ['{broken','null','{}','42','"bad"']){const {c}=setup(),writes=storage(c,{'gst-custom-v6':raw});assert.deepEqual(startup(c).customSpots,[]);assert.equal(writes.length,0)}});
test('own storage: valid list loads unchanged without writes',()=>{const {c}=setup(),list=[savedOwn,{...savedOwn,id:'second'}],writes=storage(c,{'gst-custom-v6':JSON.stringify(list)});assert.deepEqual(startup(c).customSpots,list);assert.equal(writes.length,0)});
const cacheCases=[['fetchWindSamples','windCache','wind_speed_10m'],['fetchTempSamples','tempCache','sea_surface_temperature'],['fetchSeaLevelSamples','levelCache','sea_level_height_msl'],['fetchWaveSamples','waveCache','wave_height'],['fetchCurrentSamples','currentNumericCache',null]];
function keyedCacheSetup([name,cache,field]){const {c}=setup(),pts=Array.from({length:8},(_,i)=>({lat:57+i/100,lon:18})),pending=[];let selected='A';c[cache]=new Map();c.viewCacheKey=()=>selected;c.currentSourcePoints=c.currentNumericPoints=()=>pts;c.sampleBounds=()=>({s:57,n:58,w:18,e:19});c.copernicusTime=()=>selected;
 c.weatherBatch=c.marineBatch=()=>{const d=deferred();pending.push(d);return d.promise};let calls=0;c.fetchCurrentPoint=p=>{if(calls++%8===0)pending.push(deferred());return pending.at(-1).promise.then(v=>({...p,value:v}))};
 return {c,pending,cache:c[cache],select:k=>selected=k,key:k=>field?k:k+':57.00:58.00:18.00:19.00',start:()=>c[name](),finish:(i,v)=>pending[i].resolve(field?pts.map(()=>({hourly:{time:c.timelineHours.map(t=>+t/1000),[field]:[v,v],wind_direction_10m:[90,90]}})):v)};
}
test('keyed caches: B cache hit does not invalidate pending A',async()=>{for(const entry of cacheCases){const h=keyedCacheSetup(entry);h.cache.set(h.key('B'),[{value:8}]);const a=h.start();h.select('B');await h.start();h.finish(0,12);await a;assert.equal(h.cache.get(h.key('A'))?.[0].value??h.cache.get(h.key('A'))?.[0].v,12,entry[0])}});
test('keyed caches: later A1 response cannot overwrite newer A2',async()=>{for(const entry of cacheCases){const h=keyedCacheSetup(entry),a=h.start(),b=h.start();h.finish(1,12);await b;h.finish(0,1);await a;const result=h.cache.get(h.key('A'))[0];assert.equal(result.value??result.v,12,entry[0])}});
test('keyed caches: overlapping independent keys both cache successfully',async()=>{for(const entry of cacheCases){const h=keyedCacheSetup(entry),a=h.start();h.select('B');const b=h.start();h.finish(1,12);await b;h.finish(0,7);await a;for(const [key,value] of [['A',7],['B',12]]){const result=h.cache.get(h.key(key))?.[0];assert.equal(result?.value??result?.v,value,entry[0]+' '+key)}}});

test('favourites storage: valid IDs survive a null neighbour without writes',()=>{const {c}=setup(),writes=storage(c,{'gst-favs':'[1,3,null]'});assert.deepEqual(startup(c).favs,[1,3]);assert.equal(writes.length,0)});
test('favourites storage: ordinary favourite click preserves valid saved IDs',async()=>{const {c,element}=setup(),writes=storage(c,{'gst-favs':'[1,3,null]'});startup(c);assert.equal(writes.length,0);c.renderList=()=>{};await c.openSpot({id:5,name:'Five',rating:3,lat:57,lon:18});element('#favA').onclick();await new Promise(setImmediate);assert.equal(writes.length,1);assert.equal(writes[0][0],'gst-favs');assert.deepEqual(JSON.parse(writes[0][1]),[1,3,5])});
test('favourites storage: mixed entries retain valid numeric and string IDs',()=>{const {c}=setup(),writes=storage(c,{'gst-favs':JSON.stringify([1,null,{},3,[],false,'c1',true])});assert.deepEqual(startup(c).favs,[1,3,'c1']);assert.equal(writes.length,0)});
test('favourites storage: invalid JSON and containers use the empty default without writes',()=>{for(const raw of ['{broken','null','{}','42','"bad"']){const {c}=setup(),writes=storage(c,{'gst-favs':raw});assert.deepEqual(startup(c).favs,[]);assert.equal(writes.length,0)}});
test('favourites storage: a fully valid list loads unchanged without writes',()=>{const {c}=setup(),values=[1,3,'c1'],writes=storage(c,{'gst-favs':JSON.stringify(values)});assert.deepEqual(startup(c).favs,values);assert.equal(writes.length,0)});
