import express from "express";
import cors from "cors";
import multer from "multer";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import mongoose, { connectDB, Image, ProductImage } from "./db.js";

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
// Increased limit to 500MB
app.use(express.json({ limit: "500mb" }));
app.use("/uploads", express.static(storageRoot));

// Multer for memory storage (to save to MongoDB)
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  // Increased limit to 500MB
  limits: { fileSize: 500 * 1024 * 1024 },
});

// Multer for disk storage (fallback)
const uploadDisk = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, imageDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || ".png";
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  // Increased limit to 500MB
  limits: { fileSize: 500 * 1024 * 1024 },
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ============================================
// NEW: Upload image to MongoDB (with Disk fallback)
// ============================================
app.post("/api/images", uploadMemory.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    // FALLBACK: If MongoDB is not connected, save to disk
    if (mongoose.connection.readyState !== 1) {
      console.warn("MongoDB not connected. Falling back to disk storage.");
      const filename = `${uuidv4()}${path.extname(req.file.originalname) || ".png"}`;
      const filepath = path.join(imageDir, filename);
      writeFileSync(filepath, req.file.buffer);

      return res.json({
        id: `local-${filename}`,
        url: `${BASE_URL}/uploads/images/${filename}`,
        filename: filename,
        storage: "disk"
      });
    }

    const image = new Image({
      filename: `${uuidv4()}${path.extname(req.file.originalname) || ".png"}`,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      data: req.file.buffer,
    });

    await image.save();

    res.json({
      id: image._id.toString(),
      url: `${BASE_URL}/api/images/${image._id}`,
      filename: image.filename,
      storage: "mongo"
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// ============================================
// NEW: Get image from MongoDB
// ============================================
app.get("/api/images/:id", async (req, res) => {
  try {
    // Check if it's a local file (fallback)
    if (req.params.id.startsWith("local-")) {
      const filename = req.params.id.replace("local-", "");
      const filepath = path.join(imageDir, filename);
      if (existsSync(filepath)) {
        return res.sendFile(filepath);
      }
      return res.status(404).json({ error: "Local image not found" });
    }

    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }

    res.set("Content-Type", image.mimeType);
    res.set("Cache-Control", "public, max-age=31536000"); // Cache for 1 year
    res.send(image.data);
  } catch (error) {
    console.error("Image retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve image" });
  }
});

// ============================================
// NEW: Create product with image (simplified - no URI needed)
// ============================================
app.post("/api/products", uploadMemory.single("image"), async (req, res) => {
  try {
    const { productId, title, description } = req.body;

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    let imageUrl = null;
    let imageId = null;

    // If image is provided, save it
    if (req.file) {
      // FALLBACK: If MongoDB is not connected, save to disk
      if (mongoose.connection.readyState !== 1) {
        const filename = `${uuidv4()}${path.extname(req.file.originalname) || ".png"}`;
        const filepath = path.join(imageDir, filename);
        writeFileSync(filepath, req.file.buffer);
        imageUrl = `${BASE_URL}/uploads/images/${filename}`;
      } else {
        const image = new Image({
          filename: `${uuidv4()}${path.extname(req.file.originalname) || ".png"}`,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          data: req.file.buffer,
        });
        await image.save();
        imageId = image._id;
        imageUrl = `${BASE_URL}/api/images/${image._id}`;
      }
    }

    // Save or update product image reference
    const productImage = await ProductImage.findOneAndUpdate(
      { productId: parseInt(productId) },
      {
        productId: parseInt(productId),
        imageId,
        title: title || "",
        description: description || "",
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json({
      productId: productImage.productId,
      imageUrl,
      title: productImage.title,
      description: productImage.description,
    });
  } catch (error) {
    console.error("Product creation error:", error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

// ============================================
// NEW: Get product image info
// ============================================
app.get("/api/products/:productId/image", async (req, res) => {
  try {
    const productImage = await ProductImage.findOne({
      productId: parseInt(req.params.productId)
    }).populate("imageId");

    if (!productImage) {
      return res.status(404).json({ error: "Product image not found" });
    }

    res.json({
      productId: productImage.productId,
      imageUrl: productImage.imageId
        ? `${BASE_URL}/api/images/${productImage.imageId._id}`
        : null,
      title: productImage.title,
      description: productImage.description,
    });
  } catch (error) {
    console.error("Product image retrieval error:", error);
    res.status(500).json({ error: "Failed to retrieve product image" });
  }
});

// ============================================
// Legacy endpoints (keep for backwards compatibility)
// ============================================
app.post("/upload", uploadDisk.single("file"), (req, res) => {
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

// ============================================
// Start server
// ============================================
const startServer = async () => {
  // Try to connect to MongoDB (non-blocking)
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Pastoria API running on ${BASE_URL}`);
    console.log(`- Image upload: POST ${BASE_URL}/api/images`);
    console.log(`- Get image: GET ${BASE_URL}/api/images/:id`);
    console.log(`- Product with image: POST ${BASE_URL}/api/products`);
  });
};

startServer();
