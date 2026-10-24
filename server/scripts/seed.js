const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Demo materials are tracked in db/demo-assets (uploads/ is gitignored).
// Copy them into place so seeded material links work on a clean checkout.
function installDemoAssets() {
  const source = path.join(__dirname, '..', 'db', 'demo-assets');
  const destination = path.join(__dirname, '..', 'uploads');

  if (!fs.existsSync(source)) return;

  fs.mkdirSync(destination, { recursive: true });
  fs.cpSync(source, destination, {
    recursive: true,
    force: false,
    errorOnExist: false,
  });
  console.log('Demo upload files ready.');
}

async function main() {
  installDemoAssets();

  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'seed.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Seed complete.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exitCode = 1;
});
