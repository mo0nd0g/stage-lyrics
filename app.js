
const $=id=>document.getElementById(id);
const KEY="stage-lyrics-v1";
let data=load(), currentSet=data.setlists[0]?.id||null, currentSong=null, editingId=null, scrollTimer=null, wakeLock=null;

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
  data.setlists.forEach(x=>{
    const b=document.createElement("button");
    b.className="setlist-item"+(x.id===currentSet?" active":"");
    b.innerHTML=`<span></span><span class="rename" title="Rename setlist">Rename</span>`;
    b.firstChild.textContent=x.name;
    b.onclick=()=>{currentSet=x.id;currentSong=x.songs[0]?.id||null;render()};
    b.querySelector(".rename").onclick=e=>{
      e.stopPropagation();
      const n=prompt("Rename setlist",x.name);
      if(n?.trim()){x.name=n.trim();save();render()}
    };
    $("setlists").append(b);
  });

  $("songs").innerHTML="";
  if(s){
    s.songs.forEach((x,index)=>{
      const row=document.createElement("div");
      row.className="song-row";
      row.style.display="flex";
      row.style.alignItems="center";
      row.style.gap="6px";
      row.style.marginBottom="6px";
      row.draggable=true;
      row.dataset.songId=x.id;
      row.title="Drag to reorder";

      const b=document.createElement("button");
      b.className="song-item"+(x.id===currentSong?" active":"");
      b.textContent=x.title;
      b.style.flex="1";
      b.style.minWidth="0";
      b.onclick=()=>{currentSong=x.id;render()};

      const controls=document.createElement("div");
      controls.style.display="flex";
      controls.style.flex="0 0 auto";
      controls.style.gap="3px";

      const up=document.createElement("button");
      up.type="button";
      up.textContent="↑";
      up.title="Move song up";
      up.setAttribute("aria-label",`Move ${x.title} up`);
      up.disabled=index===0;
      up.onclick=e=>{
        e.stopPropagation();
        if(index>0)reorderSong(x.id,s.songs[index-1].id);
      };

      const down=document.createElement("button");
      down.type="button";
      down.textContent="↓";
      down.title="Move song down";
      down.setAttribute("aria-label",`Move ${x.title} down`);
      down.disabled=index===s.songs.length-1;
      down.onclick=e=>{
        e.stopPropagation();
        if(index<s.songs.length-1)reorderSong(x.id,s.songs[index+1].id);
      };

      [up,down].forEach(control=>{
        control.style.minWidth="32px";
        control.style.padding="6px";
        control.style.cursor=control.disabled?"default":"pointer";
      });

      controls.append(up,down);
      row.append(b,controls);

      row.addEventListener("dragstart",e=>{
        row.style.opacity=".45";
        e.dataTransfer.effectAllowed="move";
        e.dataTransfer.setData("text/plain",x.id);
      });
      row.addEventListener("dragend",()=>{row.style.opacity="1"});
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
  const has=!!active;
  $("editSong").disabled=!has;
  $("deleteSong").disabled=!has;
  $("prevSong").disabled=!has;
  $("nextSong").disabled=!has;
}

$("addSetlist").onclick=()=>{
  $("setlistName").value="";
  $("setlistDialog").showModal();
  $("setlistName").focus();
};

$("saveSetlist").onclick=e=>{
  e.preventDefault();
  const name=$("setlistName").value.trim();
  if(!name)return;
  const s={id:uid(),name,songs:[]};
  data.setlists.push(s);
  currentSet=s.id;
  currentSong=null;
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

$("scrollSpeed").oninput=e=>{
  $("speedValue").textContent=e.target.value;
  speed=+e.target.value;
  if(scrollTimer)startScroll();
};

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

if("serviceWorker"in navigator){
  window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}

render();
