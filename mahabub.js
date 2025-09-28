
const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 27916;

const tempDir = path.join(__dirname, "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

app.use("/temp", express.static(tempDir));

app.get("/download", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
   
    const apiUrl = `https://mc-nine-self.vercel.app/api/x?url=${encodeURIComponent(videoUrl)}`;
    const { data } = await axios.get(apiUrl);

    
    const v480 = data.videos.find(v => v.quality.includes("480p"));
    const v720 = data.videos.find(v => v.quality.includes("720p"));

    if (!v480 && !v720) {
      return res.status(404).json({ error: "480p or 720p not available" });
    }

    const downloads = [];

    
    const downloadFile = async (url, quality) => {
      const fileName = `${uuidv4()}_${quality}.mp4`;
      const filePath = path.join(tempDir, fileName);

      const writer = fs.createWriteStream(filePath);
      const response = await axios.get(url, { responseType: "stream" });
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on("finish", () => resolve(`/temp/${fileName}`));
        writer.on("error", reject);
      });
    };

    if (v480) downloads.push(downloadFile(v480.url, "480p"));
    if (v720) downloads.push(downloadFile(v720.url, "720p"));

    const results = await Promise.all(downloads);

    res.json({
      author: data.author,
      title: data.title,
      thumbnail: data.thumbnail,
      links: results.map(link => `${req.protocol}://${req.get("host")}${link}`)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to process video" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
