import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { UPLOAD_DIR } from "./middleware/upload.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "8mb" }));
app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/api", routes);

export default app;
