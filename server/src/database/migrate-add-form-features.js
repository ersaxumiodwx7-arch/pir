const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const dbPath = process.env.DATABASE_URL.startsWith('sqlite') 
  ? process.env.DATABASE_URL.replace('sqlite:', '')
  : './formflow.db';

const db = new sqlite3.Database(dbPath);

async function migrate() {
  try {
    console.log('Adding new form features to database...');

    // Add ending_description column
    await new Promise((resolve, reject) => {
      db.run(
        'ALTER TABLE forms ADD COLUMN ending_description TEXT',
        (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
    console.log('Added ending_description column');

    // Add background_color column
    await new Promise((resolve, reject) => {
      db.run(
        'ALTER TABLE forms ADD COLUMN background_color TEXT DEFAULT "#ffffff"',
        (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
    console.log('Added background_color column');

    // Add background_image column
    await new Promise((resolve, reject) => {
      db.run(
        'ALTER TABLE forms ADD COLUMN background_image TEXT',
        (err) => {
          if (err && !err.message.includes('duplicate column name')) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
    console.log('Added background_image column');

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
