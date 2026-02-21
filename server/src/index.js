import dotenv from 'dotenv';
import { createServer } from './app.js';

dotenv.config();

const port = Number(process.env.PORT || 5000);
const app = createServer();

app.listen(port, () => {
  console.log(`HEMBIT API running on port ${port}`);
});
