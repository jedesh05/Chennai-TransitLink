'use strict';
const Network = (() => {
  const names=new Map(), board=new Map(), walks=new Map(), hubs=[];
  const bits={bus:1,rail:2,metro:4};
  const norm=s=>s.toUpperCase().replace(/[^A-Z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  const placeToken=s=>norm(s).replace(/\s/g,'');
  const placeStem=s=>placeToken(s.replace(/\s+(?:railway station|suburban station|rail station|metro(?: station)?|mrts(?: station)?|bus (?:terminus|terminal|stand|stop)|r\.?s\.?|b\.?t\.?)$/i,''));
  const key=(mode,name)=>mode[0]+':'+norm(name);
  function stop(key,name,mode) {
    names.set(key,{key,name,mode});
    return key;
  }
  function service(mode,label,calls,info={}) {
    const out={mode,label,calls,...info};
    if (info.directionStatus==='conflict') return out;
    calls.slice(0,-1).forEach(([k,a,d],i)=>{
      if (mode==='rail' && d===null) return;
      if (!board.has(k)) board.set(k,[]);
      board.get(k).push([out,i]);
    });
    return out;
  }
  const trains=TRANSIT.rail.map(([label,mask,rows])=>
    service('rail',label,rows.map(([c,...rest])=>[stop('r:'+c,TRANSIT.stations[c],'rail'),...rest]),{mask,stopPattern:TRANSIT.railPatterns?.[label],trainType:TRANSIT.railTypes?.[label]}));
  const blue='Airport|Meenambakkam|Nanganallur Road|Alandur|Guindy|Little Mount|Saidapet|Nandanam|Teynampet|AG-DMS|Thousand Lights|LIC|Government Estate|Chennai Central|High Court|Mannadi|Washermenpet|Sir Thiyagaraya College|Tondiarpet|New Washermenpet|Toll Gate|Kaladipet|Thiruvotriyur Theradi|Thiruvotriyur|Wimco Nagar|Wimco Nagar Depot'.split('|');
  const green='Chennai Central|Egmore|Nehru Park|Kilpauk|Pachaiyappas College|Shenoy Nagar|Anna Nagar East|Anna Nagar Tower|Thirumangalam|Koyambedu|CMBT|Arumbakkam|Vadapalani|Ashok Nagar|Ekkattuthangal|Alandur|St. Thomas Mount'.split('|');
  const yellow='Poonamallee Bypass|Poonamallee Bus Stand|Poonamallee Government Hospital|Karayanchavadi|Kumananchavadi|Kattupakkam|Iyappanthangal|Thelliyaragaram|Porur Bypass|Porur Junction|Vadapalani'.split('|');
  const lines={'Blue Line':blue,'Green Line':green,'Yellow Line':yellow,'Inter-corridor':green.slice(0,-1).concat(blue.slice(0,3).reverse())};
  const groups=new Map();
  for (const [line,day,from,to,times] of TRANSIT.metro) {
    const k=line+'|'+from;
    if (!groups.has(k)) groups.set(k,{line,from,to,times:{}});
    groups.get(k).times[day]=times;
  }
  const metros=[...groups.values()].map(({line,from,to,times})=>{
    const seq=[...lines[line]];
    if (seq[0]!==from) seq.reverse();
    return service('metro',line,seq.map((n,i)=>{
      const offset=Math.round(i*(line==='Yellow Line'?2.7:2.5));
      return [stop(key('metro',n),n,'metro'),offset,offset];
    }),{from,to,times});
  });
  const feed=globalThis.MTC;
  const busLocations=new Map();
  const busKeys=(feed?.stops||[]).map(([name,lng,lat],index)=>{
    const k=stop('b:'+index,name,'bus');
    busLocations.set(k,[lng,lat]);
    return k;
  });
  const feedDay=date=>Date.UTC(+date.slice(0,4),+date.slice(4,6)-1,+date.slice(6,8))/86400000;
  const calendars=new Map(Object.entries(feed?.calendar||{}).map(([id,[start,end,mask]])=>
    [id,{start:feedDay(start),end:feedDay(end),mask}]));
  const buses=(feed?.patterns||[]).map(([label,calendar,keys,trips,tiers=[]],variant)=>{
    const maximumDeparture=trips.reduce((max,trip)=>Math.max(max,trip.at(-1)),0);
    return service('bus',label,keys.map(index=>[busKeys[index]]),{
      variant,calendar:calendars.get(calendar),trips,tiers,orders:[],lookback:Math.floor(maximumDeparture/86400),
    });
  }).sort((a,b)=>a.label.localeCompare(b.label,undefined,{numeric:true}));
  const areaRows=[
    ['Chennai Central',13.082,80.275,'MAS MASS MPK MPKT','Chennai Central'],
    ['Egmore',13.078,80.261,'MS','Egmore'],
    ['Guindy',13.009,80.213,'GDY','Guindy'],
    ['St. Thomas Mount',13.000,80.200,'STM','St. Thomas Mount'],
    ['Saidapet',13.023,80.223,'SP','Saidapet'],
    ['Tirusulam / Airport',12.980,80.170,'TLM','Airport'],
    ['Chennai Beach',13.093,80.293,'MSB',''],
    ['High Court / Parrys',13.088,80.285,'','High Court'],
    ['Tambaram',12.925,80.119,'TBM',''],
    ['Pallavaram',12.968,80.150,'PV',''],
    ['Chromepet',12.952,80.141,'CMP',''],
    ['T. Nagar / Mambalam',13.038,80.221,'MBM',''],
    ['CMBT',13.069,80.203,'','CMBT'],
    ['Vadapalani',13.050,80.212,'','Vadapalani'],
    ['Alandur',13.005,80.201,'','Alandur'],
    ['Poonamallee',13.048,80.108,'','Poonamallee Bus Stand'],
    ['Porur Junction',13.038,80.157,'','Porur Junction'],
    ['Kumananchavadi',13.049,80.124,'','Kumananchavadi'],
    ['Iyyappanthangal',13.038,80.136,'','Iyappanthangal'],
    ['Thiruvotriyur',13.160,80.303,'TVT','Thiruvotriyur'],
    ['Tondiarpet',13.127,80.288,'','Tondiarpet'],
    ['Washermenpet',13.108,80.279,'WST','Washermenpet'],
    ['Avadi',13.118,80.101,'AVD',''],
    ['Ambattur',13.113,80.154,'ABU',''],
    ['Perambur',13.108,80.244,'PER',''],
    ['Velachery',12.976,80.221,'VLCY',''],
    ['Thiruvanmiyur',12.989,80.246,'TYMR',''],
    ['Chengalpattu',12.692,79.975,'CGL',''],
    ['Tiruvallur',13.124,79.914,'TRL',''],
    ['Tiruttani',13.175,79.617,'TRT',''],
    ['Kadambathur',13.099,79.863,'KBT',''],
    ['Thiruninravur',13.114,80.026,'TI',''],
    ['Gummidipoondi',13.409,80.114,'GPD',''],
    ['Ponneri',13.333,80.191,'PON',''],
    ['Minjur',13.279,80.262,'MJR',''],
    ['Kanchipuram',12.849,79.706,'CJ',''],
    ['Kanchipuram East',12.839,79.715,'CJE',''],
    ['Walajabad',12.790,79.823,'WJ',''],
    ['Vandalur',12.891,80.079,'VDR',''],
    ['Urapakkam',12.867,80.069,'UPM',''],
    ['Guduvancheri',12.843,80.061,'GI',''],
    ['Maraimalai Nagar',12.794,80.025,'MMNK',''],
    ['Singaperumal Koil',12.761,80.002,'SKL',''],
    ['Paranur',12.727,79.984,'PWU',''],
  ];
  function link(a,b,mins) {
    if (!walks.has(a)) walks.set(a,new Map());
    if (!walks.has(b)) walks.set(b,new Map());
    walks.get(a).set(b,mins);
    walks.get(b).set(a,mins);
  }
  for (const [n,lat,lng,r,m] of areaRows) {
    const keys=[...r.split(' ').map(x=>'r:'+x),key('metro',m)].filter(x=>names.has(x));
    if (!keys.length) continue;
    const area=stop('hub:'+n,n,'hub');
    hubs.push({key:area,name:n,lat,lng,keys});
    keys.forEach((entry,i)=>{
      link(area,entry,4);
      keys.slice(i+1).forEach(other=>link(entry,other,9));
    });
  }
  // Approximate pedestrian connections between named places. The timetable
  // files provide stop names and schedules, but no walking paths.
  for (const [a,b,min] of [
    ['Chennai Beach','High Court / Parrys',17],
  ]) {
    const left=hubs.find(h=>h.name===a),right=hubs.find(h=>h.name===b);
    for (const one of left.keys) for (const two of right.keys) link(one,two,min);
  }
  // Match interchange platforms by position, leaving similarly named distant stops separate.
  const binSize=0.01, busGrid=new Map();
  const bin=value=>Math.floor(value/binSize);
  for (const [k,[lng,lat]] of busLocations) {
    const cell=bin(lng)+','+bin(lat);
    if (!busGrid.has(cell)) busGrid.set(cell,[]);
    busGrid.get(cell).push([k,lng,lat]);
  }
  const interchangePoints=new Map();
  for (const {key,keys,lng,lat} of hubs) {
    interchangePoints.set(key,[lng,lat]);
    for (const entry of keys) interchangePoints.set(entry,[lng,lat]);
  }
  for (const [code,position] of Object.entries(globalThis.RAIL_GEOGRAPHY||{})) {
    if (names.has('r:'+code)) interchangePoints.set('r:'+code,position);
  }
  // A bus stop explicitly named for a Metro station can locate an otherwise
  // unmapped interchange when all matching bus platforms form one cluster.
  const metroBusPoints=new Map();
  for (const [k,position] of busLocations) {
    const {name}=names.get(k);
    if (!/\smetro(?: station)?$/i.test(name)) continue;
    const stem=placeStem(name);
    if (!metroBusPoints.has(stem)) metroBusPoints.set(stem,[]);
    metroBusPoints.get(stem).push(position);
  }
  for (const {key:k,name,mode} of names.values()) {
    if (mode!=='metro'||interchangePoints.has(k)) continue;
    const points=metroBusPoints.get(placeStem(name))||[];
    if (!points.length) continue;
    const [lng,lat]=points[0];
    if (points.every(([x,y])=>111.2*Math.hypot(x-lng,y-lat)<=0.35)) {
      interchangePoints.set(k,[lng,lat]);
    }
  }
  function nearbyBus(lng,lat,limit,visit) {
    for (let x=bin(lng)-1;x<=bin(lng)+1;x++) for (let y=bin(lat)-1;y<=bin(lat)+1;y++) {
      for (const [bus,busLng,busLat] of busGrid.get(x+','+y)||[]) {
        const km=111.2*Math.hypot(busLat-lat,(busLng-lng)*Math.cos(lat*Math.PI/180));
        if (km<=limit) visit(bus,km);
      }
    }
  }
  const walkMinutes=km=>Math.max(2,Math.ceil(km*1.35/4.5*60));
  for (const [k,[lng,lat]] of interchangePoints) {
    nearbyBus(lng,lat,0.55,(bus,km)=>link(k,bus,walkMinutes(km)));
  }
  for (const [k,[lng,lat]] of busLocations) {
    const stem=placeStem(names.get(k).name);
    nearbyBus(lng,lat,0.35,(bus,km)=>{
      if (bus>k&&placeStem(names.get(bus).name)===stem) link(k,bus,walkMinutes(km));
    });
  }
  const placeLocations=new Map([...interchangePoints,...busLocations]);
  const istNow=()=>new Date(Date.now()+330*60000).toISOString().slice(0,16);
  const parse=s=>Date.parse(s+'Z')/60000;
  const clock=n=>new Date(Math.round(n)*60000).toISOString().slice(11,16);
  const weekday=d=>new Date(d*86400000).getUTCDay();
  function metroDay(day,holidayDay) {
    const w=weekday(day);
    return w===0||day===holidayDay?'Sunday / public holidays':w===6?'Saturday':'Monday-Friday';
  }
  const stationCalls=new Map();
  for (const service of [...trains,...metros]) {
    service.calls.forEach(([key],index)=>{
      if (!stationCalls.has(key)) stationCalls.set(key,[]);
      stationCalls.get(key).push({service,index});
    });
  }
  let updates=new Map(),positions=new Map();
  let expiry=0;
  const metroId=service=>service.label+'|'+service.from;
  const tripKey=(service,day,start)=>JSON.stringify([service.mode,service.mode==='rail'?service.label:metroId(service),day,start]);
  function loadServiceUpdates(snapshot,now=Date.now()) {
    const records=new Map();
    const until=Date.parse(snapshot?.expiresAt);
    if (!Number.isFinite(until)||until<=now||!Array.isArray(snapshot?.updates)) return false;
    for (const item of snapshot.updates) {
      if (!item||!['rail','metro'].includes(item.mode)||!/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
      const source=item.mode==='rail'?'NTES':'CMRL';
      if (item.source!==source) continue;
      const millis=Date.parse(item.date+'T00:00:00Z');
      if (!Number.isFinite(millis)||new Date(millis).toISOString().slice(0,10)!==item.date) continue;
      const day=millis/86400000;
      const service=item.mode==='rail'?trains.find(s=>s.label===item.service):metros.find(s=>metroId(s)===item.service);
      const start=item.mode==='rail'?0:item.start;
      if (!service||!Number.isInteger(start)||(item.mode==='metro'&&
        !Object.values(service.times).some(times=>times.includes(start)))) continue;
      const cancelled=item.status==='cancelled';
      const delay=item.status==='delayed'&&Number.isInteger(item.delayMinutes)?item.delayMinutes:0;
      if (!cancelled&&(delay<1||delay>720)) continue;
      records.set(tripKey(service,day,start),{cancelled,delay,source});
    }
    const nextPositions=new Map();
    for (const item of Array.isArray(snapshot.positions)?snapshot.positions:[]) {
      if (!item||item.source!=='NTES'||!trains.some(train=>train.label===item.service)) continue;
      const {lat,lng}=item,observed=Date.parse(item.observedAt);
      if (!Number.isFinite(lat)||!Number.isFinite(lng)||lat<11||lat>15||lng<77||lng>82||
          !Number.isFinite(observed)||observed>now||now-observed>180000) continue;
      if (observed>(nextPositions.get(item.service)?.observed??-Infinity)) {
        nextPositions.set(item.service,{lat,lng,observed,source:item.source});
      }
    }
    positions=nextPositions;
    updates=records;
    expiry=until;
    return true;
  }
  const tripUpdate=(service,day,start=0)=>updates.size&&expiry>Date.now()?updates.get(tripKey(service,day,start)):undefined;
  const clearServiceUpdates=()=>{updates=new Map();positions=new Map();expiry=0;};
  function railPosition(service,now=Date.now()) {
    const position=positions.get(service.label);
    return position&&expiry>now&&position.observed<=now&&now-position.observed<=180000?position:null;
  }
  function railProgress(train,now) {
    const {calls,mask}=train;
    const day=Math.floor(now/1440);
    const first=calls[0][2],last=calls.at(-1)[1];
    if (first===null||last===null) return null;
    for (let d=day-1;d<=day+7;d++) {
      if (!(mask&(1<<weekday(d)))) continue;
      const update=tripUpdate(train,d);
      if (update?.cancelled) {
        if (d===day) return {state:'cancelled',update};
        continue;
      }
      const base=d*1440+(update?.delay||0);
      if (now>base+last) continue;
      if (now<base+first) return {state:'upcoming',base,index:0,next:0,fraction:0,update};
      for (let i=0;i<calls.length;i++) {
        const [,arr,dep]=calls[i];
        if (arr!==null&&now<base+arr) {
          const previous=base+(calls[i-1][2]??calls[i-1][1]);
          return {state:'between',base,index:i-1,next:i,fraction:(now-previous)/(base+arr-previous),update};
        }
        if (now<=base+(dep??arr)) return {state:'at',base,index:i,next:Math.min(i+1,calls.length-1),fraction:0,update};
      }
    }
    return null;
  }
  function stationTimetable(key,now,{fastOnly=false,memuOnly=false}={}) {
    const day=Math.floor(now/1440),rows=[];
    const startOfDay=day*1440,endOfDay=(day+1)*1440;
    for (const {service,index} of stationCalls.get(key)||[]) {
      const {mode,calls}=service;
      if ((fastOnly&&!service.stopPattern)||(memuOnly&&service.trainType!=="MEMU")) continue;
      const [,arr,dep]=calls[index];
      const arrivalOffset=mode==='metro'&&index===0?null:arr;
      const departureOffset=mode==='metro'&&index===calls.length-1?null:dep;
      for (let d=day-1;d<=day;d++) {
        if (mode==='rail'&&!(service.mask&(1<<weekday(d)))) continue;
        const starts=mode==='rail'?[0]:service.times[metroDay(d)];
        for (const start of starts) {
          const update=tripUpdate(service,d,start);
          const minute=d*1440+start+(update?.delay||0);
          const withinDay=offset=>offset!==null&&minute+offset>=startOfDay&&minute+offset<endOfDay?
            minute+offset:null;
          const arrival=withinDay(arrivalOffset);
          const departure=withinDay(departureOffset);
          const next=arrival!==null&&arrival>=now?arrival:departure;
          if (next!==null&&next>=now) rows.push({service,arrival,departure,next,terminal:index===calls.length-1,update});
        }
      }
    }
    return rows.sort((a,b)=>a.next-b.next||a.service.label.localeCompare(b.service.label)).slice(0,12);
  }
  function departure(s,i,ready,holidayDay) {
    const day=Math.floor(ready/1440), offset=s.calls[i][2];
    if (s.mode==='rail') {
      let earliest=null;
      for (let d=Math.floor((ready-offset-720)/1440);d<=day+1;d++) {
        const update=tripUpdate(s,d);
        if (update?.cancelled) continue;
        const base=d*1440+(update?.delay||0),t=base+offset;
        if (t>=ready&&(!earliest||t<earliest[0])&&(s.mask&(1<<(d===holidayDay?0:weekday(d))))) earliest=[t,base,update];
      }
      return earliest;
    }
    const hasUpdates=updates.size&&expiry>Date.now();
    let earliest=null;
    for (let d=day-1;d<=day+1;d++) {
      const starts=s.times[metroDay(d,holidayDay)];
      if (!hasUpdates) {
        const start=starts.find(t=>d*1440+t+offset>=ready);
        if (start!==undefined) return [d*1440+start+offset,d*1440+start];
        continue;
      }
      for (const start of starts) {
        const update=tripUpdate(s,d,start);
        if (update?.cancelled) continue;
        const base=d*1440+start+(update?.delay||0),t=base+offset;
        if (t>=ready&&(!earliest||t<earliest[0])) earliest=[t,base,update];
      }
    }
    return earliest;
  }
  class queue {
    items=[];
    push(item) {
      const a=this.items;
      let i=a.length;
      a.push(item);
      while (i>0) {
        const p=(i-1)>>1;
        if (a[p].score<=item.score) break;
        a[i]=a[p]; i=p;
      }
      a[i]=item;
    }
    pop() {
      const a=this.items,first=a[0],tail=a.pop();
      if (!a.length) return first;
      let i=0;
      while (i*2+1<a.length) {
        let c=i*2+1;
        if (c+1<a.length&&a[c+1].score<a[c].score) c++;
        if (a[c].score>=tail.score) break;
        a[i]=a[c]; i=c;
      }
      a[i]=tail;
      return first;
    }
  }
  function busArrivals(s,i,ready,limit) {
    const offset=i*2+1,day=Math.floor(ready/1440);
    const sorted=s.orders[i]??=i===0?s.trips:[...s.trips].sort((a,b)=>a[offset]-b[offset]);
    const choices=[];
    for (let d=Math.max(day-s.lookback,s.calendar.start);d<=Math.min(Math.floor(limit/1440),s.calendar.end);d++) {
      if (!(s.calendar.mask&(1<<weekday(d)))) continue;
      const threshold=Math.ceil((ready-d*1440)*60-1e-6);
      let low=0,high=sorted.length;
      while (low<high) {
        const mid=(low+high)>>1;
        if (sorted[mid][offset]<threshold) low=mid+1;
        else high=mid;
      }
      for (let index=low;index<sorted.length;index++) {
        const trip=sorted[index],base=d*1440,dep=base+trip[offset]/60;
        if (dep>limit||dep>=(choices[s.calls.length-1]?.arr??Infinity)) break;
        for (let j=i+1;j<s.calls.length;j++) {
          const arr=base+trip[j*2]/60;
          if (arr>limit) break;
          if (!choices[j]||arr<choices[j].arr) choices[j]={dep,arr,base,trip};
        }
      }
    }
    return choices;
  }
  function find(from,to,start,{modes=7,via='',holiday=false,travelDay=Math.floor(start/1440),required=0,sequence=[],horizon=480,viaOnBoard=true,stopWeight=0,rideWeight=0,originAccess=null,excludeBus=new Set()}={}) {
    const origins=new Set([from].flat()),destinations=new Set([to].flat());
    const waypoints=new Set(via ? [via].flat() : []);
    const pending=new queue(),best=new Map();
    const holidayDay=holiday?travelDay:NaN;
    function add(k,t,rides,stops,mask,viaSeen,prev,leg) {
      if (t>start+horizon) return;
      viaSeen ||= waypoints.has(k);
      const score=t+stops*stopWeight+rides*rideWeight+rides/100;
      const id=JSON.stringify([k,sequence.length?rides:0,required?mask:0,viaSeen,Boolean(leg?.service)]);
      const labels=best.get(id)||[];
      if (labels.some(x=>!x.stale&&x.rides<=rides&&x.t<=t&&x.score<=score)) return;
      for (const x of labels) if (rides<=x.rides&&t<=x.t&&score<=x.score) x.stale=true;
      const state={k,t,rides,stops,mask,viaSeen,prev,leg,score};
      best.set(id,[...labels.filter(x=>!x.stale),state]);
      pending.push(state);
    }
    for (const origin of origins) {
      if (originAccess&&!(bits[names.get(origin).mode]&modes)) continue;
      add(origin,start+(originAccess?.get(origin)||0),0,0,0,!waypoints.size,null,null);
    }
    while (pending.items.length) {
      const x=pending.pop();
      if (x.stale) continue;
      if (destinations.has(x.k)&&x.rides&&x.viaSeen&&(x.mask&required)===required&&(!sequence.length||x.rides===sequence.length)) {
        const legs=[];
        let origin=x;
        for (;origin.leg;origin=origin.prev) legs.push(origin.leg);
        return {arrival:x.t,rides:x.rides,stops:x.stops,legs:legs.reverse(),
          approach:originAccess?{key:origin.k,minutes:origin.t-start}:null};
      }
      for (const [k,min] of walks.get(x.k)||[]) {
        if (!(modes&bits.bus)&&(x.k.startsWith('b:')||k.startsWith('b:'))) continue;
        if ((x.k.startsWith('hub:')&&!origins.has(x.k)&&!waypoints.has(x.k))||(k.startsWith('hub:')&&!destinations.has(k)&&!waypoints.has(k))) continue;
        add(k,x.t+min,x.rides,x.stops,x.mask,x.viaSeen,x,{mode:'walk',keys:[x.k,k],dep:x.t,arr:x.t+min});
      }
      if (x.rides===(sequence.length||5)) continue;
      const ready=x.t+(x.leg?.service?4:0);
      for (const [s,i] of board.get(x.k)||[]) {
        const bit=bits[s.mode];
        if (!(bit&modes)||(sequence.length&&s.mode!==sequence[x.rides])) continue;
        if (s.mode==='bus') {
          if (excludeBus.has(s.label)) continue;
          const choices=busArrivals(s,i,ready,start+horizon);
          let passed=x.viaSeen;
          for (let j=i+1;j<choices.length;j++) {
            const [k]=s.calls[j];
            passed ||= viaOnBoard&&waypoints.has(k);
            const time=choices[j];
            if (time) add(k,time.arr,x.rides+1,x.stops+j-i,x.mask|bit,passed,x,
              {mode:s.mode,service:s,index:i,last:j,...time});
          }
          continue;
        }
        const time=departure(s,i,ready,holidayDay);
        if (!time) continue;
        const [dep,base,update]=time;
        let passed=x.viaSeen;
        for (let j=i+1;j<s.calls.length;j++) {
          const [k,a]=s.calls[j];
          passed ||= viaOnBoard && waypoints.has(k);
          if (s.mode==='rail'&&a===null) continue;
          const arr=base+a;
          if (arr<dep) continue;
          add(k,arr,x.rides+1,x.stops+j-i,x.mask|bit,passed,x,{mode:s.mode,service:s,index:i,last:j,dep,arr,update});
        }
      }
    }
    return null;
  }
  return {buses,busLocations,trains,metros,names,hubs,bits,norm,placeToken,placeStem,placeLocations,find,stationTimetable,railProgress,railPosition,loadServiceUpdates,clearServiceUpdates,istNow,parse,clock};
})();
globalThis.Network=Network;





