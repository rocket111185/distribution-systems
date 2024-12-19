const express = require("express");
const { sequelize, Event, OrderProjection, initDB } = require("./database");
const amqp = require("amqplib");

const app = express();
app.use(express.json());

const AMQP_URL = process.env.AMQP_URL;
const QUEUE_NAME = "events";

async function publishEvent(event) {
    const connection = await amqp.connect(AMQP_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });

    channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(event)), {
        persistent: true,
    });

    console.log("Event published:", event);
    await channel.close();
    await connection.close();
}

app.post("/events/", async (req, res) => {
    const { event_type, data } = req.body;
    const newEvent = await Event.create({ event_type, data });

    await publishEvent({ event_type, data });
    res.json({ message: "Event created and published", event: newEvent });
});

app.get("/get/events/", async (req, res) => {
    const events = await Event.findAll();
    res.json({ events });
});

app.get("/get/projections/", async (req, res) => {
    const projections = await OrderProjection.findAll();
    res.json({ projections });
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, async () => {
    await initDB();
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown as-is
process.on("SIGTERM", () => {
    server.closeAllConnections();
    server.close();
    sequelize.close();
});

process.on("SIGINT", () => {
    server.closeAllConnections();
    server.close();
    sequelize.close();
});
