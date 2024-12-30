const express = require('express');

const app = express();
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL;

app.use(express.json());

app.post('/generate_task', async (req, res) => {
    const { inputParameters, priority } = req.body;
    const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };

    const startTime = Date.now();

    try {
        console.log({ ORCHESTRATOR_URL });

        const response = await fetch(ORCHESTRATOR_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ inputParameters, priority })
        });

        const requestTime = (Date.now() - startTime) / 1000;
        const responseBody = await response.json();

        return res.json({
            response: responseBody,
            requestTime
        });
    } catch (error) {
        console.dir(error, {depth: null});
        res.status(500);
        return res.json({
            error: true,
            message: 'Failed to connect to service provider'
        });
    }
});

app.get('/', (req, res) => {
    console.log("Log to indicate API service number");

    res.json({
        success: true,
        message: "Hello, world!"
    });
});

const PORT = process.env.PORT ?? 8000;
const server = app.listen(PORT, () => {
    console.log(`API is running on port ${PORT}`);
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
