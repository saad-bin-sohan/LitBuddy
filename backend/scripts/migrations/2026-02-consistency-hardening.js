/* eslint-disable no-console */
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const Book = require('../../models/bookModel');
const Review = require('../../models/reviewModel');
const ReadingProgress = require('../../models/readingProgressModel');
const ReadingGoal = require('../../models/readingGoalModel');
const { normalizeIsbn } = require('../../utils/isbn');

const DRY_RUN = ['1', 'true', 'yes'].includes(String(process.env.DRY_RUN || '').toLowerCase());
const BATCH_SIZE = 500;

const stats = {
  dryRun: DRY_RUN,
  startedAt: new Date().toISOString(),
  isbn: {
    scanned: 0,
    normalized: 0,
    invalidCleared: 0,
  },
  reviews: {
    duplicateGroups: 0,
    duplicateRowsRemoved: 0,
  },
  readingProgress: {
    invalidRowsRemoved: 0,
  },
  indexes: {},
};

const flushBulkOps = async (model, ops) => {
  if (!ops.length) return;
  await model.bulkWrite(ops, { ordered: false });
  ops.length = 0;
};

async function normalizeBookIsbns() {
  const ops = [];
  const cursor = Book.find({}, { _id: 1, isbn: 1 }).lean().cursor();

  for await (const book of cursor) {
    stats.isbn.scanned += 1;
    const currentIsbn = typeof book.isbn === 'string' && book.isbn.length > 0 ? book.isbn : undefined;
    const normalized = normalizeIsbn(book.isbn);

    if (currentIsbn !== normalized) {
      stats.isbn.normalized += 1;
      if (currentIsbn && !normalized) {
        stats.isbn.invalidCleared += 1;
      }

      if (!DRY_RUN) {
        ops.push(
          normalized
            ? { updateOne: { filter: { _id: book._id }, update: { $set: { isbn: normalized } } } }
            : { updateOne: { filter: { _id: book._id }, update: { $unset: { isbn: '' } } } }
        );
        if (ops.length >= BATCH_SIZE) {
          await flushBulkOps(Book, ops);
        }
      }
    }
  }

  if (!DRY_RUN) {
    await flushBulkOps(Book, ops);
  }
}

async function dedupeReviews() {
  const groups = await Review.aggregate([
    { $sort: { updatedAt: -1, createdAt: -1, _id: -1 } },
    {
      $group: {
        _id: { userId: '$userId', bookId: '$bookId' },
        ids: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  stats.reviews.duplicateGroups = groups.length;

  for (const group of groups) {
    const duplicateIds = group.ids.slice(1);
    if (!duplicateIds.length) continue;
    stats.reviews.duplicateRowsRemoved += duplicateIds.length;
    if (!DRY_RUN) {
      await Review.deleteMany({ _id: { $in: duplicateIds } });
    }
  }
}

async function cleanupInvalidReadingProgressRows() {
  const invalidRows = await ReadingProgress.aggregate([
    {
      $lookup: {
        from: Book.collection.name,
        localField: 'book',
        foreignField: '_id',
        as: 'bookDocs',
      },
    },
    {
      $addFields: {
        bookDoc: { $arrayElemAt: ['$bookDocs', 0] },
      },
    },
    {
      $match: {
        $or: [
          { bookDoc: { $eq: null } },
          { $expr: { $ne: ['$bookDoc.createdBy', '$user'] } },
        ],
      },
    },
    { $project: { _id: 1 } },
  ]).allowDiskUse(true);

  const ids = invalidRows.map((row) => row._id);
  stats.readingProgress.invalidRowsRemoved = ids.length;

  if (!DRY_RUN && ids.length) {
    await ReadingProgress.deleteMany({ _id: { $in: ids } });
  }
}

async function inspectOrSyncIndexes(model) {
  const modelName = model.modelName;
  const report = {
    desired: model.schema.indexes().length + 1, // include _id index
    existing: 0,
    toCreate: 0,
    toDrop: 0,
    dropped: [],
  };

  try {
    const existingIndexes = await model.collection.indexes();
    report.existing = existingIndexes.length;
  } catch {
    report.existing = 0;
  }

  if (typeof model.diffIndexes === 'function') {
    const diff = await model.diffIndexes();
    report.toCreate = Array.isArray(diff.toCreate) ? diff.toCreate.length : 0;
    report.toDrop = Array.isArray(diff.toDrop) ? diff.toDrop.length : 0;
  }

  if (!DRY_RUN) {
    const dropped = await model.syncIndexes();
    report.dropped = Array.isArray(dropped) ? dropped : [];
  }

  stats.indexes[modelName] = report;
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);

  try {
    console.log(`[migration] 2026-02-consistency-hardening start (dryRun=${DRY_RUN})`);

    await normalizeBookIsbns();
    await dedupeReviews();
    await cleanupInvalidReadingProgressRows();

    await inspectOrSyncIndexes(Book);
    await inspectOrSyncIndexes(Review);
    await inspectOrSyncIndexes(ReadingProgress);
    await inspectOrSyncIndexes(ReadingGoal);

    stats.completedAt = new Date().toISOString();
    console.log('[migration] 2026-02-consistency-hardening summary');
    console.log(JSON.stringify(stats, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error('[migration] failed', error);
  process.exitCode = 1;
});
