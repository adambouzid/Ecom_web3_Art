import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/pastoria";

let isConnected = false;

export async function connectDB() {
    if (isConnected) {
        console.log("MongoDB already connected");
        return;
    }

    try {
        await mongoose.connect(MONGODB_URI);
        isConnected = true;
        console.log("MongoDB connected successfully to:", MONGODB_URI);
    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        // Don't crash the server, just log the error
        // Images will fall back to local storage
    }
}

// Image Schema - stores image data
const imageSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    data: { type: Buffer, required: true }, // Store image as binary
    createdAt: { type: Date, default: Date.now },
});

export const Image = mongoose.model("Image", imageSchema);

// Product Image Reference Schema (lightweight reference for product catalog)
const productImageSchema = new mongoose.Schema({
    productId: { type: Number, required: true, unique: true },
    imageId: { type: mongoose.Schema.Types.ObjectId, ref: "Image" },
    title: { type: String },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

export const ProductImage = mongoose.model("ProductImage", productImageSchema);

export default mongoose;
