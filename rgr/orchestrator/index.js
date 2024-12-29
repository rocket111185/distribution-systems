const express = require('express');

const app = express();

app.use(express.json());

app.post('/calculate', async (req, res) => {
    const { inputParameters } = req.body;

    if (!Array.isArray(inputParameters)) {
        res.status(400);
        return res.json({
            error: true,
            message: 'The field "inputParameter" should be defined and should be an array'
        })
    }

    const startTime = Date.now();

    result = inputParameters.map((element) => {
        const number = parseInt(element);
        if (Number.isNaN(number)) {
            return element;
        }

        return element ** 2;
    });

    const calculationTime = (Date.now() - startTime) / 1000;

    return res.json({ result, calculationTime });
});

const PORT = process.env.PORT ?? 8000;
const server = app.listen(PORT, () => {
    console.log(`Orchestrator is running on port ${PORT}`);
});

// Graceful shutdown as-is
process.on("SIGTERM", () => {
    server.closeAllConnections();
    server.close();
});

process.on("SIGINT", () => {
    server.closeAllConnections();
    server.close();
});
