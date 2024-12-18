const crypto = require('node:crypto');
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const PROVIDER_URL = process.env.PROVIDER_URL;
const SECRET_KEY = process.env.SECRET_KEY;
const NAME = process.env.NAME;

// Token durability in seconds. Set to 10 minutes by default
const TOKEN_DURABILITY = process.env.TOKEN_DURABILITY ?? 600;

app.use(express.json());

function verifyJwtToken(req, res, next) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({ detail: 'Authorization header missing' });
    }
    if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ detail: 'Invalid token format' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const payload = jwt.verify(token, SECRET_KEY);
        req.payload = payload;
        return next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ detail: 'Token has expired' });
        } else {
            return res.status(500).json({ detail: 'Server error' });
        }
    }
}

function generateRandomJwt() {
    const currentDate = Date.now();

    const payload = {
        user: crypto.randomUUID(),
        iat: Math.floor(currentDate / 1000),
        exp: Math.floor(currentDate / 1000) + TOKEN_DURABILITY,
    };

    return jwt.sign(payload, SECRET_KEY);
}

app.get('/generate_task', verifyJwtToken, async (req, res) => {
    const { input_data } = req.query;

    const token = generateRandomJwt();
    const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
    };

    const startTime = Date.now();

    try {
        console.log({ PROVIDER_URL });

        const response = await fetch(PROVIDER_URL, {
            method: 'POST',
            headers,
            body: JSON.stringify({ input_data })
        });

        const requestTime = (Date.now() - startTime) / 1000;
        const responseBody = await response.json();

        return res.json({
            response: responseBody,
            request_time: requestTime,
            consumer: NAME,
        });
    } catch (error) {
        console.dir(error, {depth: null});
        return res.status(500).json({ error: 'Failed to connect to provider' });
    }
});

app.get('/generate_random_jwt', (req, res) => {
    const token = generateRandomJwt();
    res.json({ token });
});

const PORT = process.env.PORT ?? 8000;
const server = app.listen(PORT, () => {
    console.log(`Consumer service running on port ${PORT}`);
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
