const amqp = require('amqplib');

const AMQP_URL = process.env.AMQP_URL;

function solveLinearSystem(input) {
    const { coefficients, values } = input;
    const n = coefficients.length;

    if (!Array.isArray(coefficients) || !Array.isArray(values) || coefficients.length !== values.length) {
        // Incorrect input data format
        return null;
    }

    // Making a copy to avoid argument changes
    const matrix = coefficients.map((row, i) => [...row, values[i]]);

    for (let i = 0; i < n; i++) {
        let maxRow = i;
        for (let k = i + 1; k < n; k++) {
            if (Math.abs(matrix[k][i]) > Math.abs(matrix[maxRow][i])) {
                maxRow = k;
            }
        }

        [matrix[i], matrix[maxRow]] = [matrix[maxRow], matrix[i]];

        if (Math.abs(matrix[i][i]) < 1e-10) {
            // System either has no solutions or infinity number of solutions
            return null;
        }

        for (let k = i + 1; k <= n; k++) {
            matrix[i][k] /= matrix[i][i];
        }

        for (let j = i + 1; j < n; j++) {
            const factor = matrix[j][i];
            for (let k = i; k <= n; k++) {
                matrix[j][k] -= factor * matrix[i][k];
            }
        }
    }

    const result = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        result[i] = matrix[i][n];
        for (let j = i + 1; j < n; j++) {
            result[i] -= matrix[i][j] * result[j];
        }
    }

    return result;
}

function extraCalculation() {
    let number = BigInt(0);

    for (let i = 0; i < 100_000; i++) {
        const randomNumber = BigInt(Math.round(Math.random() * 10**20));
        number = (number + randomNumber) ** 13n % (10n ** 40n);
    }
}

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
                const body = JSON.parse(bodyString);
                const { id, system } = body;
                const correlationId = msg.properties?.correlationId;

                console.log(`Received task: ${correlationId}, chunk ${id}`);

                const startTime = Date.now();
                const result = solveLinearSystem(system);

                // Spend extra CPU cycles
                extraCalculation();

                const computationTime = (Date.now() - startTime) / 1000;
                console.log(`Computed: ${result}, Time: ${computationTime}s`);

                const response = JSON.stringify({ result, computationTime, id });

                channel.sendToQueue(msg.properties.replyTo, Buffer.from(response), {
                    correlationId
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
