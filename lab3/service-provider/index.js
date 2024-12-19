const amqp = require("amqplib");
const { Sequelize, DataTypes } = require("sequelize");

const AMQP_URL = process.env.AMQP_URL;
const QUEUE_NAME = "events";
let connection;

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: "postgres",
    logging: console.log,
});

const OrderProjection = sequelize.define("OrderProjection", {
    order_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    product_id: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
});

async function createProjection(data) {
  const projection = await OrderProjection.findByPk(data.order_id);

  if (projection) {
      console.error(`Projection already exists for order: ${data.order_id}`);
      return;
  }

  await OrderProjection.create(data);
  console.log("Projection created:", data);
}

async function updateProjection(data) {
  const projection = await OrderProjection.findByPk(data.order_id);

  if (!projection) {
      console.error(`Projection not found for order: ${data.order_id}`);
      return;
  }

  projection.quantity = data.quantity;
  await projection.save();
  console.log("Projection updated:", data);
}

async function deleteProjection(data) {
  const projection = await OrderProjection.findByPk(data.order_id);

  if (!projection) {
      console.error(`Projection not found for order: ${data.order_id}`);
      return;
  }

  await projection.destroy();
  console.log("Projection deleted:", data);
}

async function processEvent(event) {
    console.log("Received event:", event);

    const eventProcessorMap = {
      order_created: createProjection,
      order_updated: updateProjection,
      order_deleted: deleteProjection
    };

    const eventProcessor = eventProcessorMap[event.event_type];

    if (typeof eventProcessor !== "function") {
      console.error("Unknown event type:", event.event_type);
      return;
    }

    eventProcessor(event.data);
}

async function startConsumer() {
  try {
      console.log("Connecting to RabbitMQ...");
      connection = await amqp.connect(AMQP_URL);
      const channel = await connection.createChannel();
      await channel.assertQueue(QUEUE_NAME, { durable: true });

      console.log(`Waiting for messages on queue: ${QUEUE_NAME}`);

      channel.consume(
          QUEUE_NAME,
          async (msg) => {
              if (msg) {
                  const event = JSON.parse(msg.content.toString());
                  await processEvent(event);
                  channel.ack(msg);
              }
          },
          { noAck: false }
      );
  } catch (err) {
      console.error("Error in consumer:", err.message);
  }
}

async function init() {
    await sequelize.sync();
    console.log("Database synchronized");
    await startConsumer();
}

// Graceful shutdown as-is
process.on("SIGTERM", () => {
    connection.close().finally(() => {
        sequelize.close();
    });
});

process.on("SIGINT", () => {
    connection.close().finally(() => {
        sequelize.close();
    });
});

init();
