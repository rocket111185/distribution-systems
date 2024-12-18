const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
const SECRET_KEY = process.env.SECRET_KEY;
const NAME = process.env.NAME;

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

app.post('/calculate', verifyJwtToken, (req, res) => {
    const { input_data } = req.body;
    let number = parseInt(input_data);

    if (Number.isNaN(number)) {
        return res.json({
            error: true,
            message: 'Incorrect "input_data" parameter. It must be a valid number',
            name: NAME
        });
    }

    const startTime = Date.now();

    // Convert number to BigInt for big computations
    number = BigInt(number);

    // Do random calculations which take a plenty of time
    for (let i = 0; i < 500_000; i++) {
        const randomNumber = BigInt(Math.round(Math.random() * 10**20));
        number = (number + randomNumber) ** 13n % (10n ** 40n);
    }

    const computationTime = (Date.now() - startTime) / 1000;
    const result = number.toString();

    console.log(`Received task: ${input_data}`);
    return res.json({
        result,
        computation_time: computationTime,
        name: NAME
    });
});

const PORT = process.env.PORT ?? 8000;
const server = app.listen(PORT, () => {
    console.log(`Provider service running on port ${PORT}`);
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
