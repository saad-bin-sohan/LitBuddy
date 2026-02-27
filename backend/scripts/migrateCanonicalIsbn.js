#!/usr/bin/env node

const dotenv = require('dotenv');
dotenv.config();

const mongoose = require('mongoose');
const Book = require('../models/bookModel');
const Review = require('../models/reviewModel');
const ReadingProgress = require('../models/readingProgressModel');

const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const dryRun = !apply || args.has('--dry-run');

function byCanonicalPriority(a, b) {
  if (a.referenceCount !== b.referenceCount) {
    return b.referenceCount - a.referenceCount;
  }

  const aTime = new Date(a.createdAt).getTime();
  const bTime = new Date(b.createdAt).getTime();
  if (aTime !== bTime) return aTime - bTime;

  return String(a._id).localeCompare(String(b._id));
}

async function countReferences(bookId) {
  const [progressCount, reviewCount] = await Promise.all([
    ReadingProgress.countDocuments({ book: bookId }),
    Review.countDocuments({ bookId }),
  ]);

  return progressCount + reviewCount;
}

async function mergeProgressCollision({ duplicateProgress, canonicalProgress, applyChanges }) {
  const duplicateReadingTime = Number(duplicateProgress.readingTime || 0);
  const canonicalReadingTime = Number(canonicalProgress.readingTime || 0);

  const merged = {
    readingTime: duplicateReadingTime + canonicalReadingTime,
    currentPage: Math.max(
      Number(duplicateProgress.currentPage || 0),
      Number(canonicalProgress.currentPage || 0)
    ),
    totalPages: Math.max(
      Number(duplicateProgress.totalPages || 0),
      Number(canonicalProgress.totalPages || 0)
    ),
  };

  const winner =
    new Date(duplicateProgress.updatedAt).getTime() > new Date(canonicalProgress.updatedAt).getTime()
      ? duplicateProgress
      : canonicalProgress;
  const loser = String(winner._id) === String(duplicateProgress._id) ? canonicalProgress : duplicateProgress;

  if (applyChanges) {
    await ReadingProgress.updateOne({ _id: winner._id }, { $set: merged });
    await ReadingProgress.deleteOne({ _id: loser._id });
  }

  return {
    mergedInto: String(winner._id),
    removed: String(loser._id),
  };
}

async function remapDuplicateBook({ duplicateBook, canonicalBook, applyChanges, counters }) {
  const duplicateProgressEntries = await ReadingProgress.find({ book: duplicateBook._id });

  for (const duplicateProgress of duplicateProgressEntries) {
    const canonicalProgress = await ReadingProgress.findOne({
      user: duplicateProgress.user,
      book: canonicalBook._id,
    });

    if (!canonicalProgress) {
      if (applyChanges) {
        await ReadingProgress.updateOne(
          { _id: duplicateProgress._id },
          { $set: { book: canonicalBook._id } }
        );
      }
      counters.progressRemapped += 1;
      continue;
    }

    await mergeProgressCollision({
      duplicateProgress,
      canonicalProgress,
      applyChanges,
    });
    counters.progressMerged += 1;
  }

  const reviewUpdateResult = applyChanges
    ? await Review.updateMany(
      { bookId: duplicateBook._id },
      { $set: { bookId: canonicalBook._id } }
    )
    : await Review.countDocuments({ bookId: duplicateBook._id }).then((count) => ({ modifiedCount: count }));
  counters.reviewsRemapped += Number(reviewUpdateResult.modifiedCount || 0);

  if (applyChanges) {
    await Book.updateOne(
      { _id: duplicateBook._id },
      {
        $set: {
          isArchived: true,
          visibility: 'private',
          mergedInto: canonicalBook._id,
        },
      }
    );
  }
  counters.booksArchived += 1;
}

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(process.env.MONGO_URI);
  const startedAt = Date.now();

  const duplicateGroups = await Book.aggregate([
    {
      $match: {
        isbnNormalized: { $exists: true, $ne: '' },
        isArchived: { $ne: true },
      },
    },
    {
      $group: {
        _id: '$isbnNormalized',
        bookIds: { $push: '$_id' },
        count: { $sum: 1 },
      },
    },
    {
      $match: { count: { $gt: 1 } },
    },
    {
      $sort: { count: -1, _id: 1 },
    },
  ]);

  const counters = {
    groups: duplicateGroups.length,
    progressRemapped: 0,
    progressMerged: 0,
    reviewsRemapped: 0,
    booksArchived: 0,
  };

  for (const group of duplicateGroups) {
    const books = await Book.find({
      _id: { $in: group.bookIds },
      isArchived: { $ne: true },
    }).sort({ createdAt: 1 });

    const enriched = await Promise.all(
      books.map(async (book) => ({
        ...book.toObject(),
        referenceCount: await countReferences(book._id),
      }))
    );
    enriched.sort(byCanonicalPriority);

    const canonicalBook = enriched[0];
    const duplicateBooks = enriched.slice(1);

    console.log(
      `[ISBN ${group._id}] canonical=${canonicalBook._id} refs=${canonicalBook.referenceCount} duplicates=${duplicateBooks.length}`
    );

    for (const duplicateBook of duplicateBooks) {
      console.log(`  - remap duplicate=${duplicateBook._id} refs=${duplicateBook.referenceCount}`);
      await remapDuplicateBook({
        duplicateBook,
        canonicalBook,
        applyChanges: apply && !dryRun,
        counters,
      });
    }
  }

  const elapsedMs = Date.now() - startedAt;
  console.log('---');
  console.log(`mode=${apply && !dryRun ? 'APPLY' : 'DRY_RUN'}`);
  console.log(`groups=${counters.groups}`);
  console.log(`progressRemapped=${counters.progressRemapped}`);
  console.log(`progressMerged=${counters.progressMerged}`);
  console.log(`reviewsRemapped=${counters.reviewsRemapped}`);
  console.log(`booksArchived=${counters.booksArchived}`);
  console.log(`elapsedMs=${elapsedMs}`);
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
