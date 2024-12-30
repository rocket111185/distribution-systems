const crypto = require('node:crypto');
const EventEmitter = require('node:events');
const express = require('express');
const amqp = require('amqplib');
const TaskManager = require('./task-manager');

const app = express();
app.use(express.json());

const AMQP_URL = process.env.AMQP_URL;

let connection;
let channel;
let callbackQueue;
const responseEmitter = new EventEmitter();
const taskManager = new TaskManager();

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

function sendTaskSequence(taskId, inputParameters, priority) {
    if (!channel) {
        throw new Error('RabbitMQ channel is not initialized.');
    }

    for (const [index, parameter] of inputParameters.entries()) {
        const correlationId = crypto.randomUUID();

        responseEmitter.once(correlationId, (response) => {
            const results = JSON.parse(response);
            taskManager.addResult(taskId, results);
        });

        const task = JSON.stringify({ id: index, parameter });
        channel.sendToQueue('priority_queue', Buffer.from(task), {
            correlationId,
            replyTo: callbackQueue,
            priority: priority,
        });
    }
}

app.post('/calculate', async (req, res) => {
    const { inputParameters, priority } = req.body;

    if (!Array.isArray(inputParameters)) {
        res.status(400);
        return res.json({
            error: true,
            message: 'The field "inputParameter" should be defined and should be an array'
        })
    }

    const taskId = crypto.randomUUID();
    const startTime = Date.now();

    taskManager.addTask(taskId, inputParameters.length, (results) => {
        const calculationTime = (Date.now() - startTime) / 1000;
        return res.json({ results, calculationTime });
    });

    sendTaskSequence(taskId, inputParameters, priority);
});

const PORT = process.env.PORT ?? 8000;
const server = app.listen(PORT, async () => {
    await connectRabbitMQ();
    console.log(`Orchestrator is running on port ${PORT}`);
});

// Graceful shutdown as-is
process.on("SIGTERM", () => {
    server.closeAllConnections();
    server.close();
    connection.close();
});

process.on("SIGINT", () => {
    server.closeAllConnections();
    server.close();
    connection.close();
});
