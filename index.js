import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import chatRouter from "./routes/chat.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/chat", chatRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
