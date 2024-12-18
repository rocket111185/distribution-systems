const crypto = require('node:crypto');
const EventEmitter = require('node:events');
const express = require('express');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const AMQP_URL = process.env.AMQP_URL;
const SERVICE_NAME = process.env.SERVICE_NAME || 'consumer';

let connection;
let channel;
let callbackQueue;
const responseEmitter = new EventEmitter(); // Подієвий обробник відповідей

// Підключення до RabbitMQ
async function connectRabbitMQ() {
    try {
        console.log('Connecting to RabbitMQ...');
        connection = await amqp.connect(AMQP_URL);
        channel = await connection.createChannel();
        await channel.assertQueue('priority_queue', { durable: true });

        const q = await channel.assertQueue('', { exclusive: true });
        callbackQueue = q.queue;

        channel.consume(
            callbackQueue,
            (msg) => {
                const correlationId = msg.properties.correlationId;
                const response = msg.content.toString();
                responseEmitter.emit(correlationId, response);
            },
            { noAck: true }
        );

        console.log('Connected to RabbitMQ.');
    } catch (err) {
        console.error('Failed to connect to RabbitMQ:', err.message);
    }
}

// Надсилання задачі
async function sendTask(task, priority) {
    if (!channel) {
        throw new Error('RabbitMQ channel is not initialized.');
    }

    const correlationId = crypto.randomUUID();

    return new Promise((resolve) => {
        const startTime = Date.now();

        // Підписка на відповідь
        responseEmitter.once(correlationId, (response) => {
            const requestTime = (Date.now() - startTime) / 1000;
            console.log(
                `Response: ${response}, Time: ${requestTime}s, Consumer: ${SERVICE_NAME}`
            );
            resolve({ response: JSON.parse(response), request_time: requestTime });
        });

        // Відправка задачі
        channel.sendToQueue('priority_queue', Buffer.from(task.toString()), {
            correlationId,
            replyTo: callbackQueue,
            priority: priority,
        });
    });
}

// API для додавання задачі
app.post('/add_task', async (req, res) => {
    const { task, priority } = req.body;

    if (!channel) {
        return res
            .status(500)
            .json({ detail: 'Consumer is not connected to RabbitMQ' });
    }

    try {
        const result = await sendTask(task, priority);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Запуск сервісу
const PORT = process.env.PORT || 8000;
const server = app.listen(PORT, async () => {
    await connectRabbitMQ();
    console.log(`Consumer service is running on port ${PORT}`);
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
