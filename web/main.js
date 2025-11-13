const qs = s => document.querySelector(s);
const tpl = id => document.getElementById(id).content.firstElementChild.cloneNode(true);

async function fetchJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("HTTP "+res.status);
  return res.json();
}

function renderItem(track, withAdd){
  const el = tpl("item-tpl");
  el.querySelector(".cover").src = track.image || "";
  el.querySelector(".name").textContent = track.name;
  el.querySelector(".artist").textContent = track.artists;
  const btn = el.querySelector(".add");
  if(withAdd){
    btn.onclick = async () => {
      btn.disabled = true; btn.textContent = "Wird hinzugefügt…";
      try{
        const res = await fetch("/api/add", {
          method:"POST",
          headers:{ "Content-Type":"application/json" },
          body: JSON.stringify({ uri: track.uri })
        });
        const ok = res.ok;
        btn.textContent = ok ? "Hinzugefügt!" : "Fehler";
        setTimeout(loadPlaylist, 400);
      }catch(e){ btn.textContent = "Fehler"; }
    };
  } else {
    btn.remove();
  }
  return el;
}

async function loadPlaylist(){
  const list = qs("#playlist");
  list.innerHTML = "Lade…";
  try{
    const items = await fetchJSON("/api/playlist");
    list.innerHTML = "";
    if(items.length === 0){ list.textContent = "Noch keine Wünsche."; return; }
    items.forEach(t => list.appendChild(renderItem(t, false)));
  }catch(e){
    list.textContent = "Konnte Playlist nicht laden.";
  }
}

async function doSearch(){
  const q = qs("#search").value.trim();
  const list = qs("#results");
  list.innerHTML = "";
  if(!q) return;
  list.textContent = "Suche…";
  try{
    const items = await fetchJSON("/api/search?q="+encodeURIComponent(q));
    list.innerHTML = "";
    if(items.length === 0){ list.textContent = "Keine Treffer."; return; }
    items.forEach(t => list.appendChild(renderItem(t, true)));
  }catch(e){
    list.textContent = "Fehler bei der Suche.";
  }
}

qs("#btnSearch").addEventListener("click", doSearch);
qs("#search").addEventListener("keydown", e => { if(e.key === "Enter") doSearch(); });

loadPlaylist();
setInterval(loadPlaylist, 30000); // auto-refresh
