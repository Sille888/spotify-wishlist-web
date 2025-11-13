const fs = require("fs");
const path = require("path");
const SpotifyWebApi = require("spotify-web-api-node");

const tokensPath = path.join(__dirname, "tokens.json");

const api = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.SPOTIFY_REDIRECT_URI,
});

function loadTokens() {
  if (fs.existsSync(tokensPath)) {
    const { refresh_token, access_token, expires_at } = JSON.parse(fs.readFileSync(tokensPath, "utf8"));
    if (refresh_token) api.setRefreshToken(refresh_token);
    if (access_token) api.setAccessToken(access_token);
    return { refresh_token, access_token, expires_at };
  }
  return {};
}

function saveTokens({ refresh_token, access_token, expires_in }) {
  const data = {
    refresh_token: refresh_token || (fs.existsSync(tokensPath) ? JSON.parse(fs.readFileSync(tokensPath, "utf8")).refresh_token : null),
    access_token,
    expires_at: Date.now() + (expires_in * 1000 - 10_000),
  };
  fs.writeFileSync(tokensPath, JSON.stringify(data, null, 2), "utf8");
  if (data.refresh_token) api.setRefreshToken(data.refresh_token);
  if (data.access_token) api.setAccessToken(data.access_token);
}

async function ensureAccess() {
  const { expires_at } = loadTokens();
  if (!expires_at || Date.now() > expires_at) {
    const res = await api.refreshAccessToken();
    saveTokens({
      access_token: res.body.access_token,
      expires_in: res.body.expires_in
    });
  }
}

async function getPlaylistItems(playlistId) {
  await ensureAccess();
  const items = [];
  let next = null, offset = 0;
  do {
    const res = await api.getPlaylistTracks(playlistId, { limit: 100, offset });
    res.body.items.forEach(it => {
      items.push({
        id: it.track.id,
        uri: it.track.uri,
        name: it.track.name,
        artists: it.track.artists.map(a => a.name).join(", "),
        album: it.track.album.name,
        image: it.track.album.images?.[1]?.url || it.track.album.images?.[0]?.url || null,
      });
    });
    offset += res.body.items.length;
    next = res.body.next;
  } while (next);
  return items;
}

async function searchTracks(q) {
  await ensureAccess();
  const res = await api.searchTracks(q, { limit: 10 });
  return res.body.tracks.items.map(t => ({
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: t.artists.map(a => a.name).join(", "),
    album: t.album.name,
    image: t.album.images?.[2]?.url || t.album.images?.[0]?.url || null,
  }));
}

async function addToPlaylist(playlistId, uris) {
  await ensureAccess();
  await api.addTracksToPlaylist(playlistId, Array.isArray(uris) ? uris : [uris]);
}

module.exports = {
  api,
  loadTokens,
  saveTokens,
  ensureAccess,
  getPlaylistItems,
  searchTracks,
  addToPlaylist
};