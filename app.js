
const $=id=>document.getElementById(id);
const KEY="stage-lyrics-v1";
let data=load(), currentSet=data.setlists[0]?.id||null, currentSong=null, editingId=null, editingSetlistId=null, scrollTimer=null, wakeLock=null;
let stageFontScale=Number.isFinite(data.stageFontScale)?Math.min(1.2,Math.max(.65,data.stageFontScale)):.9;
data.stageFontScale=stageFontScale;

function uid(){return Math.random().toString(36).slice(2,10)}

function load(){
  try{
    const d=JSON.parse(localStorage.getItem(KEY));
    if(d?.setlists?.length)return d;
  }catch(e){}
  const id=uid();
  return {setlists:[{id,name:"My setlist",songs:[{id:uid(),title:"Welcome",lyrics:"Welcome to Stage Lyrics\n\nCreate a song and add your lyrics.\n\nYour lyrics are saved on this device."}]}]};
}

function save(){localStorage.setItem(KEY,JSON.stringify(data))}

function updateStageFontSize(){
  const scale=stageFontScale;
  $("stageLyrics").style.fontSize=`clamp(${(27*scale).toFixed(1)}px, ${(4.6*scale).toFixed(2)}vw, ${(64*scale).toFixed(1)}px)`;
  $("stageFontValue").textContent=`${Math.round(scale*100)}%`;
  $("stageFontDown").disabled=scale<=.65;
  $("stageFontUp").disabled=scale>=1.2;
}

function changeStageFontSize(amount){
  stageFontScale=Math.min(1.2,Math.max(.65,Math.round((stageFontScale+amount)*100)/100));
  data.stageFontScale=stageFontScale;
  save();
  updateStageFontSize();
}

$("stageFontDown").onclick=()=>changeStageFontSize(-.05);
$("stageFontUp").onclick=()=>changeStageFontSize(.05);

function setlist(){return data.setlists.find(s=>s.id===currentSet)}
function song(){return setlist()?.songs.find(s=>s.id===currentSong)}

function reorderSong(fromId,toId){
  const s=setlist();
  if(!s||!fromId||!toId||fromId===toId)return;
  const from=s.songs.findIndex(x=>x.id===fromId);
  const to=s.songs.findIndex(x=>x.id===toId);
  if(from<0||to<0)return;
  const [item]=s.songs.splice(from,1);
  s.songs.splice(to,0,item);
  save();
  render();
}

function render(){
  if(!setlist())currentSet=data.setlists[0]?.id||null;
  const s=setlist();
  $("setlists").innerHTML="";
  data.setlists.forEach((x,index)=>{
    const row=document.createElement("div");
    row.className="setlist-row";
    row.dataset.setlistId=x.id;

    const handle=document.createElement("span");
    handle.className="setlist-drag-handle";
    handle.textContent="⠿";
    handle.title="Drag to reorder setlists";
    handle.setAttribute("aria-label",`Drag ${x.name} to reorder`);
    handle.draggable=true;
    handle.addEventListener("dragstart",e=>{
      e.dataTransfer.effectAllowed="move";
      e.dataTransfer.setData("text/plain",x.id);
      row.style.opacity=".45";
    });
    handle.addEventListener("dragend",()=>{row.style.opacity="1"});

    const b=document.createElement("button");
    b.type="button";
    b.className="setlist-item"+(x.id===currentSet?" active":"");
    b.textContent=x.name;
    b.title=x.name;
    b.onclick=()=>{currentSet=x.id;currentSong=x.songs[0]?.id||null;render()};

    const controls=document.createElement("div");
    controls.className="setlist-reorder-controls";
    const up=document.createElement("button");
    up.type="button";
    up.textContent="▲";
    up.title="Move setlist up";
    up.setAttribute("aria-label",`Move ${x.name} up`);
    up.disabled=index===0;
    up.onclick=e=>{e.stopPropagation();if(index>0)reorderSetlist(x.id,data.setlists[index-1].id)};

    const down=document.createElement("button");
    down.type="button";
    down.textContent="▼";
    down.title="Move setlist down";
    down.setAttribute("aria-label",`Move ${x.name} down`);
    down.disabled=index===data.setlists.length-1;
    down.onclick=e=>{e.stopPropagation();if(index<data.setlists.length-1)reorderSetlist(x.id,data.setlists[index+1].id)};

    [up,down].forEach(control=>{
      control.className="setlist-reorder-button";
      control.style.opacity=control.disabled?".3":"1";
      control.style.cursor=control.disabled?"default":"pointer";
    });
    controls.append(up,down);
    row.append(handle,b,controls);
    row.addEventListener("dragover",e=>{e.preventDefault();e.dataTransfer.dropEffect="move"});
    row.addEventListener("drop",e=>{e.preventDefault();reorderSetlist(e.dataTransfer.getData("text/plain"),x.id)});
    $("setlists").append(row);
  });
  $("editSetlist").disabled=!s;
  $("deleteSetlist").disabled=!s;

  $("songs").innerHTML="";
  if(s){
    s.songs.forEach((x,index)=>{
      const row=document.createElement("div");
      row.className="song-row";
      row.style.display="flex";
      row.style.alignItems="center";
      row.style.gap="6px";
      row.style.marginBottom="6px";
      row.draggable=false;
      row.dataset.songId=x.id;
      row.title="Use the handle to drag and reorder";

      const handle=document.createElement("span");
      handle.textContent="⠿";
      handle.title="Drag to reorder";
      handle.setAttribute("aria-label",`Drag ${x.title} to reorder`);
      handle.draggable=true;
      handle.style.cursor="grab";
      handle.style.color="#fff";
      handle.style.fontSize="23px";
      handle.style.fontWeight="800";
      handle.style.padding="0 5px";
      handle.style.userSelect="none";
      handle.addEventListener("dragstart",e=>{
        e.dataTransfer.effectAllowed="move";
        e.dataTransfer.setData("text/plain",x.id);
        row.style.opacity=".45";
      });
      handle.addEventListener("dragend",()=>{row.style.opacity="1"});

      const b=document.createElement("button");
      b.className="song-item"+(x.id===currentSong?" active":"");
      b.textContent=x.title;
      b.style.flex="1";
      b.style.minWidth="0";
      b.onclick=()=>{currentSong=x.id;render()};

      const controls=document.createElement("div");
      controls.style.display="flex";
      controls.style.flexDirection="column";
      controls.style.flex="0 0 18px";
      controls.style.gap="1px";
      controls.style.alignItems="center";

      const up=document.createElement("button");
      up.type="button";
      up.textContent="▲";
      up.title="Move song up";
      up.setAttribute("aria-label",`Move ${x.title} up`);
      up.disabled=index===0;
      up.onclick=e=>{
        e.stopPropagation();
        if(index>0)reorderSong(x.id,s.songs[index-1].id);
      };

      const down=document.createElement("button");
      down.type="button";
      down.textContent="▼";
      down.title="Move song down";
      down.setAttribute("aria-label",`Move ${x.title} down`);
      down.disabled=index===s.songs.length-1;
      down.onclick=e=>{
        e.stopPropagation();
        if(index<s.songs.length-1)reorderSong(x.id,s.songs[index+1].id);
      };

      [up,down].forEach(control=>{
        control.style.minWidth="18px";
        control.style.width="18px";
        control.style.padding="0";
        control.style.height="12px";
        control.style.color="#fff";
        control.style.background="transparent";
        control.style.border="0";
        control.style.fontWeight="800";
        control.style.fontSize="9px";
        control.style.lineHeight="1";
        control.style.cursor=control.disabled?"default":"pointer";
        control.style.opacity=control.disabled?".3":"1";
      });

      controls.append(up,down);
      row.append(handle,b,controls);

      row.addEventListener("dragover",e=>{
        e.preventDefault();
        e.dataTransfer.dropEffect="move";
      });
      row.addEventListener("drop",e=>{
        e.preventDefault();
        reorderSong(e.dataTransfer.getData("text/plain"),x.id);
      });

      $("songs").append(row);
    });
  }else{
    $("songs").innerHTML='<div class="empty">Create a setlist to begin.</div>';
  }

  const current=s?.songs.find(x=>x.id===currentSong);
  if(!current&&s?.songs.length)currentSong=s.songs[0].id;
  const active=s?.songs.find(x=>x.id===currentSong);
  $("currentSetlistName").textContent=s?.name||"NO SETLIST";
  $("songTitle").textContent=active?.title||"No song selected";
  $("lyrics").textContent=active?.lyrics||"Add a song to get started.";
  $("stageSongName").textContent=active?.title||"STAGE LYRICS";
  $("stageLyrics").textContent=active?.lyrics||"Add a song to get started.";
  updateStageNavigation();
  updateStageFontSize();
  const has=!!active;
  $("editSong").disabled=!has;
  $("deleteSong").disabled=!has;
  $("prevSong").disabled=!has;
  $("nextSong").disabled=!has;
}


function updateStageNavigation(){
  const songs=setlist()?.songs||[];
  const index=songs.findIndex(x=>x.id===currentSong);
  const previous=songs.length? songs[(index-1+songs.length)%songs.length]:null;
  const next=songs.length? songs[(index+1)%songs.length]:null;
  const previousTitle=previous?.title||"Previous";
  const nextTitle=next?.title||"Next";
  $("stagePrev").textContent=`← ${previousTitle}`;
  $("stageNext").textContent=`${nextTitle} →`;
  $("stagePrev").title=previous? `Previous song: ${previous.title}` : "Previous song";
  $("stageNext").title=next? `Next song: ${next.title}` : "Next song";
}

function reorderSetlist(fromId,toId){
  if(!fromId||!toId||fromId===toId)return;
  const from=data.setlists.findIndex(x=>x.id===fromId);
  const to=data.setlists.findIndex(x=>x.id===toId);
  if(from<0||to<0)return;
  const [item]=data.setlists.splice(from,1);
  data.setlists.splice(to,0,item);
  save();
  render();
}

function openSetlist(edit=false){
  const existing=edit?setlist():null;
  editingSetlistId=existing?.id||null;
  $("setlistDialogTitle").textContent=edit?"Edit setlist":"New setlist";
  $("setlistName").value=existing?.name||"";
  $("saveSetlist").textContent=edit?"Save changes":"Create";
  $("setlistDialog").showModal();
  $("setlistName").focus();
}

$("addSetlist").onclick=()=>openSetlist(false);
$("editSetlist").onclick=()=>{if(setlist())openSetlist(true)};

$("deleteSetlist").onclick=()=>{
  const selected=setlist();
  if(!selected)return;
  if(data.setlists.length<=1){
    alert("At least one setlist must remain. You can delete individual songs instead.");
    return;
  }
  if(!confirm(`Delete setlist "${selected.name}" and all its songs? This cannot be undone unless you have a backup.`))return;
  const oldIndex=data.setlists.findIndex(x=>x.id===selected.id);
  data.setlists=data.setlists.filter(x=>x.id!==selected.id);
  const next=data.setlists[Math.min(oldIndex,data.setlists.length-1)];
  currentSet=next?.id||null;
  currentSong=next?.songs[0]?.id||null;
  save();
  render();
};

$("saveSetlist").onclick=e=>{
  e.preventDefault();
  const name=$("setlistName").value.trim();
  if(!name)return;
  const existing=data.setlists.find(x=>x.id===editingSetlistId);
  if(existing){
    existing.name=name;
  }else{
    const created={id:uid(),name,songs:[]};
    data.setlists.push(created);
    currentSet=created.id;
    currentSong=null;
  }
  editingSetlistId=null;
  save();
  $("setlistDialog").close();
  render();
};

function openSong(edit=false){
  const x=edit?song():null;
  editingId=x?.id||null;
  $("songDialogTitle").textContent=edit?"Edit song":"Add song";
  $("songName").value=x?.title||"";
  $("songText").value=x?.lyrics||"";
  $("songDialog").showModal();
  $("songName").focus();
}

$("addSong").onclick=()=>{
  if(!setlist()){
    $("setlistName").value="My setlist";
    $("setlistDialog").showModal();
    return;
  }
  openSong();
};

$("editSong").onclick=()=>openSong(true);

$("saveSong").onclick=e=>{
  e.preventDefault();
  const title=$("songName").value.trim();
  if(!title)return;
  const s=setlist();
  if(!s)return;
  let x=s.songs.find(v=>v.id===editingId);
  if(x){
    x.title=title;
    x.lyrics=$("songText").value;
  }else{
    x={id:uid(),title,lyrics:$("songText").value};
    s.songs.push(x);
  }
  currentSong=x.id;
  save();
  $("songDialog").close();
  render();
};

$("deleteSong").onclick=()=>{
  const s=setlist();
  if(!s||!song()||!confirm("Delete this song?"))return;
  s.songs=s.songs.filter(x=>x.id!==currentSong);
  currentSong=s.songs[0]?.id||null;
  save();
  render();
};

function move(dir){
  const s=setlist();
  if(!s?.songs.length)return;
  let i=s.songs.findIndex(x=>x.id===currentSong);
  i=(i+dir+s.songs.length)%s.songs.length;
  currentSong=s.songs[i].id;
  render();
  $("lyrics").scrollTop=0;
  $("stageLyrics").scrollTop=0;
}

$("prevSong").onclick=()=>move(-1);
$("nextSong").onclick=()=>move(1);
$("stagePrev").onclick=()=>move(-1);
$("stageNext").onclick=()=>move(1);

let speed=3;

function stopScroll(){
  if(scrollTimer)clearInterval(scrollTimer);
  scrollTimer=null;
  $("scrollToggle").textContent="Start scrolling";
  $("stageScroll").textContent="Start scrolling";
}

function startScroll(){
  stopScroll();
  scrollTimer=setInterval(()=>{
    const el=$("stageOverlay").hidden?$("lyrics"):$("stageLyrics");
    el.scrollTop+=speed*.45;
  },40);
  $("scrollToggle").textContent="Pause scrolling";
  $("stageScroll").textContent="Pause scrolling";
}

function toggleScroll(){scrollTimer?stopScroll():startScroll()}

$("scrollToggle").onclick=toggleScroll;
$("stageScroll").onclick=toggleScroll;

function setScrollSpeed(value){
  speed=Math.max(1,Math.min(10,Number(value)||1));
  $("scrollSpeed").value=String(speed);
  $("speedValue").textContent=String(speed);
  $("stageScrollSpeed").value=String(speed);
  $("stageSpeedValue").textContent=String(speed);
}

$("scrollSpeed").oninput=e=>setScrollSpeed(e.target.value);
$("stageScrollSpeed").oninput=e=>setScrollSpeed(e.target.value);
setScrollSpeed($("scrollSpeed").value);

async function keepAwake(){
  try{
    if("wakeLock"in navigator)wakeLock=await navigator.wakeLock.request("screen");
  }catch(e){}
}

async function releaseAwake(){
  try{await wakeLock?.release()}catch(e){}
  wakeLock=null;
}

$("stageBtn").onclick=async()=>{
  $("stageOverlay").hidden=false;
  render();
  await keepAwake();
  if(document.documentElement.requestFullscreen){
    try{await document.documentElement.requestFullscreen()}catch(e){}
  }
};

$("exitStage").onclick=async()=>{
  $("stageOverlay").hidden=true;
  stopScroll();
  await releaseAwake();
  if(document.fullscreenElement){
    try{await document.exitFullscreen()}catch(e){}
  }
};

document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible"&&!$("stageOverlay").hidden)keepAwake();
});

let deferredPrompt=null;

window.addEventListener("beforeinstallprompt",e=>{
  e.preventDefault();
  deferredPrompt=e;
  $("installBtn").classList.remove("hidden");
});

$("installBtn").onclick=async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt=null;
  $("installBtn").classList.add("hidden");
};


function downloadBackup(){
  const backup={format:"stage-lyrics-backup",version:1,exportedAt:new Date().toISOString(),data};
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download="stage-lyrics-backup-"+new Date().toISOString().slice(0,10)+".json";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function validBackup(value){
  const d=value?.format==="stage-lyrics-backup"?value.data:value?.data||value;
  return !!d&&Array.isArray(d.setlists)&&d.setlists.every(s=>
    s&&typeof s.id==="string"&&typeof s.name==="string"&&Array.isArray(s.songs)&&s.songs.every(x=>
      x&&typeof x.id==="string"&&typeof x.title==="string"&&typeof x.lyrics==="string"
    )
  )?d:null;
}

$("exportBackup").onclick=downloadBackup;
$("importBackup").onclick=()=>$("backupFile").click();
$("backupFile").onchange=async e=>{
  const file=e.target.files?.[0];
  if(!file)return;
  try{
    const parsed=JSON.parse(await file.text());
    const restored=validBackup(parsed);
    if(!restored)throw new Error("This file is not a valid Stage Lyrics backup.");
    if(!confirm("Restoring this backup will replace the songs and setlists currently stored on this device. Continue?"))return;
    data=restored;
    stageFontScale=Number.isFinite(data.stageFontScale)?Math.min(1.2,Math.max(.65,data.stageFontScale)):.9;
    data.stageFontScale=stageFontScale;
    currentSet=data.setlists[0]?.id||null;
    currentSong=data.setlists[0]?.songs[0]?.id||null;
    save();
    render();
    alert("Backup restored successfully.");
  }catch(err){
    alert(err.message==="This file is not a valid Stage Lyrics backup."?err.message:"Could not read this backup file.");
  }finally{
    e.target.value="";
  }
};

if("serviceWorker"in navigator){
  window.addEventListener("load",async()=>{
    const hadController=!!navigator.serviceWorker.controller;
    if(hadController){
      navigator.serviceWorker.addEventListener("controllerchange",()=>window.location.reload(),{once:true});
    }
    try{
      const registration=await navigator.serviceWorker.register("./sw.js",{updateViaCache:"none"});
      registration.update().catch(()=>{});
    }catch(e){}
  });
}

render();
