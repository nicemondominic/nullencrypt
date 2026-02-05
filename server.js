const express = require('express');
const path = require('path');

const app = express();

const PORT = 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Server running on port 3000");
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

/* MAIN PAGES */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

/* 🔐 ENCRYPTION PAGES */
app.get('/text', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/text.html'));
});

app.get('/image', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/image.html'));
});

/* OTHER PAGES */
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/login.html'));
});

app.get('/about', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/about.html'));
});

app.get("/audio-stego", (req, res) => {
  res.sendFile(path.join(__dirname, 'views/audio-stego.html'));
});

app.get("/stego", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "stego.html"));
});

app.get("/video-stego", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "video-stego.html"));
});

app.get("/split-crypto", (req, res) =>
  res.sendFile(path.join(__dirname, "views/split-crypto.html"))
);

const cryptoRoutes = require("./routes/crypto.routes");
app.use("/api", cryptoRoutes);

app.use("/api/stego", require("./routes/stego.routes"));

app.use("/api/video-stego", require("./routes/video-stego.routes"));

app.use("/api/audio-stego", require("./routes/audio-stego.routes"));

app.use("/api/split-crypto", require("./routes/split-crypto.routes"));

app.use("/api", require("./routes/crypto-image.routes"));



