import express from "express";

const app = express();
const port = 8000;

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Hello, world!");
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});