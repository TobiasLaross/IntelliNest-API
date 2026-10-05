import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { liveActivityRoutes, notifyRoutes } from "./api/routes";

const port = 3000 || process.env.PORT;

const app = express();

app.use(express.json());
app.use(notifyRoutes);
app.use(liveActivityRoutes);

app.listen(port, () => {
    console.log(`Server listening at http://127.0.0.1:${port}`);
});
