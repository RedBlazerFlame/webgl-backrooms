// Importing Libraries
import http from "http";
import express, { Request, Response } from "express";
import path from "path";

// Declaring Constants and Variables
const PORT = process.env.PORT ?? 4000;
const FS_OPTIONS = {
    root: ".",
};

// Setting up Server
const app = express();
const httpServer = http.createServer(app);

/// Serving Static Files
app.get("/", (req, res) => {
    res.sendFile(path.join(".", "src", "index.html"), { ...FS_OPTIONS });
});

app.use(express.static(path.join(".", "src")));

// app.use(express.text());

/// Catching Errors
app.use((req, res, next) => {
    res.status(400).send("Error 404");
});

// Listening to a certain PORT
httpServer.listen(PORT, () => {
    console.log(`http://localhost:${PORT}`);
});
