const express = require('express');
const path = require('path');

const app = express();

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


app.get("/stego", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "stego.html"));
});
app.get("/video-stego", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "video-stego.html"));
});

const cryptoRoutes = require("./routes/crypto.routes");
app.use("/api", cryptoRoutes);

app.use("/api/stego", require("./routes/stego.routes"));
app.use("/api/video-stego", require("./routes/video-stego.routes"));

app.get("/split-crypto", (req, res) =>
  res.sendFile(path.join(__dirname, "views/split-crypto.html"))
);

app.use("/api/split-crypto", require("./routes/split-crypto.routes"));



app.listen(3000, () => {
  console.log('✅ Server running on http://localhost:3000');
});
