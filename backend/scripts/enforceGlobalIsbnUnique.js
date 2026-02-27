#!/usr/bin/env node

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const collection = mongoose.connection.db.collection('books');

  const indexName = 'isbnNormalized_unique_active';
  await collection.createIndex(
    { isbnNormalized: 1 },
    {
      name: indexName,
      unique: true,
      partialFilterExpression: {
        isArchived: false,
        isbnNormalized: { $exists: true, $type: 'string', $ne: '' },
      },
    }
  );

  const indexes = await collection.indexes();
  const created = indexes.find((idx) => idx.name === indexName);
  console.log(`Created/verified index: ${indexName}`);
  console.log(JSON.stringify(created, null, 2));
}

run()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
