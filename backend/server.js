import express from "express";
import cors from "cors";
import multer from "multer";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const storageRoot = path.join(__dirname, "uploads");
const imageDir = path.join(storageRoot, "images");
const metadataDir = path.join(storageRoot, "metadata");

const ensureDir = (dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
};

ensureDir(imageDir);
ensureDir(metadataDir);

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(storageRoot));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imageDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Missing file" });
  }
  const url = `${BASE_URL}/uploads/images/${req.file.filename}`;
  res.json({ url });
});

app.post("/metadata", (req, res) => {
  const { name, description, image, extra } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: "name and description required" });
  }
  const payload = {
    name,
    description,
    createdAt: Date.now(),
  };
  if (image) {
    payload.image = image;
  }
  if (extra && typeof extra === "object") {
    payload.extra = extra;
  }
  const filename = `${uuidv4()}.json`;
  writeFileSync(path.join(metadataDir, filename), JSON.stringify(payload, null, 2), "utf-8");
  const uri = `${BASE_URL}/uploads/metadata/${filename}`;
  res.json({ uri, payload });
});

app.listen(PORT, () => {
  console.log(`Metadata micro-backend running on ${BASE_URL}`);
});
