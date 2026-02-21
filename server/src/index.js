import dotenv from 'dotenv';
import { createServer } from './app.js';
import { closeStore, initStore } from './services/store.js';

dotenv.config();

await initStore();

const port = Number(process.env.PORT || 5000);
const app = createServer();

app.listen(port, () => {
  console.log(`HEMBIT API running on port ${port}`);
});

async function shutdown() {
  await closeStore();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
