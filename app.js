'use strict';
(() => {
  const N=Network,$=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={bus:'Bus',rail:'Train',metro:'Metro',walk:'Walk'};
  const busTierStyles={
    ORDINARY:['ord','ORD · Ordinary'],DELUXE:['dlx','DLX · Deluxe'],
    AC:['ac','AC'],EXPRESS:['exp','EXP · Express'],
  };
  const tierBadges=tiers=>[...new Set((tiers||[]).map(tier=>tier==='EXECUTIVE'?'DELUXE':tier))]
    .filter(tier=>Object.hasOwn(busTierStyles,tier)).map(tier=>{
      const [style,label]=busTierStyles[tier];
      return '<span class="bus-tier tier-'+style+'">'+esc(label)+'</span>';
    }).join('');
  const name=k=>N.names.get(k).name;
  const placeKey=N.placeToken;
  const places=[],byStop=new Map(),byStem=new Map(),byLabel=new Map(),byAlias=new Map();
  const stem=value=>{
    const key=N.placeStem(value);
    if (key==='MGRCENTRAL') return 'CHENNAICENTRAL';
    if (key==='KCBTKILAMBAKKAM') return 'KILAMBAKKAM';
    return key;
  };
  function addPlace(p,keys) {
    const group={...p,keys:[],aliases:new Set(),positions:[]};
    places.push(group);
    return addStops(group,keys);
  }
  function addStops(group,keys) {
    for (const key of keys) {
      if (byStop.has(key)) continue;
      byStop.set(key,group);
      group.keys.push(key);
      const stop=N.names.get(key);
      group.aliases.add(placeKey(stop.name));
      if (stop.mode==='rail') group.aliases.add(key.slice(2));
      const position=N.placeLocations.get(key);
      if (position) group.positions.push(position);
      const token=stem(stop.name);
      if (!byStem.has(token)) byStem.set(token,new Set());
      byStem.get(token).add(group);
    }
    return group;
  }
  const km=([lng,lat],[x,y])=>111.2*Math.hypot(lat-y,(lng-x)*Math.cos(lat*Math.PI/180));
  for (const {key,keys} of N.hubs) addPlace(N.names.get(key),[key,...keys]);
  for (const p of N.names.values()) {
    if (byStop.has(p.key)) continue;
    const position=N.placeLocations.get(p.key),candidates=byStem.get(stem(p.name))||[];
    let distance=0.55,match=null;
    if (position) for (const group of candidates) {
      // Compare against the existing group's original location so a chain of
      // similarly named stops cannot merge places across multiple neighbourhoods.
      const anchor=group.positions[0];
      if (!anchor) continue;
      const separation=km(anchor,position);
      if (separation<=distance) {distance=separation;match=group;}
    }
    if (match) addStops(match,[p.key]);
    else addPlace(p,[p.key]);
  }
  for (const place of places) {
    const original=place.name,token=placeKey(original);
    if (byLabel.has(token)) {
      const position=place.positions[0];
      const area=position&&N.hubs.map(h=>[h.name,km(position,[h.lng,h.lat])]).sort((a,b)=>a[1]-b[1])[0];
      const qualifier=area&&area[1]<2&&placeKey(area[0])!==token?area[0]:labels[place.mode]||'Stop';
      place.name=original+' ('+qualifier+')';
      for (let count=2;byLabel.has(placeKey(place.name));count++) place.name=original+' ('+qualifier+' '+count+')';
    }
    byLabel.set(placeKey(place.name),place);
    for (const alias of place.aliases) if (!byAlias.has(alias)) byAlias.set(alias,place);
  }
  places.sort((a,b)=>(b.mode==='hub')-(a.mode==='hub')||a.name.localeCompare(b.name));
  const resolve=value=>{
    const token=placeKey(value);
    return byLabel.get(token)||byAlias.get(token)||(token==='KILAMBAKKAM'?byAlias.get('KILAMBAKKAMBUSTERMINUS'):undefined);
  };
  for (const f of ['from','to','via']) {
    const update=()=>{
      const query=placeKey($(f).value);
      $(f+'-options').innerHTML=places.filter(p=>placeKey(p.name).includes(query)||
        [...p.aliases].some(alias=>alias.includes(query)))
        .slice(0,64).map(p=>'<option value="'+esc(p.name)+'"></option>').join('');
    };
    $(f).oninput=update;
    update();
  }
  const clockFormat=new Intl.DateTimeFormat('en-GB',{
    timeZone:'Asia/Kolkata',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',
  });
  function updateClock() {
    const time=clockFormat.format(new Date());
    const clock=$('clock');
    clock.dateTime=time+'+05:30';
    $('clock-minute').textContent=time.slice(0,5);
    $('clock-seconds').textContent=time.slice(5);
  }
  updateClock();
  setInterval(updateClock,1000);
  $('holiday').onchange=()=>{$('holiday-note').hidden=!$('holiday').checked;};
  const selectedModes=()=>[...document.querySelectorAll('[name=mode]:checked')]
    .reduce((mask,input)=>mask|Number(input.value),0);
  const locationPrompt=$('location-prompt');
  let promptedForLocation=false;
  $('from').addEventListener('focus',()=>{
    if (!promptedForLocation&&!$('from').value) {
      promptedForLocation=true;
      locationPrompt.hidden=false;
    }
  });
  $('location-enable').onclick=()=>$('locate').click();
  $('location-manual').onclick=()=>{locationPrompt.hidden=true;$('from').focus();};
  $('from').addEventListener('input',()=>{locationPrompt.hidden=true;});
  let access=null,locationRequest=0;
  function resetLocation() {
    access=null;
    locationRequest++;
    $('locate').disabled=false;
    $('location-status').textContent='';
  }
  $('from').addEventListener('input',resetLocation);
  $('swap').onclick=()=>{[$('from').value,$('to').value]=[$('to').value,$('from').value];resetLocation();};
  $('locate').onclick=()=>{
    const status=$('location-status'),button=$('locate'),request=++locationRequest;
    promptedForLocation=true;
    locationPrompt.hidden=true;
    if (!navigator.geolocation||!isSecureContext) {
      status.textContent='Open the HTTPS website to use your location, or enter a starting stop.';
      return;
    }
    access=null;
    status.textContent='Looking for nearby stops…';
    button.disabled=true;
    function receive({coords:{latitude,longitude,accuracy}}) {
      if (request!==locationRequest) return;
      button.disabled=false;
      const candidates=[...N.placeLocations].flatMap(([key,[lng,lat]])=>{
        const mode=N.names.get(key)?.mode;
        if (!N.bits[mode]) return [];
        const km=111.2*Math.hypot(lat-latitude,(lng-longitude)*Math.cos(latitude*Math.PI/180));
        return [{key,mode,km}];
      }).sort((a,b)=>a.km-b.km);
      const closest=candidates.find(stop=>(N.bits[stop.mode]&selectedModes())&&stop.km<=1.5);
      if (!closest) {
        status.textContent='No mapped stop for the selected travel modes is within 1.5 km. Choose a starting stop.';
        return;
      }
      const nearby=Object.keys(N.bits).flatMap(mode=>candidates.filter(stop=>stop.mode===mode&&stop.km<=1.5).slice(0,4));
      const title=byStop.get(closest.key)?.name||name(closest.key);
      $('from').value=title;
      access={title,stops:new Map(nearby.map(stop=>[stop.key,Math.ceil(stop.km*1.3/4.5*60)]))};
      status.textContent=(accuracy>500?'Location is approximate. ':'')+'Using nearby stops, including '+name(closest.key)+'.';
    }
    function rejected(error) {
      if (request!==locationRequest) return;
      button.disabled=false;
      status.textContent=error.code===1?
        (location.protocol==='file:'?'Location was blocked in this file preview. Open the HTTPS website and allow location, or enter a starting stop.':
          'Location permission was blocked. Allow it in your browser site settings, or enter a starting stop.'):
        error.code===3?'Location timed out. Try again or enter a starting stop.':'Your device could not find its location. Try again or enter a starting stop.';
    }
    navigator.geolocation.getCurrentPosition(receive,error=>{
      if (request!==locationRequest) return;
      if (error.code===1) {rejected(error);return;}
      status.textContent='Trying a more accurate location fix…';
      navigator.geolocation.getCurrentPosition(receive,rejected,{enableHighAccuracy:true,timeout:12000,maximumAge:0});
    },{timeout:8000,maximumAge:60000});
  };
  function diagram(rows) {
    return '<ol class="route">'+rows.map(([p,note,stage])=>'<li><span>'+esc(stage||name(p))+'</span>'+(note?'<small>'+esc(note)+'</small>':'')+'</li>').join('')+'</ol>';
  }
  const endpoint=(s,end)=>end?s.to||name(s.calls.at(-1)[0]):s.from||name(s.calls[0][0]);
  const time=(t,start)=>{
    const days=Math.floor(Math.round(t)/1440)-Math.floor(start/1440);
    return N.clock(t)+(days>0?' +'+days+' day'+(days===1?'':'s'):'');
  };
  const durationLabel=minutes=>{
    minutes=Math.ceil(minutes-1e-7);
    const hours=Math.floor(minutes/60),rest=minutes%60;
    return hours?hours+' hr'+(rest?' '+rest+' min':''):minutes+' min';
  };
  const metroLineClasses=new Map([
    ['Blue Line','metro-blue'],['Green Line','metro-green'],['Yellow Line','metro-yellow'],['Inter-corridor','metro-inter'],
  ]);
  const serviceClass=(mode,service)=>[mode,metroLineClasses.get(service?.label)].filter(Boolean).join(' ');
  const boards=[...document.querySelectorAll('.station-board')].map(panel=>{
    const mode=panel.dataset.network, get=selector=>panel.querySelector(selector);
    const select=get('[data-board-select]');
    const choices=[...N.names.values()].filter(stop=>stop.mode===mode).sort((a,b)=>a.name.localeCompare(b.name));
    select.innerHTML=choices.map(stop=>'<option value="'+esc(stop.key)+'">'+
      esc(stop.name+(mode==='rail'?' ('+stop.key.slice(2)+')':''))+'</option>').join('');
    select.value=mode==='metro'?'m:CHENNAI CENTRAL':'r:MSB';
    function refresh() {
      const now=N.parse(N.istNow());
      get('[data-board-clock]').textContent='Updated '+N.clock(now)+' IST';
      const fastOnly=get('#fast-only')?.checked||false;
      get('[data-display-station]').textContent=name(select.value);
      get('.display-source').textContent=mode==='metro'?'Estimated':'Scheduled';
      const memuOnly=get('#memu-only')?.checked||false;
      const rows=N.stationTimetable(select.value,now,{fastOnly,memuOnly});
      if (rows.some(row=>row.update)) get('.display-source').textContent='Operator updates + schedule';
      get('[data-board-empty]').textContent=fastOnly?'No more fast or semi-fast locals scheduled here today.':memuOnly?'No more MEMU trains scheduled here today.':'No more trains scheduled here today.';
      get('table').hidden=!rows.length;
      get('[data-board-empty]').hidden=Boolean(rows.length);
      const renderTime=t=>t===null?'<td aria-label="No time today">—</td>':'<td><strong>'+esc(N.clock(t))+'</strong></td>';
      get('[data-board-rows]').innerHTML=rows.map(row=>{
        const {service,arrival,departure,terminal,update}=row,pattern=service.trainType||service.stopPattern;
        const updateLabel=update?(update.cancelled?'Cancelled':'Delayed '+update.delay+' min')+' · '+update.source:'';
        const direction=terminal?'From '+name(service.calls[0][0]):'Towards '+name(service.calls.at(-1)[0]);
        return '<tr><td><span class="route-chip '+serviceClass(service.mode,service)+'">'+esc(service.label)+'</span>'+
          (pattern?'<small class="fast-local">'+esc(pattern)+'</small>':'')+(updateLabel?'<small class="operator-change">'+esc(updateLabel)+'</small>':'')+'</td>'+
          renderTime(arrival)+renderTime(departure)+'<td>'+esc(direction)+'</td></tr>';
      }).join('');
    }
    select.onchange=refresh;
    const fast=get('#fast-only');
    const memu=get('#memu-only');
    if (fast) fast.onchange=()=>{if(fast.checked)memu.checked=false;refresh();};
    if (memu) memu.onchange=()=>{if(memu.checked)fast.checked=false;refresh();};
    refresh();
    return refresh;
  });
  setInterval(()=>boards.forEach(refresh=>refresh()),15000);
  const resultMaps=[];
  let arrivalLandmark=null;
  $('to').addEventListener('input',()=>{arrivalLandmark=null;});
  $('swap').addEventListener('click',()=>{arrivalLandmark=null;});
  function result(title,r,start,networkReady=start) {
    const mapIndex=resultMaps.push({title,legs:r.legs,arrival:r.arrival,approach:r.approach})-1;
    const hasMetro=r.legs.some(x=>x.mode==='metro');
    const elapsed=r.arrival-start;
    let ready=r.approach?start+r.approach.minutes:networkReady;
    const approach=r.approach?'<li class="wait-step">Walk about '+esc(durationLabel(r.approach.minutes))+' to '+esc(name(r.approach.key))+'</li>':'';
    const steps=r.legs.map(l=>{
      const s=l.service,points=s?s.calls.slice(l.index,l.last+1):l.keys.map(k=>[k]);
      const from=points[0][0],to=points.at(-1)[0],mins=l.arr-l.dep;
      let board=name(from),alight=name(to);
      if (l.mode==='walk'&&board===alight) {
        const placeType={bus:'bus stop',metro:'Metro station',rail:'rail station',hub:'area'};
        board+=' '+placeType[N.names.get(from).mode];
        alight+=' '+placeType[N.names.get(to).mode];
      }
      const wait=s&&l.dep>ready?
        '<li class="wait-step">Wait '+esc(durationLabel(l.dep-ready))+' at '+esc(name(from))+'</li>':'';
      const timing=s?(l.mode==='metro'?'Est. ':'')+time(l.dep,start)+'–'+time(l.arr,start)+' IST':
        'About '+durationLabel(mins);
      const notes=[];
      if (l.update?.delay) notes.push(l.update.source+' reports a '+l.update.delay+' min delay');
      if (l.mode==='metro') notes.push('Metro times estimated');
      if (l.mode==='bus') notes.push('Reclaim Chennai timetable');
      const tiers=l.mode==='bus'?tierBadges(s.tiers[s.trips.indexOf(l.trip)]):'';
      const route=points.map(([k,a],i)=>[k,l.mode==='bus'?
        time(l.base+l.trip[(l.index+i)*2+(i===0?1:0)]/60,start):
        l.mode==='rail'&&a!==null?time(l.arr-s.calls[l.last][1]+a,start):'']);
      const direction=s?'<p class="leg-direction">'+'Towards '+esc(endpoint(s,true))+'</p>':'';
      const detail=s?'<details class="stop-details"><summary>View stops ('+points.length+')</summary>'+diagram(route)+'</details>':'';
      ready=l.arr;
      return wait+'<li class="step '+serviceClass(l.mode,s)+'"><div class="step-head"><strong>'+
        esc(s?'Board '+(s.trainType||labels[l.mode])+' '+s.label:'Walk')+'</strong><span>'+esc(timing)+
        '</span></div><p class="step-points">'+esc(board)+' <span aria-hidden="true">→</span> '+esc(alight)+
        '</p>'+direction+(tiers?'<div class="bus-tier-list">'+tiers+'</div>':'')+
        (notes.length?'<p class="leg-note">'+notes.map(esc).join(' · ')+'</p>':'')+detail+'</li>';
    }).join('');
    const transfers=r.rides===1?'No transfers':(r.rides-1)+' transfer'+(r.rides===2?'':'s');
    const modes=r.legs.filter(l=>l.service).map(l=>'<span class="route-chip '+serviceClass(l.mode,l.service)+'">'+esc((l.service.trainType||labels[l.mode])+' '+l.service.label)+'</span>').join('');
    const summary=durationLabel(elapsed);
    const arrival=(hasMetro?'Estimated arrival ':'Arrival ')+time(r.arrival,start)+' IST';
    return '<article class="journey-card"><div class="journey-card-head"><div><h4>'+esc(title)+
      '</h4><p class="muted">'+transfers+(arrival?' · '+esc(arrival):'')+'</p></div><strong class="journey-duration">'+esc(summary)+
      '</strong></div><div class="journey-chips">'+modes+'</div><ol class="journey-steps">'+approach+steps+
      '</ol><div class="journey-actions"><button class="primary" type="button" data-follow-trip="'+mapIndex+'">Follow this trip</button><button class="journey-map-button" type="button" data-journey-map="'+mapIndex+'">Show on map</button><button type="button" data-share-trip="'+mapIndex+'">Share trip</button></div></article>';
  }
  const guestTripsKey='transitlink-saved-trips-v1';
  const profileSessionKey='transitlink-local-profile';
  const memoryTrips=new Map();
  let profile='',identity=null;
  try {profile=sessionStorage.getItem(profileSessionKey)||'';} catch {}
  const tripKey=()=>identity?guestTripsKey+':account:'+identity.uid:profile?guestTripsKey+':profile:'+profile.toLowerCase():guestTripsKey;
  function loadTrips() {
    try {
      const items=JSON.parse(localStorage.getItem(tripKey()));
      if (Array.isArray(items)) return items.filter(t=>t&&typeof t.from==='string'&&typeof t.to==='string').slice(0,20);
    } catch {}
    return memoryTrips.get(tripKey())||[];
  }
  let saved=loadTrips();
  function storeTrips() {
    memoryTrips.set(tripKey(),saved);
    try {localStorage.setItem(tripKey(),JSON.stringify(saved));return true;} catch {return false;}
  }
  const account=$('account-button'),dialog=$('account-dialog');
  function refreshAccount() {
    account.textContent=identity||profile?'Log out':'Log in';
    account.title=identity||profile?'Log out of '+(identity?.label||profile):'Log in to TransitLink';
    if (identity||profile) account.removeAttribute('aria-haspopup');
    else account.setAttribute('aria-haspopup','dialog');
  }
  function changeProfile(name) {
    profile=name;
    try {
      if (profile) sessionStorage.setItem(profileSessionKey,profile);
      else sessionStorage.removeItem(profileSessionKey);
    } catch {}
    refreshTrips();
  }
  function refreshTrips() {
    saved=loadTrips();
    refreshAccount();
    renderSaved();
    $('save-status').textContent=identity||profile?'Saved trips for '+(identity?.label||profile)+'.':'Showing guest trips.';
    const saveButton=$('save-trip');
    if (saveButton) {
      saveButton.textContent='Save trip';
      saveButton.disabled=false;
    }
  }
  window.addEventListener('transitlink:identity',event=>{
    identity=event.detail;
    if (identity) changeProfile('');
    else refreshTrips();
  });
  account.onclick=()=>{
    if (identity) {window.dispatchEvent(new Event('transitlink:signout'));return;}
    if (profile) {changeProfile('');return;}
    $('profile-name').value='';
    $('account-error').textContent='';
    dialog.showModal();
  };
  $('account-cancel').onclick=()=>dialog.close();
  $('account-form').onsubmit=event=>{
    event.preventDefault();
    const name=$('profile-name').value.trim();
    if (!name) {$('account-error').textContent='Enter a profile name.';return;}
    changeProfile(name);
    dialog.close();
  };
  refreshAccount();
  function renderSaved() {
    $('saved-trips').innerHTML=saved.length?saved.map((t,i)=>
      '<div class="saved-row"><button class="saved-open" type="button" data-trip="'+i+'">'+esc(t.from)+' → '+esc(t.to)+
      (t.via?'<small>Via '+esc(t.via)+'</small>':'')+'</button>'+
      '<button type="button" data-remove="'+i+'" aria-label="'+esc('Remove '+t.from+' to '+t.to)+'">Remove</button></div>'
    ).join(''):'<p class="muted">Save a journey from its results to find it here.</p>';
  }
  function setModes(modes) {
    for (const input of document.querySelectorAll('[name=mode]')) input.checked=Boolean(modes&Number(input.value));
  }
  $('saved-trips').onclick=event=>{
    const button=event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-remove')) {
      saved.splice(Number(button.dataset.remove),1);
      $('save-status').textContent=storeTrips()?'Trip removed.':'Trip removed for this session.';
      renderSaved();
      return;
    }
    const t=saved[Number(button.dataset.trip)];
    if (!t) return;
    $('from').value=t.from;
    $('to').value=t.to;
    arrivalLandmark=guideLandmarks.find(item=>item.title===t.place&&item.destination?.name===t.to)||null;
    $('via').value=t.via||'';
    $('departure').value='';
    $('holiday').checked=false;
    $('holiday').onchange();
    $('preference').value=['fastest','transfers','stops'].includes(t.preference)?t.preference:'fastest';
    setModes((t.modes&7)||7);
    resetLocation();
    if (location.hash!=='#planner') location.hash='planner';
    showView(false);
    $('plan').requestSubmit();
  };
  const navigation=[...document.querySelectorAll('.app-nav a')];
  const guide=$('passenger-guide'),guideInput=$('guide-input'),messages=$('guide-messages');
  let guideTrip=null;
  let guideContext=null,guideGeneration=0;
  const passengerFacts=[
    {match:/\bmetro\b.*\b(?:ticket|tickets|qr|fare|payment)\b|\b(?:ticket|tickets|qr|fare|payment)\b.*\bmetro\b/i,
      answer:'For a Chennai Metro trip, you can buy a QR ticket through the CMRL app or at a station counter. Scan the code at the entry and exit gates. Check the fare for your exact stations before paying.',
      source:'Chennai Metro Rail · Ticketing and AFC'},
    {match:/\b(?:wheelchair|step.free|accessible|accessibility|lifts?|elevators?)\b/i,
      answer:'CMRL lists lifts between street, concourse and platform, wide ticket gates and wheelchair space on trains. Ask station staff which entrance has the lift and whether it is operating. I can help find a Metro trip, but I don’t have live lift status.',
      source:'Chennai Metro Rail · Accessibility facilities'},
    {match:/\b(?:ordinary|deluxe|express)\b.*\b(?:bus|fare)\b|\b(?:bus|fare)\b.*\b(?:ordinary|deluxe|express)\b/i,
      answer:'MTC lists different distance-based fare tables for Ordinary, Express and Deluxe buses. Check the service type and ask the conductor for the fare to your stop.',
      source:'Metropolitan Transport Corporation · Bus fares'},
  ];
  const guideAliases=new Map(Object.entries({
    CENTRAL:'Chennai Central',MGRCENTRAL:'Chennai Central',MAS:'Chennai Central',
    CHENNAIAIRPORT:'Tirusulam / Airport',AIRPORT:'Tirusulam / Airport',MAA:'Tirusulam / Airport',
    KCBT:'Kilambakkam Bus Terminus',KILAMBAKKAM:'Kilambakkam Bus Terminus',
    CMBT:'CMBT',KOYAMBEDUBUSTERMINUS:'CMBT',
  }));
  const guideStop=value=>resolve(guideAliases.get(placeKey(value))||value);
  function guideMessage(text,actions=[],user=false) {
    const bubble=document.createElement('div');
    bubble.className='guide-message'+(user?' guide-user':'');
    const sender=document.createElement('span');
    sender.className='guide-sender';
    sender.textContent=user?'You':'Vazhi';
    const body=document.createElement('p');
    body.textContent=text;
    bubble.append(sender,body);
    if (actions.length) {
      const controls=document.createElement('div');
      controls.className='guide-actions';
      for (const [label,action] of actions) {
        const button=document.createElement('button');
        button.type='button';
        button.textContent=label;
        button.onclick=action;
        controls.append(button);
      }
      bubble.append(controls);
    }
    messages.append(bubble);
    messages.scrollTop=messages.scrollHeight;
  }
  function guideOpenPage(hash) {
    guide.close();
    location.hash=hash;
  }
  function nearbyGuideNames(value) {
    const query=placeKey(value);
    if (query.length<3||query.length>48) return [];
    function distance(a,b) {
      let row=Array.from({length:b.length+1},(_,i)=>i);
      for (const ch of a) {
        const next=[row[0]+1];
        for (let j=0;j<b.length;j++) next.push(Math.min(next[j]+1,row[j+1]+1,row[j]+(ch!==b[j])));
        row=next;
      }
      return row.at(-1);
    }
    return places.flatMap(place=>{
      const candidate=placeKey(place.name);
      if (candidate.includes(query)) return [{place,score:candidate.length-query.length}];
      const limit=Math.min(2,Math.floor(query.length/4));
      if (!limit||Math.abs(candidate.length-query.length)>limit) return [];
      const edits=distance(query,candidate);
      return edits<=limit?[{place,score:20+edits}]:[];
    }).sort((a,b)=>a.score-b.score).slice(0,4).map(item=>item.place);
  }
  function offerGuideTrip(fromText,toText,settings={modes:7,direct:false,departure:''},preview=false) {
    const from=guideStop(fromText),to=guideStop(toText);
    if (!from||!to) {
      const unknown=from?toText:fromText;
      const choices=nearbyGuideNames(unknown);
      guideTrip={from:from?.name||fromText,to:to?.name||toText,missing:from?'to':'from',settings};
      guideMessage('Which stop do you mean by “'+unknown+'”? '+(choices.length?'Choose one below or type its full name.':'Type the station or stop name shown in TransitLink.'),
        choices.map(place=>[place.name,()=>answerGuide(place.name)]));
      return;
    }
    guideTrip=null;
    if (from.key===to.key) {guideMessage('Both names lead to '+from.name+'. Enter a different destination.');return;}
    guideContext={from:from.name,to:to.name,settings};
    const generation=guideGeneration;
    const previewTrip=()=>{
      const local=settings.departure||N.istNow();
      guideMessage('Checking '+from.name+' → '+to.name+' from '+local.replace('T',' ')+' IST…');
      setTimeout(()=>{
          if (generation!==guideGeneration) return;
          const start=N.parse(local);
          const options={modes:settings.modes};
          const journey=settings.direct?Object.entries(N.bits).filter(([,bit])=>settings.modes&bit)
            .map(([mode,bit])=>N.find(from.keys,to.keys,start,{modes:bit,sequence:[mode]}))
            .filter(Boolean).sort((a,b)=>a.arrival-b.arrival)[0]:N.find(from.keys,to.keys,start,options);
          if (!journey) {
            guideMessage('No '+(settings.direct?'direct ':'')+'journey found within eight hours for those options. Try another time or allow transfers.');
            return;
          }
          const rides=journey.legs.filter(leg=>leg.service).map(({service,index,last,dep})=>
            labels[service.mode]+' '+service.label+' at '+time(dep,start)+' from '+name(service.calls[index][0])+
            ' to '+name(service.calls[last][0]));
          guideMessage(rides.join('. Then ')+'. Planned arrival '+time(journey.arrival,start)+' IST. Check the planner for walks and transfer details.');
      },25);
    };
    guideMessage('I found '+from.name+' → '+to.name+'. I can check the next connection or open the full planner.',[
      ['Check next connection',previewTrip],
      ['Find connections',()=>{
        $('from').value=from.name;
        $('to').value=to.name;
        arrivalLandmark=null;
        $('via').value='';
        $('departure').value=settings.departure;
        resetLocation();
        setModes(settings.modes);
        guideOpenPage('planner');
        $('plan').requestSubmit();
      }],
    ]);
    if (preview) previewTrip();
  }
  function answerMetroTransfer(question) {
    const names={'blue':'Blue Line','green':'Green Line','yellow':'Yellow Line'};
    const colors=[...new Set(question.match(/\b(blue|green|yellow)\b/gi)?.map(color=>color.toLowerCase())||[])];
    if (colors.length<2) {
      guideMessage('Tell me the two Metro lines or the stations you’re travelling between. For example, “Blue Line to Green Line”. Follow the interchange signs at your transfer station.');
      return;
    }
    const [a,b]=colors.map(color=>names[color]);
    const first=N.metros.find(service=>service.label===a);
    const second=N.metros.find(service=>service.label===b);
    const keys=new Set(second?.calls.map(([key])=>key));
    const shared=first?.calls.filter(([key])=>keys.has(key)).map(([key])=>name(key))||[];
    guideMessage(shared.length?'You can change between the '+a+' and '+b+' at '+shared.join(' or ')+
      '. The better interchange depends on where you start and where you’re heading. Tell me both stops and I’ll check a trip.':
      'I couldn’t find a shared station between the '+a+' and '+b+' in the bundled timetable. Tell me your starting stop and destination so I can check a connecting route.');
  }
  function answerGuide(value) {
    let question=value.trim().replace(/[?!.,;]+$/,'');
    if (!question) return;
    guideMessage(value,[],true);
    const when=question.match(/(?:^|\s)(?:after|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
    let departure='';
    if (when) {
      let hours=Number(when[1]);
      const minutes=Number(when[2]||0),period=when[3]?.toLowerCase();
      if ((period?(hours>=1&&hours<=12):hours<=23)&&minutes<60) {
        if (period) hours=hours%12+(period==='pm'?12:0);
        const now=N.istNow();
        departure=now.slice(0,11)+String(hours).padStart(2,'0')+':'+String(minutes).padStart(2,'0');
        if (departure<now) departure=new Date((N.parse(departure)+1440)*60000).toISOString().slice(0,16);
        question=question.slice(0,when.index).trim();
      }
    }
    const modes=/\b(?:direct bus|bus only|only buses?)\b/i.test(question)?1:
      /\b(?:direct metro|metro only|only metro)\b/i.test(question)?4:
        /\b(?:direct train|train only|only trains?)\b/i.test(question)?2:0;
    const direct=/\b(?:direct|no transfers?|without changing)\b/i.test(question);
    const starting=question.match(/^(?:start|leave|depart)\s+from\s+(.+?)(?:\s+instead)?$/i);
    if (guideContext&&(starting||((departure||modes||direct)&&!(/\s+to\s+|→|->/.test(question))))) {
      const previous=guideContext.settings;
      offerGuideTrip(starting?.[1]||guideContext.from,guideContext.to,
        {modes:modes||previous.modes,direct:direct||previous.direct,departure:departure||previous.departure},true);
      return;
    }
    const fact=passengerFacts.find(item=>item.match.test(question));
    if (fact) {guideMessage(fact.answer+' Source · '+fact.source+'.');return;}
    const placeReply=question.replace(/^(?:(?:i am|i['’]m)\s+(?:arriving at|coming from|at)|(?:i\s+)?(?:need|want)\s+to\s+(?:get to|go to|reach)|(?:take me|going)\s+to)\s+/i,'');
    const trip=question.match(/^(?:(?:how do i (?:get|go)|(?:i want to|can i) (?:go|travel)|plan (?:a trip|my trip))\s+)?(?:from\s+)?(.+?)\s*(?:\s+to\s+|→|->)\s*(.+)$/i);
    const query=question.toLowerCase();
    if (/\b(?:change|switch|transfer|interchange)\b.*\b(?:line|metro)\b|\b(?:blue|green|yellow)\b.*\bto\b.*\b(?:blue|green|yellow)\b/i.test(question)) {
      guideTrip=null;
      answerMetroTransfer(question);
    } else if (/\bnew\s+(?:here|to\s+(?:the\s+)?(?:city|chennai))|\bfirst time\b|\bjust arrived\b/i.test(question)&&!trip?.slice(1).every(guideStop)) {
      guideTrip=null;
      guideMessage('Welcome to Chennai. Where did you arrive, and where are you headed? You can start with Central, Egmore, the airport, KCBT or CMBT. Tell me a landmark or stop and I’ll help you find a route.',[
        ['Choose an arrival point',()=>guideOpenPage('arrival-guide')],
      ]);
    } else if (trip&&(guideStop(trip[1])||guideStop(trip[2])||nearbyGuideNames(trip[1]).length||nearbyGuideNames(trip[2]).length)&&!guideStop(placeReply)&&(!/\b(ticket|fare|platform|last train|first train)\b/i.test(trip[1]))) {
      offerGuideTrip(trip[1],trip[2],{modes:modes||7,direct,departure},Boolean(departure));
    } else if (guideTrip&&guideStop(placeReply)) {
      const current=guideTrip;
      current[current.missing]=placeReply;
      offerGuideTrip(current.from,current.to,current.settings);
    } else if (/\b(ticket|fare|pay|payment)\b/.test(query)) {
      guideMessage('Check the fare and ticket options at the station counter or with the bus conductor. Keep local transit tickets separate from your outstation booking. TransitLink can plan your trip and show where to board.');
    } else if (/\b(terminal|kcbt|cmbt|outstation)\b/.test(query)) {
      guideMessage('Read the boarding point on your ticket before travelling. KCBT means Kilambakkam Bus Terminus. CMBT is in Koyambedu. If your booking names a different pickup point, use that exact place in the planner.',[
        ['Plan to KCBT',()=>{guideTrip={from:'',to:'Kilambakkam Bus Terminus',missing:'from'};guideMessage('Where are you starting from?');}],
        ['Plan to CMBT',()=>{guideTrip={from:'',to:'CMBT',missing:'from'};guideMessage('Where are you starting from?');}],
      ]);
    } else if (/\b(last|first|arrival|arrivals|departure|departures|platform|timetable|delays?)\b/.test(query)) {
      guideMessage('Open Stations and choose your Metro or suburban station for upcoming timetable times. Check the station display for your platform or any last-minute changes.',[['Open Stations',()=>guideOpenPage('stations')]]);
    } else if (/\b(tourist|sightseeing|beach|temple|monuments?)\b/.test(query)) {
      guideMessage('Explore lists beaches, temples and monuments in and around Chennai, with trip planning where a stop is available.',[['Open Explore',()=>guideOpenPage('tourist-places')]]);
    } else if (guideStop(placeReply)) {
      guideTrip={from:placeReply,to:'',missing:'to'};
      guideMessage('Where would you like to go from '+guideStop(placeReply).name+'?');
    } else {
      guideMessage('Try a station and destination, such as “Egmore to Marina Beach”. I can also help with bus terminals, tickets, and station timetables.');
    }
  }
  function greetGuide() {
    guideMessage('Hi, I’m Vazhi. Just arrived in Chennai? Tell me where you’re starting and where you need to go. I’ll help you find a connection using TransitLink’s timetables.');
  }
  $('passenger-guide-open').onclick=()=>{
    guide.showModal();
    if (!messages.childElementCount) greetGuide();
  };
  $('guide-new-chat').onclick=()=>{guideTrip=null;guideContext=null;guideGeneration++;messages.replaceChildren();guideInput.value='';greetGuide();guideInput.focus();};
  $('passenger-guide-close').onclick=()=>guide.close();
  $('guide-form').onsubmit=event=>{
    event.preventDefault();
    answerGuide(guideInput.value);
    guideInput.value='';
  };
  for (const prompt of guide.querySelectorAll('.guide-prompts button')) {
    const question=prompt.textContent;
    prompt.onclick=()=>answerGuide(question);
  }
  const touristGuide=globalThis.TOURIST_PLACES;
  const touristCards=$('tourist-results');
  let guideLandmarks=[];
  if (touristGuide) {
    const areaAliases={Covelong:'Kovalam',Pulicat:'Pulicat Bus Stand Pazhaverkadu',Marina:'Marina Beach',
      'Near Chengalpattu':'Chengalpattu','Tambaram area':'Tambaram',Tiruvottiyur:'Thiruvotriyur',Periyamet:'Chennai Central'};
    const entries=touristGuide.places.map(([title,area,summary,category])=>{
      if (title==='Government Museum'&&resolve('Egmore Museum')) {
        return {title,area,summary,category,destination:resolve('Egmore Museum'),areaOnly:false,
          onward:'Continue on foot to the Government Museum on Pantheon Road, Egmore.'};
      }
      const stop=resolve(title);
      const areaOnly=!stop;
      const destination=stop||resolve(areaAliases[area]||area);
      return {title,area,summary,category,destination,areaOnly};
    });
    guideLandmarks=entries;
    const wildlife=entry=>entry.category===5&&/zoo|wildlife|reptile|crocodile|bird|habitat|sanctuary/i.test(entry.title+' '+entry.summary);
    let selectedCategory='';
    const featured=[...document.querySelectorAll('[data-tourist-category]')];
    function renderTouristPlaces() {
      const terms=N.norm($('tourist-search').value).split(' ').filter(Boolean);
      const category=selectedCategory;
      const visible=entries.map((entry,index)=>[entry,index]).filter(([entry])=>
        (category===''||(category==='zoo'?wildlife(entry):entry.category===Number(category)))&&
        terms.every(term=>N.norm([entry.title,entry.area,entry.summary,touristGuide.categories[entry.category]].join(' ')).includes(term)));
      $('tourist-empty').hidden=Boolean(visible.length);
      for (const button of featured) {
        button.setAttribute('aria-pressed',String(category===button.dataset.touristCategory));
      }
      touristCards.innerHTML=visible.map(([entry,index])=>{
        const {title,area,summary,category,destination,areaOnly}=entry;
        const theme=category===0?'coast':category===1||category===2?'temple':
          ['monument','museum','zoo','','','stadium'][category-3]||'';
        return '<article class="tourist-card '+theme+'"><div class="tourist-card-head">'+
          (theme?'<span class="heritage-coin '+theme+'" aria-hidden="true"><i></i></span>':'')+
          '<div><p class="tourist-category">'+esc(touristGuide.categories[category])+'</p>'+
          '<h3>'+esc(title)+'</h3><p class="tourist-area">'+esc(area)+'</p></div></div><p class="tourist-summary">'+esc(summary)+'</p>'+
          '<div class="tourist-card-footer">'+(destination?'<p class="muted">'+(areaOnly?'Area stop · ':'Transit stop · ')+esc(destination.name)+'</p>'+
          '<button type="button" data-tourist-trip="'+index+'">'+(areaOnly?'Plan to area':'Plan trip')+'</button>':
          '<p class="muted">No matching transit stop in TransitLink.</p>')+'</div></article>';
      }).join('');
    }
    $('tourist-search').addEventListener('input',renderTouristPlaces);
    for (const button of featured) button.onclick=()=>{
      const category=button.dataset.touristCategory;
      selectedCategory=selectedCategory===category?'':category;
      renderTouristPlaces();
    };
    touristCards.addEventListener('click',event=>{
      const button=event.target.closest('[data-tourist-trip]');
      if (!button) return;
      const landmark=entries[Number(button.dataset.touristTrip)];
      $('to').value=landmark.destination.name;
      $('to').dispatchEvent(new Event('input'));
      arrivalLandmark=landmark;
      location.hash='planner';
    });
    renderTouristPlaces();
  }
  const arrivalInput=$('arrival-destination'),arrivalMatches=$('arrival-matches'),arrivalStatus=$('arrival-status');
  const arrivalButtons=[...document.querySelectorAll('[data-arrival]')];
  let arrivalOrigin=null;
  function findArrivalMatches() {
    const query=placeKey(arrivalInput.value);
    arrivalMatches.replaceChildren();
    arrivalMatches.hidden=true;
    arrivalStatus.textContent='';
    if (query.length<2) return;
    const matches=guideLandmarks.filter(item=>placeKey(item.title).includes(query)||placeKey(item.area).includes(query))
      .sort((a,b)=>Number(placeKey(b.title)===query)-Number(placeKey(a.title)===query)).slice(0,6);
    const landmarkStops=new Set(matches.filter(item=>item.destination&&!item.areaOnly&&placeKey(item.title)===placeKey(item.destination.name)).map(item=>item.destination.key));
    const stopMatches=places.filter(stop=>!landmarkStops.has(stop.key)&&
      (placeKey(stop.name).includes(query)||[...stop.aliases].some(alias=>alias.includes(query))))
      .sort((a,b)=>Number(placeKey(b.name)===query)-Number(placeKey(a.name)===query)).slice(0,4);
    function addMatch(title,subtitle,destination,landmark=null) {
      const item=document.createElement('li'),button=document.createElement('button');
      button.type='button';
      button.textContent=title;
      const detail=document.createElement('small');
      detail.textContent=subtitle;
      button.append(detail);
      button.disabled=!destination;
      button.onclick=()=>{
        if (!arrivalOrigin) {
          arrivalStatus.textContent='Choose where you arrived first.';
          arrivalButtons[0].focus();
          return;
        }
        resetLocation();
        $('from').value=arrivalOrigin.name;
        $('to').value=destination.name;
        $('via').value='';
        arrivalLandmark=landmark;
        location.hash='planner';
        $('plan').requestSubmit();
      };
      item.append(button);
      arrivalMatches.append(item);
    }
    for (const landmark of matches) {
      const detail=landmark.destination?(landmark.areaOnly?'Area stop · ':'Transit stop · ')+landmark.destination.name:'No matching stop';
      addMatch(landmark.title,landmark.area+' · '+detail,landmark.destination,landmark);
    }
    for (const stop of stopMatches) addMatch(stop.name,'Transit stop',stop);
    arrivalMatches.hidden=!arrivalMatches.childElementCount;
    if (arrivalMatches.hidden) arrivalStatus.textContent='No matches. Try a neighbourhood, station or bus stop.';
  }
  arrivalInput.addEventListener('input',findArrivalMatches);
  for (const button of arrivalButtons) button.onclick=()=>{
    arrivalOrigin=resolve(button.dataset.arrival);
    for (const choice of arrivalButtons) choice.setAttribute('aria-pressed',String(choice===button));
    findArrivalMatches();
    arrivalInput.focus();
  };
  const sharedQuery=new URLSearchParams(location.search);
  const sharedFrom=resolve(sharedQuery.get('from')||''),sharedTo=resolve(sharedQuery.get('to')||'');
  if (sharedFrom&&sharedTo) {
    $('from').value=sharedFrom.name;
    $('to').value=sharedTo.name;
    $('via').value=resolve(sharedQuery.get('via')||'')?.name||'';
    const mask=Number(sharedQuery.get('modes'));
    if (Number.isInteger(mask)&&mask>=1&&mask<=7) setModes(mask);
    arrivalLandmark=guideLandmarks.find(item=>item.title===sharedQuery.get('place')&&item.destination?.key===sharedTo.key)||null;
  }
  const views=[...document.querySelectorAll('.workspace-view')];
  let activeView=null;
  function showView(scroll=true) {
    const hash=location.hash;
    const target=document.getElementById(hash.slice(1));
    const view=target?.closest('.workspace-view')||$('trip-view');
    for (const section of views) section.hidden=section!==view;
    const current=navigation.find(link=>link.hash==='#'+view.id)||navigation[0];
    for (const link of navigation) {
      if (link===current) link.setAttribute('aria-current','location');
      else link.removeAttribute('aria-current');
    }
    if (activeView!==view&&view.id==='trip-view') requestAnimationFrame(()=>{
      if (activeView===view) renderRailMap();
    });
    activeView=view;
    if (scroll) requestAnimationFrame(()=>{
      if (hash!==location.hash) return;
      if (target&&target.getClientRects().length) target.scrollIntoView({block:'start'});
      else window.scrollTo(0,0);
    });
  }
  window.addEventListener('hashchange',()=>showView());
  showView(Boolean(location.hash));
  renderSaved();
  let lastJourneyQuery='';
  const journeyQuery=()=>JSON.stringify([...$('plan').querySelectorAll('input,select')].map(el=>el.type==='checkbox'?el.checked:el.value));
  $('plan').onsubmit=async e=>{
    e.preventDefault();
    const from=resolve($('from').value),to=resolve($('to').value),v=resolve($('via').value);
    const modes=selectedModes();
    const out=$('results'),status=$('feedback'),submit=$('plan').querySelector('[type=submit]');
    out.hidden=true;
    resultMaps.length=0;
    if (!from||!to||from.key===to.key||!modes||($('via').value.trim()&&!v)) {
      status.textContent='Choose different, valid stops and at least one travel mode.';
      return;
    }
    const preference=$('preference').value;
    const local=$('departure').value||N.istNow(),start=N.parse(local);
    if (!Number.isFinite(start)) {status.textContent='Enter a valid departure time.';return;}
    const located=access?.title===from.name;
    const ready=start,origins=located?[...access.stops.keys()]:from.keys,destinations=to.keys;
    const opts={modes,via:v?.keys,originAccess:located?access.stops:null,holiday:$('holiday').checked,travelDay:Math.floor(start/1440)};
    lastJourneyQuery=journeyQuery();
    submit.disabled=true;
    status.textContent='Comparing connections…';
    await new Promise(r=>setTimeout(r,25));
    try {
      const plan=N.find(origins,destinations,ready,opts);
      let content='<div class="heading"><h2>'+esc(from.name+' → '+to.name)+'</h2><button id="save-trip" type="button">Save trip</button></div>';
      const landmark=arrivalLandmark?.destination?.key===to.key?arrivalLandmark:null;
      const onward=landmark?.onward||(landmark?.areaOnly?
        'Your transit trip ends at '+to.name+'. Continue to '+landmark.title+' from there. Walking directions are unavailable.':'');
      if (onward) content+='<p class="arrival-onward"><strong>Final leg</strong> '+esc(onward)+'</p>';
      content+='<p class="muted context">Search from '+esc(local.replace('T',' '))+' IST'+(located?' · includes an estimated walk to your boarding stop':'')+
        (opts.holiday?' · Sunday timetable for rail and Metro':'')+'. Bus times use Reclaim Chennai’s published timetable. Rail uses the bundled schedules. Metro times and walks are estimates.</p>';
      const sections=new Map();
      const add=(mode,markup)=>{
        if (!sections.has(mode)) sections.set(mode,[]);
        sections.get(mode).push(markup);
      };
      const shown=new Set(),directModes=new Set(),directRoutes=[];
      const signature=r=>JSON.stringify(r.legs.map(l=>l.service?
        [l.mode,l.service.variant??l.service.label,l.service.calls[l.index][0],l.service.calls[l.last][0]]:l.keys));
      function show(title,r) {
        if (!r) return;
        const sig=signature(r);
        if (shown.has(sig)) return;
        const used=new Set(r.legs.filter(leg=>leg.service).map(leg=>leg.mode));
        const mode=used.size===1?[...used][0]:'combined';
        if (r.rides===1) return;
        shown.add(sig);
        add(mode,result(title,r,start,ready));
      }
      for (const [mode,bit] of Object.entries(N.bits)) {
        if (!(modes&bit)) continue;
        const excludeBus=new Set();
        for (let count=0;count<(mode==='bus'?3:1);count++) {
          const search={...opts,modes:bit,sequence:[mode],excludeBus};
          const direct=N.find(origins,destinations,ready,search)||
            (count===0?N.find(origins,destinations,ready,{...search,horizon:1440}):null);
          if (!direct) break;
          const {service}=direct.legs.find(leg=>leg.service);
          excludeBus.add(service.label);
          directModes.add(mode);
          const serviceName=(service.trainType||labels[mode])+' '+service.label;
          directRoutes.push({title:'Direct '+serviceName,direct});
        }
      }
      if (directRoutes.length) {
        directRoutes.sort((a,b)=>a.direct.arrival-b.direct.arrival);
        add('direct','<p class="muted">One service with no transfers. Walking to or from stops may be included.</p>');
        for (const {title,direct} of directRoutes) add('direct',result(title,direct,start,ready));
      }
      if (!plan) {
        content+='<p class="muted">No complete trip found within eight hours. Check below for later departures.</p>';
        if (modes&(modes-1)) {
          const later=N.find(origins,destinations,ready,{...opts,horizon:1440});
          if (later) {
            show('Next available connection',later);
          }
        }
      }
      else {
        const quickest=v?'Quickest estimate via '+v.name:'Quickest local estimate';
        const fewer=N.find(origins,destinations,ready,{...opts,stopWeight:8});
        const simpler=N.find(origins,destinations,ready,{...opts,rideWeight:35});
        const options=[[quickest,plan]];
        if (fewer?.stops<plan.stops) options.push(['Fewer stops',fewer,'stops']);
        if (simpler?.rides<plan.rides) options.push(['Fewer transfers',simpler,'transfers']);
        const preferred=options.findIndex(option=>option[2]===preference);
        if (preferred>0) options.unshift(options.splice(preferred,1)[0]);
        for (const [title,route] of options) show(title,route);
        for (const [mode,bit] of Object.entries(N.bits)) if (modes&bit) show(labels[mode]+' only',N.find(origins,destinations,ready,{...opts,modes:bit}));
        const strategies=[
          [3,'Train → Bus',['rail','bus']],
          [3,'Bus → Train',['bus','rail']],
          [5,'Metro → Bus',['metro','bus']],
          [5,'Bus → Metro',['bus','metro']],
          [6,'Train → Metro',['rail','metro']],
          [6,'Metro → Train',['metro','rail']],
          [5,'Bus → Metro → Bus',['bus','metro','bus']],
        ];
        for (const [mask,title,sequence] of strategies) {
          if ((modes&mask)===mask) show(title,N.find(origins,destinations,ready,{...opts,sequence}));
        }
      }
      for (const [mode,bit] of Object.entries(N.bits)) {
        if (!(modes&bit)||sections.has(mode)) continue;
        const later=N.find(origins,destinations,ready,{...opts,modes:bit,horizon:1440});
        if (later) show('Next available connection',later);
        else if (!directModes.has(mode)) add(mode,'<p class="muted">No itinerary using only this mode was found in the bundled timetable within 24 hours.</p>');

      }
      const headings={direct:'Direct routes',bus:'MTC Bus',metro:'Metro',rail:'Suburban / MRTS',combined:'Combined journeys'};
      if (sections.size>1) {
        content+='<div class="result-jumps" aria-label="Jump to journey category">'+[...sections.keys()].map(mode=>
          '<a href="#results-'+mode+'">'+headings[mode]+'</a>').join('')+'</div>';
      }
      for (const [mode,cards] of sections) {
        content+='<section class="mode-results '+mode+'" aria-labelledby="results-'+mode+'"><h3 id="results-'+mode+'">'+headings[mode]+'</h3>'+cards.join('')+'</section>';
      }
      out.innerHTML=content;
      for (const button of out.querySelectorAll('[data-follow-trip]')) button.onclick=()=>{
        const journey=resultMaps[Number(button.dataset.followTrip)];
        beginFollow(journey,from.name,to.name,modes,v?.name||'',landmark,onward,local);
      };
      for (const button of out.querySelectorAll('[data-share-trip]')) button.onclick=()=>{
        const journey=resultMaps[Number(button.dataset.shareTrip)];
        const heading='TransitLink · '+from.name+' → '+(landmark?.title||to.name);
        const lines=journey.legs.map(leg=>{
          const service=leg.service,keys=service?[service.calls[leg.index][0],service.calls[leg.last][0]]:leg.keys;
          return (service?labels[leg.mode]+' '+service.label:'Walk')+' · '+name(keys[0])+' → '+name(keys[1])+
            ' · '+time(leg.dep,start)+'–'+time(leg.arr,start)+' IST';
        });
        if (onward) lines.push(onward);
        const url=new URL(location.href);
        const params=new URLSearchParams({from:from.name,to:to.name,modes:String(modes)});
        if (v) params.set('via',v.name);
        if (landmark) params.set('place',landmark.title);
        url.search=params.toString();
        url.hash='planner';
        const card=[heading,'Timetable plan · '+local.replace('T',' ')+' IST',...lines,'Arrival at transit stop · '+time(journey.arrival,start)+' IST'];
        if (url.protocol==='https:'||url.protocol==='http:') card.push('Replan: '+url.href);
        $('share-trip-text').value=card.join('\n');
        $('share-trip-status').textContent=url.protocol==='file:'?'You can copy this trip. Shareable planner links are available on the hosted site.':'';
        $('share-trip-dialog').showModal();
      };
      $('save-trip').onclick=()=>{
        const trip={from:from.name,to:to.name,via:v?.name||'',modes,preference};
        if (landmark) trip.place=landmark.title;
        const id=JSON.stringify(trip);
        saved=[trip,...saved.filter(item=>JSON.stringify(item)!==id)].slice(0,20);
        const stored=storeTrips();
        renderSaved();
        $('save-status').textContent=stored?'Trip saved on this device.':'Trip saved for this session.';
        $('save-trip').textContent=stored?'Saved':'Saved for this session';
        $('save-trip').disabled=true;
      };
      out.hidden=false;
      status.textContent='';
      const heading=out.querySelector('h2');
      heading.tabIndex=-1;
      heading.focus({preventScroll:true});
      out.scrollIntoView({block:'start'});
    } catch (err) {
      console.error(err);
      status.textContent='The search could not finish. Try another departure or refresh the page.';
    } finally {submit.disabled=false;}
  };
  $('share-trip-close').onclick=()=>$('share-trip-dialog').close();
  const followDialog=$('follow-trip-dialog'),resumeFollow=$('resume-follow');
  const followKey='transitlink-follow-trip-v1';
  let followed=null;
  try {
    const stored=JSON.parse(localStorage.getItem(followKey));
    if (Array.isArray(stored?.steps)&&stored.steps.length&&Number.isInteger(stored.index)&&
        stored.index>=0&&stored.index<stored.steps.length&&typeof stored.to==='string') followed=stored;
  } catch {}
  resumeFollow.hidden=!followed;
  function storeFollow() {
    resumeFollow.hidden=!followed;
    try {
      if (followed) localStorage.setItem(followKey,JSON.stringify(followed));
      else localStorage.removeItem(followKey);
    } catch {}
  }
  function beginFollow(journey,from,to,modes,via,landmark,onward,departure) {
    const steps=journey.legs.map(leg=>{
      const service=leg.service;
      const keys=service?[service.calls[leg.index][0],service.calls[leg.last][0]]:leg.keys;
      return {mode:leg.mode,from:name(keys[0]),to:name(keys[1]),fromKey:keys[0],
        service:service?.label,direction:service?endpoint(service,true):'',
        timing:time(leg.dep,N.parse(departure))+'–'+time(leg.arr,N.parse(departure))+' IST'};
    });
    if (journey.approach) steps.unshift({mode:'access',from:'Your location',to:name(journey.approach.key),
      timing:'About '+durationLabel(journey.approach.minutes)});
    if (onward) steps.push({mode:'onward',from:to,to:landmark.title,description:onward});
    followed={from,to,modes,via,place:landmark?.title,departure,index:0,steps};
    storeFollow();
    renderFollow();
    if (!followDialog.open) followDialog.showModal();
  }
  function currentFollowStep() {return followed?.steps[followed.index];}
  function renderFollow() {
    const step=currentFollowStep();
    if (!step) return;
    const title=step.mode==='onward'?'Continue to your destination':step.service?
      'Board '+labels[step.mode]+' '+step.service:'Walk to '+step.to;
    $('follow-destination').textContent=followed.from+' → '+(followed.place||followed.to);
    $('follow-progress').textContent='Step '+(followed.index+1)+' of '+followed.steps.length;
    const box=$('follow-instruction');
    const heading=document.createElement('h3');
    heading.textContent=title;
    box.replaceChildren(heading);
    for (const line of [
      step.description||(step.service?'Board at '+step.from+' · Get off at '+step.to:step.from+' → '+step.to),
      step.direction?'Towards '+step.direction:'',
      step.timing?'Planned '+step.timing:'',
      'Plan created for '+followed.departure.replace('T',' ')+' IST',
    ]) {
      if (!line) continue;
      const paragraph=document.createElement('p');
      paragraph.textContent=line;
      box.append(paragraph);
    }
    $('follow-previous').disabled=followed.index===0;
    $('follow-next').textContent=followed.index===followed.steps.length-1?'Finish trip':'Next step';
    $('follow-conductor').hidden=step.mode!=='bus';
    $('follow-missed').hidden=!step.service;
    $('follow-conductor-card').hidden=true;
    $('follow-conductor').setAttribute('aria-expanded','false');
  }
  resumeFollow.onclick=()=>{renderFollow();followDialog.showModal();};
  $('follow-close').onclick=()=>followDialog.close();
  $('follow-previous').onclick=()=>{
    if (followed.index>0) followed.index--;
    storeFollow();renderFollow();
  };
  $('follow-next').onclick=()=>{
    if (followed.index+1>=followed.steps.length) {followed=null;followDialog.close();storeFollow();return;}
    followed.index++;
    storeFollow();renderFollow();
  };
  $('follow-conductor').onclick=()=>{
    const step=currentFollowStep(),card=$('follow-conductor-card');
    if (!step||step.mode!=='bus') return;
    card.hidden=!card.hidden;
    $('follow-conductor').setAttribute('aria-expanded',String(!card.hidden));
    if (card.hidden) return;
    const service=document.createElement('strong');
    service.textContent='Bus / பேருந்து '+step.service;
    const request=document.createElement('p');
    request.textContent='Please let me know when we reach / இந்த நிறுத்தம் வந்ததும் சொல்லுங்கள்';
    const stop=document.createElement('strong');
    stop.textContent=step.to;
    card.replaceChildren(service,request,stop);
  };
  $('follow-missed').onclick=()=>{
    const step=currentFollowStep();
    if (!step?.service) return;
    const boardingPlace=byStop.get(step.fromKey);
    if (!boardingPlace) return;
    resetLocation();
    $('from').value=boardingPlace.name;
    $('to').value=followed.to;
    const remainingStops=new Set(followed.steps.slice(followed.index).flatMap(item=>[item.from,item.to]));
    $('via').value=remainingStops.has(followed.via)&&followed.via!==boardingPlace.name?followed.via:'';
    $('departure').value='';
    setModes((followed.modes&7)||7);
    arrivalLandmark=guideLandmarks.find(item=>item.title===followed.place&&item.destination?.name===followed.to)||null;
    followDialog.close();
    location.hash='planner';
    $('feedback').textContent='Check your current stop, then choose Find connections to replan for now.';
  };
  $('share-trip-copy').onclick=async()=>{
    const field=$('share-trip-text');
    try {
      await navigator.clipboard.writeText(field.value);
      $('share-trip-status').textContent='Trip card copied.';
    } catch {
      field.select();
      $('share-trip-status').textContent='Trip card selected. Use your device’s Copy command.';
    }
  };
  const lists={bus:N.buses,rail:N.trains,metro:N.metros};
  const directoryIds={
    bus:['bus-search','bus-services','bus-service-detail'],
    rail:['rail-search','rail-services','rail-service-detail'],
    metro:['metro-search','metro-services','metro-service-detail'],
  };
  const format=(value,type)=>value===null?'':type+' '+N.clock(value)+(value>=1440?' +1 day':'');
  const stationTiming=(arrival,departure,km)=>[format(arrival,'Arr'),format(departure,'Dep'),km+' km from origin'].filter(Boolean).join(' · ');
  let mappedTrain=null;
  const geography=new Map(Object.entries(globalThis.RAIL_GEOGRAPHY||{}).map(([code,coords])=>['r:'+code,coords]));
  for (const hub of N.hubs) for (const key of hub.keys) {
    if (key.startsWith('r:')&&!geography.has(key)) {
      geography.set(key,[hub.lng,hub.lat]);
    }
  }
  if (!geography.has('r:STMM')&&geography.has('r:STM')) {
    geography.set('r:STMM',geography.get('r:STM'));
  }
  const journeyStopLocation=new Map([...N.placeLocations,...geography]);
  for (const hub of N.hubs) {
    for (const key of [hub.key,...hub.keys]) if (!journeyStopLocation.has(key)) journeyStopLocation.set(key,[hub.lng,hub.lat]);
  }
  $('results').addEventListener('click',event=>{
    const button=event.target.closest('[data-journey-map]');
    const result=button&&resultMaps[Number(button.dataset.journeyMap)];
    if (!result) return;
    const legs=result.legs.map(leg=>{
      const keys=leg.service?leg.service.calls.slice(leg.index,leg.last+1).map(([key])=>key):leg.keys;
      return {mode:leg.mode,stops:keys.map(key=>({name:name(key),coords:journeyStopLocation.get(key)||null}))};
    });
    const first=legs[0].stops[0].name,last=legs.at(-1).stops.at(-1).name;
    window.dispatchEvent(new CustomEvent('transitlink:map-journey',{detail:{title:first+' → '+last,legs}}));
    location.hash='map';
  });
  // Ordered corridor stops keep fast services from drawing false shortcuts.
  const corridors=[
    ['South','#ffd18a','MSB MSF MPK MS MSC NBK MKK MBM SP GDY STM PZA MN TLM PV CMP TBMS TBM PRGL VDR UPM GI POTI CTM MMNK SKL PWU CGL'],
    ['MRTS','#ff96c4','MSB MSF MPKT MCPT MCPK MTCN MLHS MKAK MTMY MNDY GWYR KTPM KTBR INDR TYMR TRMN PRGD VLCY PZV STMM'],
    ['North','#91bfff','MASS BBQ KOK TNP VOC TVT WCN KAVM ENR AIPP AIP NPKM MJR APB PON KVP GPD ELR AKM TADA AKAT SPE'],
    ['West','#81e8bf','MASS BBQ VJM PER PCW PEW VLK KOTR PVM ABU TMVL ANNR AVD HC PAB NEC TI VEU SVR PTLR TRL EGT KBT SPAM MAF TO MSU PLMG AJJ TRT'],
    ['Pattabiram branch','#b8f484','PAB PTMS PRES'],
    ['Kanchipuram branch','#c5aeff','CGL RDY VB PALR PYV WJ NTT CJE CJ TMLP TKO AJJ'],
    ['Villupuram MEMU','#f99a79','CGL OV KGZ MMK MLMR ACK TZD OLA TMV MTL PEI VVN MYP VM'],
    ['Chennai junctions','#ddc4aa','MSB RPM WST VJM|MAS BBQ'],
  ].map(([,color,stops])=>({color,paths:stops.split('|').map(path=>path.split(' ').map(code=>'r:'+code))}));
  const networkColors=new Map();
  for (const {paths,color} of corridors) for (const key of paths.flat()) {
    if (geography.has(key)&&N.names.has(key)&&!networkColors.has(key)) networkColors.set(key,color);
  }
  const overviewLabels=new Set('MSB MASS AJJ TRT AVD TRL PRES SPE GPD TBM CGL CJ VM VLCY STMM'.split(' ').map(code=>'r:'+code));
  let mapScale=1,showNetwork=true,showAllStationNames=false,selectedRailStation='';
  const maxMapScale=12;
  const overlayIn=$('rail-overlay-in'),overlayOut=$('rail-overlay-out');
  const mapControls=[$('rail-zoom-in'),$('rail-zoom-out'),$('rail-fit')];
  let mapProjection=null,trainMarker=null;
  function moveTrainMarker(position,live) {
    if (!trainMarker||!mapProjection||!position) return;
    const [x,y]=mapProjection(position),plot=trainMarker.parentElement;
    if (x<0||y<0||x>plot.offsetWidth||y>plot.offsetHeight) return;
    trainMarker.style.left=x+'px';
    trainMarker.style.top=y+'px';
    trainMarker.classList.toggle('is-live',live);
    trainMarker.hidden=false;
  }
  function refreshRailTracker() {
    if (!trainMarker||!mappedTrain) return;
    trainMarker.hidden=true;
    const progress=N.railProgress(mappedTrain,N.parse(N.istNow()));
    if (progress?.state==='cancelled') return;
    const live=N.railPosition(mappedTrain);
    if (live) {
      trainMarker.title='Operator-reported train position';
      moveTrainMarker([live.lng,live.lat],true);
    } else if (progress&&progress.state!=='upcoming') {
      const from=geography.get(mappedTrain.calls[progress.index][0]);
      const to=progress.state==='between'?geography.get(mappedTrain.calls[progress.next][0]):from;
      if (from&&to) {
        trainMarker.title='Train position estimated from timetable';
        moveTrainMarker(from.map((value,index)=>value+(to[index]-value)*progress.fraction),false);
      }
    }
  }
  setInterval(refreshRailTracker,15000);
  function renderRailMap(keepCenter=false,anchor=null) {
    const diagram=$('rail-diagram'),train=mappedTrain;
    if (!diagram.clientWidth||!diagram.clientHeight) return;
    const oldPlot=diagram.firstElementChild;
    keepCenter=keepCenter&&Boolean(oldPlot);
    const anchorX=anchor?.x??diagram.clientWidth/2;
    const anchorY=anchor?.y??diagram.clientHeight/2;
    const centerX=(diagram.scrollLeft+anchorX)/(oldPlot?.offsetWidth||1);
    const centerY=(diagram.scrollTop+anchorY)/(oldPlot?.offsetHeight||1);
    diagram.replaceChildren();
    mapProjection=null;
    trainMarker=null;
    refreshRailTracker();
    const locations=train?.calls.map(([key])=>geography.get(key))||[];
    const routeCoordinates=locations.filter(Boolean);
    const known=showNetwork?[...networkColors.keys()].map(key=>geography.get(key)):routeCoordinates;
    mapControls[2].disabled=routeCoordinates.length<2;
    if (known.length<2) return;
    overlayIn.disabled=mapControls[0].disabled=mapScale>=maxMapScale;
    overlayOut.disabled=mapControls[1].disabled=mapScale<=1;
    const width=diagram.clientWidth*mapScale,height=diagram.clientHeight*mapScale;
    const minX=Math.min(...known.map(p=>p[0])),maxX=Math.max(...known.map(p=>p[0]));
    const minY=Math.min(...known.map(p=>p[1])),maxY=Math.max(...known.map(p=>p[1]));
    const lonScale=Math.cos((minY+maxY)*Math.PI/360);
    const pad=40*mapScale;
    const scale=Math.min((width-pad*2)/Math.max((maxX-minX)*lonScale,.007),(height-pad*2)/Math.max(maxY-minY,.007));
    const project=([x,y])=>[width/2+(x-(minX+maxX)/2)*lonScale*scale,height/2-(y-(minY+maxY)/2)*scale];
    const plot=document.createElement('div');
    plot.className='rail-geo';
    plot.style.width=width+'px';
    plot.style.height=height+'px';
    const canvas=document.createElement('canvas');
    const dpr=Math.min(window.devicePixelRatio||1,2,Math.sqrt(12000000/(width*height)),4096/Math.max(width,height));
    canvas.width=Math.round(width*dpr);
    canvas.height=Math.round(height*dpr);
    canvas.style.width='100%';
    canvas.style.height='100%';
    canvas.setAttribute('aria-hidden','true');
    plot.append(canvas);
    const ctx=canvas.getContext('2d');
    ctx.scale(dpr,dpr);
    ctx.lineCap='round';
    const line=(start,end,color,size,dashed=false)=>{
      const [x1,y1]=project(start),[x2,y2]=project(end);
      ctx.beginPath();
      ctx.setLineDash(dashed?[5,5]:[]);
      ctx.moveTo(x1,y1);
      ctx.lineTo(x2,y2);
      ctx.strokeStyle=color;
      ctx.lineWidth=size;
      ctx.stroke();
    };
    for (const coast of globalThis.RAIL_COAST||[]) {
      for (let i=1;i<coast.length;i++) line(coast[i-1],coast[i],'#639abf',1.5);
    }
    for (const {paths,color} of corridors) for (const keys of paths) {
      let previous=null,missing=false;
      for (const key of keys) {
        const coords=geography.get(key);
        if (!coords) {missing=true;continue;}
        if (previous) line(previous,coords,color,3,missing);
        previous=coords;
        missing=false;
      }
    }
    let previous=null,gap=false;
    for (const coords of locations) {
      if (!coords) {gap=true;continue;}
      if (previous) {
        line(previous,coords,'#171726',8,gap);
        line(previous,coords,'#fff2dc',4,gap);
      }
      previous=coords;
      gap=false;
    }
    const dots=document.createElement('ol');
    dots.className='geo-stations';
    const visibleKeys=showNetwork?[...networkColors.keys()]:train.calls.map(([key])=>key);
    const markers=[...new Set(visibleKeys)].flatMap(key=>{
      if (!geography.has(key)) return [];
      const index=train?.calls.findIndex(([stop])=>stop===key)??-1;
      const point=project(geography.get(key));
      const label=showAllStationNames||!showNetwork||overviewLabels.has(key)||mapScale>=2&&index>=0||key===selectedRailStation;
      return [{key,index,point,station:name(key),label}];
    }).sort((a,b)=>Number(b.key===selectedRailStation)-Number(a.key===selectedRailStation)||
      Number(overviewLabels.has(b.key))-Number(overviewLabels.has(a.key))||
      Number(b.index>=0)-Number(a.index>=0));
    const used=[];
    const labelFont=mapScale>=6?16:mapScale>=3?14:11;
    const labelLineHeight=labelFont+4;
    ctx.font='700 '+labelFont+'px "Segoe UI", sans-serif';
    plot.style.setProperty('--station-label-font',labelFont+'px');
    plot.style.setProperty('--station-label-line',labelLineHeight+'px');
    const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*
      Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    function placeLabel(station,x,y) {
      const textWidth=ctx.measureText(station).width;
      const w=Math.min(mapScale>=3?172:126,Math.max(42,Math.ceil(textWidth)+12));
      const h=Math.ceil(textWidth/(w-12))*labelLineHeight+10;
      for (const distance of [12,22,34,48,62]) {
        for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]]) {
          const offsetX=dx<0?-w:dx===0?-w/2:0;
          const offsetY=dy<0?-h:dy===0?-h/2:0;
          const box={x:Math.max(3,Math.min(width-w-3,x+dx*distance+offsetX)),
            y:Math.max(3,Math.min(height-h-3,y+dy*distance+offsetY)),w,h};
          const padded={x:box.x-5,y:box.y-5,w:box.w+10,h:box.h+10};
          if (used.some(other=>overlap(padded,other))) continue;
          if (markers.some(({point:[px,py]})=>overlap(padded,{x:px-5,y:py-5,w:10,h:10}))) continue;
          return box;
        }
      }
      return null;
    }
    for (const {key,index,point:[x,y],station,label:showLabel} of markers) {
      const box=showLabel?placeLabel(station,x,y):null;
      if (box) {
        used.push(box);
        const edgeX=Math.max(box.x,Math.min(box.x+box.w,x));
        const edgeY=Math.max(box.y,Math.min(box.y+box.h,y));
        ctx.beginPath();
        ctx.setLineDash([]);
        ctx.moveTo(x,y);
        ctx.lineTo(edgeX,edgeY);
        ctx.strokeStyle='#c6cad499';
        ctx.lineWidth=1;
        ctx.stroke();
      }
      const li=document.createElement('li');
      li.style.left=x+'px';
      li.style.top=y+'px';
      const button=document.createElement('button');
      button.type='button';
      button.dataset.railStation=key;
      button.style.setProperty('--station-color',networkColors.get(key)||'#fff2dc');
      button.setAttribute('aria-label',station);
      button.setAttribute('aria-pressed',String(key===selectedRailStation));
      button.title=station;
      if (box) {
        const label=document.createElement('span');
        label.className='geo-stop-label';
        if (index>=0&&(index===0||index===locations.length-1)) label.classList.add('geo-endpoint');
        label.textContent=station;
        label.setAttribute('aria-hidden','true');
        label.style.left=(box.x-x+6)+'px';
        label.style.top=(box.y-y+6)+'px';
        label.style.width=box.w+'px';
        button.append(label);
      }
      li.append(button);
      dots.append(li);
    }
    plot.append(dots);
    const kilometers=width>600?5:2;
    const scaleMark=document.createElement('span');
    scaleMark.className='geo-scale';
    scaleMark.textContent=kilometers+' km';
    scaleMark.style.width=(kilometers/111.2*scale)+'px';
    if (kilometers/111.2*scale<width*.45) plot.append(scaleMark);
    trainMarker=document.createElement('span');
    trainMarker.className='geo-train-marker';
    trainMarker.setAttribute('aria-hidden','true');
    trainMarker.hidden=true;
    plot.append(trainMarker);
    mapProjection=project;
    diagram.append(plot);
    refreshRailTracker();
    $('rail-zoom-level').value=Math.round(mapScale*100)+'%';
    diagram.scrollLeft=keepCenter?Math.max(0,centerX*width-(anchor?.toX??diagram.clientWidth/2)):0;
    diagram.scrollTop=keepCenter?Math.max(0,centerY*height-(anchor?.toY??diagram.clientHeight/2)):0;
  }
  function railMap(train) {
    mappedTrain=train;
    mapScale=1;
    showNetwork=true;
    selectedRailStation='';
    $('rail-station-info').textContent='';
    renderRailMap();
  }
  $('rail-diagram').onclick=event=>{
    const button=event.target.closest('[data-rail-station]');
    if (!button) return;
    selectedRailStation=button.dataset.railStation;
    for (const station of $('rail-diagram').querySelectorAll('[data-rail-station]')) {
      station.setAttribute('aria-pressed',String(station===button));
    }
    const call=mappedTrain?.calls.find(([key])=>key===selectedRailStation);
    const timing=call?' · '+stationTiming(...call.slice(1))+' · IST':'';
    $('rail-station-info').textContent=name(selectedRailStation)+' ('+selectedRailStation.slice(2)+')'+timing;
  };
  const metroSlide=$('metro-slide'),suburbanSlide=$('suburban-slide');
  const metroButton=$('rail-slide-metro'),suburbanButton=$('rail-slide-suburban');
  function showMetroSlide(metro) {
    metroSlide.hidden=!metro;
    suburbanSlide.hidden=metro;
    metroButton.setAttribute('aria-pressed',String(metro));
    suburbanButton.setAttribute('aria-pressed',String(!metro));
    if (!metro) requestAnimationFrame(()=>renderRailMap(true));
  }
  function openMetroDeepLink() {
    if (location.hash==='#metro-slide') showMetroSlide(true);
  }
  window.addEventListener('hashchange',openMetroDeepLink);
  openMetroDeepLink();
  metroButton.onclick=()=>showMetroSlide(true);
  suburbanButton.onclick=()=>showMetroSlide(false);
  function openMetroStation(key) {
    const select=document.querySelector('.station-board[data-network="metro"] [data-board-select]');
    if (!key) return;
    select.value=key;
    select.dispatchEvent(new Event('change'));
    location.hash='station-metro-title';
  }
  window.addEventListener('transitlink:metro-station',event=>openMetroStation(event.detail));
  const mapViewport=$('rail-diagram');
  function railPointerPosition(clientX,clientY) {
    const rect=mapViewport.getBoundingClientRect();
    return {x:clientX-rect.left-mapViewport.clientLeft,y:clientY-rect.top-mapViewport.clientTop};
  }
  function zoomMap(scale,anchor) {
    const bounded=Math.max(1,Math.min(maxMapScale,scale));
    if (bounded===mapScale) return;
    mapScale=bounded;
    renderRailMap(true,anchor);
  }
  overlayIn.onclick=$('rail-zoom-in').onclick=()=>zoomMap(mapScale*1.4);
  overlayOut.onclick=$('rail-zoom-out').onclick=()=>zoomMap(mapScale/1.4);
  $('rail-fit').onclick=()=>{showNetwork=false;mapScale=1;renderRailMap();};
  $('rail-fit-network').onclick=()=>{showNetwork=true;mapScale=1;renderRailMap();};
  const stationNamesButton=$('rail-all-stations');
  stationNamesButton.onclick=()=>{
    showAllStationNames=!showAllStationNames;
    stationNamesButton.setAttribute('aria-pressed',String(showAllStationNames));
    stationNamesButton.textContent=showAllStationNames?'Hide extra station names':'Show all station names';
    if (showAllStationNames) {
      const preserveCenter=showNetwork;
      showNetwork=true;
      mapScale=Math.max(mapScale,4);
      renderRailMap(preserveCenter);
    } else renderRailMap(true);
  };
  let viewportWidth=0,viewportHeight=0;
  new ResizeObserver(()=>{
    const {clientWidth,clientHeight}=mapViewport;
    if (!clientWidth||!clientHeight) return;
    if (clientWidth===viewportWidth&&clientHeight===viewportHeight) return;
    const anchor={x:(viewportWidth||clientWidth)/2,y:(viewportHeight||clientHeight)/2};
    viewportWidth=clientWidth;
    viewportHeight=clientHeight;
    renderRailMap(true,anchor);
  }).observe(mapViewport);
  mapViewport.addEventListener('dblclick',event=>{
    if (!event.target.closest('[data-rail-station]')) {
      zoomMap(mapScale*1.4,railPointerPosition(event.clientX,event.clientY));
    }
  });
  mapViewport.addEventListener('wheel',event=>{
    if (!event.ctrlKey&&document.activeElement!==mapViewport) return;
    event.preventDefault();
    const factor=event.deltaMode===1?16:event.deltaMode===2?mapViewport.clientHeight:1;
    const delta=Math.max(-160,Math.min(160,event.deltaY*factor));
    zoomMap(mapScale*Math.exp(-delta/260),railPointerPosition(event.clientX,event.clientY));
  },{passive:false});
  mapViewport.addEventListener('keydown',event=>{
    if (!['+','=','-','−'].includes(event.key)) return;
    event.preventDefault();
    zoomMap(mapScale*((event.key==='-'||event.key==='−')?1/1.4:1.4));
  });
  const pointers=new Map();
  let previousPinch=null,pinchFrame=0,dragging=false,dragStart=null,ignoreMapClickUntil=0;
  function pinchPosition() {
    const [a,b]=pointers.values();
    return {...railPointerPosition((a.x+b.x)/2,(a.y+b.y)/2),distance:Math.hypot(a.x-b.x,a.y-b.y)};
  }
  function applyPinch() {
    pinchFrame=0;
    if (pointers.size!==2||!previousPinch) return;
    const current=pinchPosition(),old=previousPinch;
    if (old.distance>0&&Math.abs(current.distance-old.distance)>=3) {
      const oldScale=mapScale;
      zoomMap(mapScale*current.distance/old.distance,{x:old.x,y:old.y,toX:current.x,toY:current.y});
      if (mapScale===oldScale) {
        mapViewport.scrollLeft+=old.x-current.x;
        mapViewport.scrollTop+=old.y-current.y;
      }
      previousPinch=current;
    } else if (Math.abs(current.x-old.x)+Math.abs(current.y-old.y)>=7) {
      mapViewport.scrollLeft+=old.x-current.x;
      mapViewport.scrollTop+=old.y-current.y;
      previousPinch={...current,distance:old.distance};
    }
  }
  mapViewport.addEventListener('pointerdown',event=>{
    if (!mapViewport.firstElementChild||event.button!==0||pointers.size===2) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (pointers.size===1) {
      ignoreMapClickUntil=0;
      dragStart={x:event.clientX,y:event.clientY,left:mapViewport.scrollLeft,top:mapViewport.scrollTop};
      return;
    }
    dragging=true;
    previousPinch=pinchPosition();
    for(const id of pointers.keys()) mapViewport.setPointerCapture(id);
  });
  mapViewport.addEventListener('pointermove',event=>{
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (pointers.size===2) {
      if (!pinchFrame) pinchFrame=requestAnimationFrame(applyPinch);
      return;
    }
    if (!dragStart) return;
    const dx=event.clientX-dragStart.x,dy=event.clientY-dragStart.y;
    if (!dragging&&Math.hypot(dx,dy)<7) return;
    if (!dragging) {
      dragging=true;
      mapViewport.setPointerCapture(event.pointerId);
      mapViewport.classList.add('is-dragging');
    }
    mapViewport.scrollLeft=dragStart.left-dx;
    mapViewport.scrollTop=dragStart.top-dy;
  });
  function releasePointer(event) {
    if (!pointers.has(event.pointerId)) return;
    if (pinchFrame) {
      cancelAnimationFrame(pinchFrame);
      applyPinch();
    }
    pointers.delete(event.pointerId);
    previousPinch=null;
    if (dragging) ignoreMapClickUntil=performance.now()+350;
    if (!pointers.size) {
      dragging=false;
      dragStart=null;
      mapViewport.classList.remove('is-dragging');
    } else {
      const [remaining]=pointers.values();
      dragStart={...remaining,left:mapViewport.scrollLeft,top:mapViewport.scrollTop};
    }
  }
  for (const type of ['pointerup','pointercancel','lostpointercapture']) window.addEventListener(type,releasePointer);
  mapViewport.addEventListener('click',event=>{
    if (event.detail>0&&performance.now()<ignoreMapClickUntil) event.stopImmediatePropagation();
  },true);
  function directoryDetail(mode) {
    const [,select,detail]=directoryIds[mode].map($);
    const s=select.value===''?null:lists[mode][Number(select.value)];
    if (mode==='rail') railMap(s);
    if (!s) {detail.className='detail';detail.textContent='No matching services.';return;}
    const note=mode==='rail'?([s.trainType,s.stopPattern].filter(Boolean).map(v=>v+' · ').join(''))+'Operating days · '+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].filter((_,i)=>s.mask&(1<<i)).join(', '):
      '';
    const groups=s.times?Object.entries(s.times).map(([day,times])=>'<details><summary>'+esc(day)+'</summary><p class="muted">'+times.map(N.clock).join(' · ')+'</p></details>').join(''):'';
    detail.className='detail '+serviceClass(mode,s);
    const tiers=mode==='bus'?tierBadges(s.tiers.flat()):'';
    const routeHeading='<span class="directory-service-id">'+esc(s.label)+'</span><span>'+esc(endpoint(s,false)+' → '+endpoint(s,true))+'</span>';
    detail.innerHTML='<h4>'+routeHeading+'</h4>'+(tiers?'<div class="bus-tier-list">'+tiers+'</div>':'')+(note?'<p class="muted">'+note+'</p>':'')+groups+
      (mode==='bus'?'<button type="button" data-bus-map>Show on map</button><details><summary>Scheduled departures (IST)</summary><p class="muted">'+
        [...new Set(s.trips.map(trip=>N.clock(trip[1]/60)+(trip[1]>=86400?' +1 day':'')))].join(' · ')+'</p></details>':'')+
      '<details class="column-stops"><summary>View '+s.calls.length+' stops</summary>'+
      diagram(s.calls.map(([k,a,d,km],i)=>[k,mode==='rail'?stationTiming(a,d,km):'']))+'</details>';
    if (mode==='bus') detail.querySelector('[data-bus-map]').onclick=()=>{
      const stops=s.calls.map(([key])=>({name:name(key),coords:N.busLocations.get(key)}));
      const title='Bus '+s.label+' · '+endpoint(s,false)+' → '+endpoint(s,true);
      window.dispatchEvent(new CustomEvent('transitlink:map-journey',{detail:{title,legs:[{mode,stops}]}}));
      location.hash='map';
    };
  }
  function refresh(mode) {
    const [search,select]=directoryIds[mode].map($);
    const q=N.norm(search.value),services=lists[mode];
    const exact=mode==='bus'&&services.some(s=>N.norm(s.label)===q);
    const matched=services.map((s,i)=>[s,i]).filter(([s])=>!q||(exact?N.norm(s.label)===q:
      N.norm([s.label,s.trainType||"",endpoint(s,false),endpoint(s,true),...s.calls.map(([k])=>name(k))].join(' ')).includes(q)));
    select.innerHTML=matched.map(([s,i])=>'<option value="'+i+'">'+esc(s.label+' · '+endpoint(s,false)+' → '+endpoint(s,true))+'</option>').join('');
    if (matched.length) select.selectedIndex=0;
    directoryDetail(mode);
  }
  for (const [mode,[search,select]] of Object.entries(directoryIds)) {
    $(search).oninput=()=>refresh(mode);
    $(select).onchange=()=>directoryDetail(mode);
    refresh(mode);
  }
  let appliedUpdates='',validUntil=0;
  function rerunUpdatedJourney() {
    if (!$('results').hidden&&lastJourneyQuery===journeyQuery()) $('plan').requestSubmit();
  }
  function updateStatus(message) {
    const status=$('service-update-status');
    if (status.textContent!==message) status.textContent=message;
  }
  async function checkServiceUpdates() {
    try {
      const response=await fetch('service-updates.json',{cache:'no-store',signal:AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('Update file unavailable');
      const snapshot=await response.json();
      if (snapshot.status==='unconfigured') {
        if (appliedUpdates) {
          N.clearServiceUpdates();
          appliedUpdates='';
          validUntil=0;
          rerunUpdatedJourney();
        }
        boards.forEach(refresh=>refresh());
        refreshRailTracker();
        updateStatus('Schedule only · no operator update feed connected.');
        return;
      }
      if (!N.loadServiceUpdates(snapshot)) throw new Error('Update file expired');
      validUntil=Date.parse(snapshot.expiresAt);
      const current=JSON.stringify(snapshot.updates);
      if (current!==appliedUpdates) {
        appliedUpdates=current;
        boards.forEach(refresh=>refresh());
        refreshRailTracker();
        rerunUpdatedJourney();
      }
      refreshRailTracker();
      updateStatus('Service updates applied from the configured feed. Unlisted trips use schedule times.');
    } catch {
      if (Date.now()<validUntil) {
        updateStatus('Could not refresh. Showing the latest unexpired service updates.');
        return;
      }
      if (appliedUpdates) {
        N.clearServiceUpdates();
        appliedUpdates='';
        boards.forEach(refresh=>refresh());
        refreshRailTracker();
        rerunUpdatedJourney();
      }
      updateStatus('Schedule only · service updates unavailable.');
    }
  }
  if (['https:','http:'].includes(location.protocol)) {
    checkServiceUpdates();
    setInterval(checkServiceUpdates,60000);
  }

  if (location.protocol==='https:'&&'serviceWorker' in navigator) {
    navigator.serviceWorker.register('offline.js').catch(()=>{});
  }
})();







