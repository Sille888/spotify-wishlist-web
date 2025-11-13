require("dotenv").config();
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const {
  api, loadTokens, saveTokens, getPlaylistItems, searchTracks, addToPlaylist
} = require("./spotify");

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "..", "web")));

const PLAYLIST_ID = process.env.SPOTIFY_PLAYLIST_ID;

// Einmalige Anmeldung starten (nur Admin ruft das auf)
app.get("/auth/login", (req, res) => {
  const scopes = [
    "playlist-modify-public",
    "playlist-modify-private",
    "playlist-read-private",
    "ugc-image-upload"
  ];
  const url = api.createAuthorizeURL(scopes, "state123") + "&show_dialog=true";
  res.redirect(url);
});

// Callback speichert Refresh-Token
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;
  try {
    const data = await api.authorizationCodeGrant(code);
    saveTokens({
      refresh_token: data.body.refresh_token,
      access_token: data.body.access_token,
      expires_in: data.body.expires_in
    });
    res.send("Login ok. Du kannst das Fenster schließen und die Seite nutzen.");
  } catch (e) {
    console.error(e);
    res.status(500).send("Auth Fehler");
  }
});

// API: Playlist-Inhalt
app.get("/api/playlist", async (req, res) => {
  try {
    const items = await getPlaylistItems(PLAYLIST_ID);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Konnte Playlist nicht laden" });
  }
});

// API: Suche
app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").toString().trim();
    if (!q) return res.json([]);
    const items = await searchTracks(q);
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Suche kaputt" });
  }
});

// API: Hinzufügen
app.post("/api/add", async (req, res) => {
  try {
    const { uri } = req.body;
    if (!uri) return res.status(400).json({ error: "uri fehlt" });
    await addToPlaylist(PLAYLIST_ID, uri);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Konnte nicht hinzufügen" });
  }
});

// Fallback: index.html
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "..", "web", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  loadTokens();
  console.log("Server läuft auf http://localhost:" + port);
});
