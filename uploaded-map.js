(() => {
  'use strict';
  function initializeMap(prefix,metro=null) {
  const data=globalThis.UPLOADED_MAP;
  const canvas=document.getElementById(prefix+'-map');
  const output=document.getElementById(prefix+'-map-status');
  if (!data) {output.textContent='Map data could not be loaded.';return;}
  const ctx=canvas.getContext('2d');
  const metroColors={'Blue Line':'#7cb9ff','Green Line':'#80e3a5','Yellow Line':'#ffda71','Inter-corridor':'#dda8ff'};
  const metroPaths=metro?Object.entries(metro.lines):[];
  const metroCoords=metroPaths.flatMap(([,paths])=>paths.flat());
  const boundary=metroCoords.length?[
    Math.min(...metroCoords.map(p=>p[0]))-.012,Math.min(...metroCoords.map(p=>p[1]))-.012,
    Math.max(...metroCoords.map(p=>p[0]))+.012,Math.max(...metroCoords.map(p=>p[1]))+.012,
  ]:data.bounds;
  const [west,south,east,north]=boundary;
  const aspect=Math.cos((south+north)*Math.PI/360);
  const projection=([lon,lat])=>[(lon-(west+east)/2)*aspect,(south+north)/2-lat];
  const styles={road:['#344c5e',.7],major:['#c3a876',1.35],water:['#659ab5',1.2],coast:['#75b6d1',1.5],rail:['#65e1b4',1.45]};
  const layers=Object.fromEntries(Object.keys(styles).map(key=>[key,[]]));
  for (const [kind,coords] of data.ways) {
    if (metro&&(kind==='rail'||!coords.some(([lng,lat])=>lng>=west&&lng<=east&&lat>=south&&lat<=north))) continue;
    const points=coords.map(projection);
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    for(const [x,y] of points) {left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    layers[kind].push({points,left,right,top,bottom});
  }
  const normalize=value=>value.normalize('NFC').toLocaleLowerCase().replace(/[^\p{L}\p{M}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
  const placeZoom={city:1,town:1,suburb:2,village:2,hamlet:2,station:4,neighbourhood:4,quarter:4,road:24};
  const labels=data.places.map(([lon,lat,name,type,alternate])=>({
    xy:projection([lon,lat]),name,type,search:normalize([name,alternate,type].filter(Boolean).join(' ')),lng:lon,lat,minimum:placeZoom[type]??14,
  }));
  let selectedPlace=null;
  const metroStations=metro?[...Network.names.values()].filter(place=>place.mode==='metro').flatMap(place=>{
    const token=Network.placeToken(place.name);
    const aliases={WASHERMENPET:'WASHERMANPET',NEWWASHERMENPET:'NEWWASHERMANPET'};
    const coords=metro.stations[aliases[token]||token];
    return coords?[{...place,xy:projection(coords)}]:[];
  }):[];
  const metroLines=metroPaths.map(([name,paths])=>[name,paths.map(path=>path.map(projection))]);
  let metroHits=[];
  if (metro) {
    document.getElementById('metro-line-map').innerHTML=metroLines.map(([line])=>
      '<span style="--metro-map-color:'+metroColors[line]+'">'+line+'</span>').join('');
  }
  let width=0,height=0,ratio=1,zoom=1,panX=0,panY=0,frame=0,journey=[],fitted=true;
  const maxZoom=128;
  const fullScale=()=>Math.min((width-20)/((east-west)*aspect),(height-20)/(north-south));
  function paint() {
    frame=0;
    if (!width||!height) return;
    ctx.setTransform(ratio,0,0,ratio,0,0);
    ctx.clearRect(0,0,width,height);
    const scale=zoom*fullScale(),cx=width/2+panX,cy=height/2+panY;
    const left=-cx/scale,right=(width-cx)/scale,top=-cy/scale,bottom=(height-cy)/scale;
    const point=([x,y])=>[x*scale+cx,y*scale+cy];
    for(const [kind,[color,size]] of Object.entries(styles)) {
      if (kind==='road'&&zoom<1.8) continue;
      ctx.beginPath();
      for(const way of layers[kind]) {
        if(way.right<left||way.left>right||way.bottom<top||way.top>bottom) continue;
        way.points.forEach((xy,i)=>{
          const [x,y]=point(xy);
          if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
        });
      }
      ctx.lineWidth=size;
      ctx.strokeStyle=color;
      ctx.lineJoin='round';
      ctx.stroke();
    }
    const journeyColor='#ff303e';
    for (const leg of journey) {
      ctx.beginPath();
      let started=false;
      for (const stop of leg.stops) {
        if (!stop.xy) {started=false;continue;}
        const [x,y]=point(stop.xy);
        if (started) ctx.lineTo(x,y); else ctx.moveTo(x,y);
        started=true;
      }
      ctx.setLineDash([10,6]);
      ctx.lineCap='round';
      ctx.lineWidth=10;
      ctx.strokeStyle='#fff0ea';
      ctx.stroke();
      ctx.lineWidth=6;
      ctx.strokeStyle=journeyColor;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle=journeyColor;
      for (const stop of leg.stops) {
        if (!stop.xy) continue;
        const [x,y]=point(stop.xy);
        ctx.beginPath();
        ctx.arc(x,y,Math.min(7,3+Math.log2(zoom)),0,2*Math.PI);
        ctx.lineWidth=2;
        ctx.strokeStyle='#fff0ea';
        ctx.stroke();
        ctx.fill();
      }
    }
    if (metro) {
      for (const [label,paths] of metroLines) {
        ctx.beginPath();
        for (const path of paths) for (const [index,xy] of path.entries()) {
          const [x,y]=point(xy);
          if (index) ctx.lineTo(x,y);
          else ctx.moveTo(x,y);
        }
        ctx.lineJoin='round';
        ctx.setLineDash(label==='Inter-corridor'?[4,7]:[]);
        ctx.strokeStyle=metroColors[label];
        ctx.lineWidth=label==='Inter-corridor'?2:4;
        ctx.stroke();
      }
      ctx.setLineDash([]);
      metroHits=metroStations.map(station=>({...station,point:point(station.xy)}));
      const labeled=[];
      ctx.font='600 11px system-ui, sans-serif';
      ctx.textBaseline='middle';
      for (const {name,point:[x,y]} of metroHits) {
        ctx.beginPath();ctx.arc(x,y,4,0,2*Math.PI);
        ctx.fillStyle='#fff5df';ctx.fill();
        const w=ctx.measureText(name).width+7;
        if (x<3||x+w+8>width||y<8||y>height-8||
            (zoom<1.6&&!/Airport|Central|Alandur|Vadapalani|Wimco Nagar Depot|Poonamallee Bypass|St. Thomas Mount/.test(name))||
            labeled.some(([a,b,c])=>x<a+c&&x+w>a&&Math.abs(y-b)<16)) continue;
        labeled.push([x,y,w]);
        ctx.fillStyle='#182536';ctx.fillRect(x+7,y-7,w,14);
        ctx.fillStyle='#fff5df';ctx.fillText(name,x+10,y);
      }
      return;
    }
    ctx.lineCap='butt';
    const occupied=[];
    ctx.font='600 11px system-ui, sans-serif';
    ctx.textBaseline='middle';
    for(const {xy,name,type,minimum} of labels) {
      if (zoom<minimum||xy[0]<left||xy[0]>right||xy[1]<top||xy[1]>bottom) continue;
      const [x,y]=point(xy),w=ctx.measureText(name).width+9;
      if(x<3||x+w>width||y<8||y>height-8||occupied.some(([a,b,c])=>x<a+c&&x+w>a&&Math.abs(y-b)<15)) continue;
      occupied.push([x,y,w]);
      ctx.fillStyle='#0f2534';
      ctx.fillRect(x-2,y-7,w,15);
      ctx.fillStyle=type==='station'?'#a6f9d8':'#e7f3ff';
      ctx.fillText(name,x+2,y);
    }
    if (selectedPlace) {
      const [x,y]=point(selectedPlace.xy),label=selectedPlace.name;
      if (x>=0&&x<=width&&y>=0&&y<=height) {
        ctx.beginPath();ctx.arc(x,y,7,0,2*Math.PI);
        ctx.fillStyle='#ffd18a';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#fff4d6';ctx.stroke();
        const w=Math.min(width-12,ctx.measureText(label).width+12),left=Math.max(6,Math.min(width-w-6,x-w/2));
        const top=y>34?y-31:y+11;
        ctx.fillStyle='#24192c';ctx.fillRect(left,top,w,20);
        ctx.fillStyle='#fff2d6';ctx.fillText(label,left+6,top+10,w-12);
      }
    }
  }
  function requestDraw() {if(!frame) frame=requestAnimationFrame(paint);}
  const zoomIn=document.getElementById(prefix+'-zoom-in'),zoomOut=document.getElementById(prefix+'-zoom-out');
  function updateControls() {
    zoomIn.disabled=zoom>=maxZoom;
    zoomOut.disabled=zoom<=1;
    output.textContent=Math.round(zoom*100)+'%';
  }
  function resize() {
    const view=canvas.getBoundingClientRect();
    if (!view.width||!view.height) return;
    const previousScale=width&&height?fullScale():0;
    width=view.width;height=view.height;
    ratio=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);
    if (fitted) fitJourney();
    else {
      const factor=previousScale?fullScale()/previousScale:1;
      panX*=factor;panY*=factor;
      requestDraw();
    }
  }
  new ResizeObserver(resize).observe(canvas);
  function scaleTo(value,fromX=width/2,fromY=height/2,toX=fromX,toY=fromY) {
    const next=Math.max(1,Math.min(maxZoom,value)),factor=next/zoom;
    fitted=false;
    panX=toX-width/2-(fromX-width/2-panX)*factor;
    panY=toY-height/2-(fromY-height/2-panY)*factor;
    zoom=next;
    updateControls();
    requestDraw();
  }
  zoomIn.onclick=()=>scaleTo(zoom*1.5);
  zoomOut.onclick=()=>scaleTo(zoom/1.5);
  function fitJourney() {
    fitted=true;
    if (!width||!height||!canvas.getBoundingClientRect().width) return;
    const points=journey.flatMap(leg=>leg.stops.flatMap(stop=>stop.xy?[stop.xy]:[]));
    zoom=1;panX=0;panY=0;
    if (points.length) {
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      const lowX=Math.min(...xs),highX=Math.max(...xs),lowY=Math.min(...ys),highY=Math.max(...ys);
      const scale=Math.min(Math.max(width-60,100)/Math.max(highX-lowX,.008),Math.max(height-60,100)/Math.max(highY-lowY,.008));
      zoom=Math.max(1,Math.min(maxZoom,scale/fullScale()));
      panX=-(lowX+highX)/2*zoom*fullScale();
      panY=-(lowY+highY)/2*zoom*fullScale();
    }
    updateControls();
    requestDraw();
  }
  document.getElementById(prefix+'-map-fit').onclick=fitJourney;
  const dialog=metro?null:document.getElementById('uploaded-map-dialog');
  if (!metro) {
    const placeInput=document.getElementById('map-place-input');
    const placeMatches=document.getElementById('map-place-matches');
    const placeStatus=document.getElementById('map-place-status');
    function focusPlace(place) {
      selectedPlace=place;
      fitted=false;
      zoom=Math.max(zoom,['city','town'].includes(place.type)?5:16);
      panX=-place.xy[0]*zoom*fullScale();
      panY=-place.xy[1]*zoom*fullScale();
      placeInput.value=place.name;
      placeMatches.replaceChildren();
      placeMatches.hidden=true;
      placeStatus.textContent='Showing '+place.name+' on the map.';
      updateControls();requestDraw();
      canvas.focus({preventScroll:true});
    }
    placeInput.addEventListener('input',()=>{
      const query=normalize(placeInput.value),terms=query.split(' ').filter(Boolean);
      placeMatches.replaceChildren();
      placeMatches.hidden=true;
      placeStatus.textContent='';
      if (query.length<2) return;
      const matches=labels.filter(place=>terms.every(term=>place.search.includes(term)))
        .map(place=>({place,score:normalize(place.name)===query?0:normalize(place.name).startsWith(query)?1:2}))
        .sort((a,b)=>a.score-b.score||a.place.name.length-b.place.name.length).slice(0,12);
      for (const {place} of matches) {
        const row=document.createElement('li'),button=document.createElement('button'),detail=document.createElement('small');
        button.type='button';
        button.textContent=place.name;
        detail.textContent=place.type+' · '+place.lat.toFixed(4)+', '+place.lng.toFixed(4);
        button.append(detail);
        button.onclick=()=>focusPlace(place);
        row.append(button);
        placeMatches.append(row);
      }
      placeMatches.hidden=!matches.length;
      if (!matches.length) placeStatus.textContent='No named places in this map export match your search.';
    });
  const stage=document.getElementById('uploaded-map-stage');
  const expand=document.getElementById('uploaded-map-expand');
  const home=stage.parentElement;
  expand.onclick=()=>{
    if (dialog.open) {dialog.close();return;}
    dialog.append(stage);
    dialog.showModal();
    expand.textContent='Close expanded map';
    expand.focus();
    resize();
  };
  dialog.addEventListener('close',()=>{
    home.insertBefore(stage,dialog);
    expand.textContent='Expand map';
    expand.focus();
    resize();
  });
  const summary=document.getElementById('journey-map-summary');
  window.addEventListener('transitlink:map-journey',event=>{
    const {title,legs}=event.detail;
    journey=legs.map(leg=>({...leg,stops:leg.stops.map(stop=>({xy:stop.coords?projection(stop.coords):null}))}));
    const points=journey.flatMap(leg=>leg.stops);
    const available=points.filter(stop=>stop.xy).length;
    summary.hidden=false;
    document.getElementById('journey-map-title').textContent=title;
    document.getElementById('journey-map-note').textContent=available?
      available+' of '+points.length+' stop entries mapped. Dashes connect known points and do not trace the exact route.':
      'Location data is unavailable for the stops in this journey.';
    fitJourney();
  });
  document.getElementById('clear-journey-map').onclick=()=>{
    journey=[];
    summary.hidden=true;
    fitJourney();
    document.getElementById('uploaded-map-fit').focus();
  };
  }
  const pointers=new Map();
  let tap=null,lastTouch=-Infinity,blockStationTapUntil=0;
  const local=e=>{
    const rect=canvas.getBoundingClientRect();
    return {x:e.clientX-rect.left,y:e.clientY-rect.top};
  };
  const pair=()=>{
    const [a,b]=pointers.values();
    return [(a.x+b.x)/2,(a.y+b.y)/2,Math.hypot(a.x-b.x,a.y-b.y)];
  };
  canvas.onpointerdown=e=>{
    if(e.button!==0||pointers.size===2)return;
    const point=local(e);
    pointers.set(e.pointerId,{...point,start:point,moved:pointers.size>0});
    if (pointers.size===2) {
      tap=null;
      for (const pointer of pointers.values()) pointer.moved=true;
    }
    canvas.setPointerCapture(e.pointerId);
  };
  canvas.onpointermove=e=>{
    const old=pointers.get(e.pointerId);
    if(!old)return;
    const pinch=pointers.size===2?pair():null;
    const {x,y}=local(e),dx=x-old.x,dy=y-old.y;
    pointers.set(e.pointerId,{...old,x,y,moved:old.moved||Math.hypot(x-old.start.x,y-old.start.y)>10});
    if(pinch) {
      const current=pair();
      if(pinch[2]>0)scaleTo(zoom*current[2]/pinch[2],pinch[0],pinch[1],current[0],current[1]);
    } else if (dx||dy) {fitted=false;panX+=dx;panY+=dy;requestDraw();}
  };
  canvas.addEventListener('pointerup',e=>{
    const pointer=pointers.get(e.pointerId);
    if (metro&&pointer?.moved) blockStationTapUntil=performance.now()+350;
    if (e.pointerType!=='mouse') lastTouch=performance.now();
    if (e.pointerType==='mouse'||!pointer||pointer.moved) {tap=null;return;}
    const {x,y}=local(e),at=performance.now();
    if (tap&&at-tap.at<330&&Math.hypot(x-tap.x,y-tap.y)<36) {
      scaleTo(zoom*1.75,x,y);
      tap=null;
    } else tap={x,y,at};
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(type,e=>pointers.delete(e.pointerId));
  canvas.addEventListener('dblclick',e=>{
    if (e.sourceCapabilities?.firesTouchEvents||performance.now()-lastTouch<500) return;
    const {x,y}=local(e);
    scaleTo(zoom*1.75,x,y);
  });
  canvas.addEventListener('wheel',e=>{
    if (!e.ctrlKey&&document.activeElement!==canvas&&!dialog?.open) return;
    e.preventDefault();
    const {x,y}=local(e),unit=e.deltaMode===1?16:e.deltaMode===2?height:1;
    const delta=Math.max(-160,Math.min(160,e.deltaY*unit));
    scaleTo(zoom*Math.exp(-delta/240),x,y);
  },{passive:false});
  canvas.onkeydown=e=>{
    if (['+','=','-','−'].includes(e.key)) {
      e.preventDefault();
      scaleTo(zoom*((e.key==='-'||e.key==='−')?1/1.5:1.5));
      return;
    }
    const vectors={ArrowUp:[0,40],ArrowDown:[0,-40],ArrowLeft:[40,0],ArrowRight:[-40,0]};
    const delta=vectors[e.key];
    if(!delta) return;
    e.preventDefault();fitted=false;panX+=delta[0];panY+=delta[1];requestDraw();
  };
  if (metro) canvas.addEventListener('click',event=>{
    if (performance.now()<blockStationTapUntil) return;
    const {x,y}=local(event);
    const hits=metroHits.map(station=>[station,Math.hypot(x-station.point[0],y-station.point[1])])
      .sort((a,b)=>a[1]-b[1]);
    if (hits[0]?.[1]<=13) {
      window.dispatchEvent(new CustomEvent('transitlink:metro-station',{detail:hits[0][0].key}));
    }
  });
  updateControls();
  }
  initializeMap('uploaded');
  if (globalThis.METRO_GEOGRAPHY) initializeMap('metro',globalThis.METRO_GEOGRAPHY);
})();


