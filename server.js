var _a;
// Importing Libraries
import http from "http";
import express from "express";
import path from "path";
// Declaring Constants and Variables
const PORT = (_a = process.env.PORT) !== null && _a !== void 0 ? _a : 4000;
const FS_OPTIONS = {
    root: ".",
};
// Setting up Server
const app = express();
const httpServer = http.createServer(app);
/// Serving Static Files
app.get("/", (req, res) => {
    res.sendFile(path.join(".", "src", "index.html"), Object.assign({}, FS_OPTIONS));
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
