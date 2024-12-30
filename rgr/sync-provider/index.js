const express = require('express');

const app = express();
app.use(express.json());

app.post('/format', (req, res) => {
  const { results, format } = req.body;
  let formattedResults = [];

  switch (format) {
    case 'only-results':
      formattedResults = results.toSorted((a, b) => a.id - b.id)
        .map((element) => element.result);
      break;

    case 'full':
      formattedResults = results.toSorted((a, b) => a.id - b.id);
      break;

    default:
      formattedResults = results;
  }

  res.json({ results: formattedResults });
});

const PORT = process.env.PORT ?? 8000;
const server = app.listen(PORT, () => {
    console.log(`Sync provider is running on port ${PORT}`);
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
