const amqp = require('amqplib');

const AMQP_URL = process.env.AMQP_URL;

async function startProvider() {
    try {
        console.log(`Connecting to RabbitMQ at ${AMQP_URL}`);
        const connection = await amqp.connect(AMQP_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue('priority_queue', { durable: true });

        console.log('Provider is waiting for messages...');

        channel.consume('priority_queue', async (msg) => {
            if (msg) {
                const bodyString = msg.content.toString();
                console.log(`Received task: ${bodyString}`);

                const body = JSON.parse(bodyString);
                const { id } = body;
                let number = parseInt(body.parameter);

                if (Number.isNaN(number)) {
                  // Set the number to anything
                  number = 0;
                }

                const startTime = Date.now();

                // Convert number to BigInt for big computations
                number = BigInt(number);

                // Do random calculations which take a plenty of time
                for (let i = 0; i < 100_000; i++) {
                    const randomNumber = BigInt(Math.round(Math.random() * 10**20));
                    number = (number + randomNumber) ** 13n % (10n ** 40n);
                }

                const computationTime = (Date.now() - startTime) / 1000;
                const result = number.toString();
                console.log(`Computed: ${result}, Time: ${computationTime}s`);

                const response = JSON.stringify({ result, computationTime, id });

                channel.sendToQueue(msg.properties.replyTo, Buffer.from(response), {
                    correlationId: msg.properties.correlationId,
                });

                channel.ack(msg);
            }
        });

        // Graceful shutdown as-is
        process.on("SIGTERM", () => {
            connection.close();
        });

        process.on("SIGINT", () => {
            connection.close();
        });
    } catch (err) {
        console.error('Failed to start provider:', err.message);
    }
}

startProvider();
