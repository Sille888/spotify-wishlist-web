const qs = s => document.querySelector(s);
const tpl = id => document.getElementById(id).content.firstElementChild.cloneNode(true);

async function fetchJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error("HTTP "+res.status);
  return res.json();
}

let debounceTimer = null;

function debounce(fn, delay) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(fn, delay);
}

function renderItem(track, withAdd){
  const el = tpl("item-tpl");
  el.querySelector(".cover").src = track.image || "";
  el.querySelector(".name").textContent = track.name;
  el.querySelector(".artist").textContent = track.artists;
  const btn = el.querySelector(".add");
  if(withAdd){
    btn.onclick = async () => {
      const icon = btn.querySelector(".add-icon");

      // Loading-Icon
      icon.src = "/icons/wait.png";
      btn.disabled = true;

      try {
        const res = await fetch("/api/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uri: track.uri })
        });

        if (res.ok) {
          icon.src = "/icons/success.png";
        } else {
          icon.src = "/icons/error.png";
        }

        // Playlist reloaden
        setTimeout(loadPlaylist, 400);

      } catch (e) {
        icon.src = "/icons/error.png";
      }
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

qs("#search").addEventListener("input", () => {
  const val = qs("#search").value.trim();

  // Leere Suche = Suchfeld resetten
  if (!val) {
    qs("#results").innerHTML = "";
    return;
  }

  debounce(() => {
    doSearch();
  }, 250); // 250ms ist schnell + effizient
});

qs("#search").addEventListener("keydown", e => {
  if (e.key === "Enter") doSearch();
});

loadPlaylist();
setInterval(loadPlaylist, 30000); // auto-refresh

async function loadNowPlaying() {
  const box = qs("#nowPlaying");

  try {
    const data = await fetchJSON("/api/nowplaying");

    // Wenn kein Song → Box verstecken
    if (!data.playing) {
      box.style.display = "none";
      return;
    }

    // Song aktiv → Box anzeigen
    box.style.display = "flex";

    // Inhalte setzen
    box.querySelector(".cover").src = data.image;
    box.querySelector(".name").textContent = data.name;
    box.querySelector(".artist").textContent = data.artists;

    const progress = (data.progress_ms / data.duration_ms) * 100;
    box.querySelector(".progress").style.width = progress + "%";

  } catch (e) {
    // Bei Fehler lieber auch verstecken
    box.style.display = "none";
  }
}

loadNowPlaying();
setInterval(loadNowPlaying, 3000);