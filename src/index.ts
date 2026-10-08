import express from "express";
import subjectsRouter from "./routes/subjects.js";

const app = express();
const PORT = 8000;

app.use(express.json());

app.use('/api/subjects', subjectsRouter);

app.get('/', (req, res) => {
    res.send('Welcome to the Classroom API');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});