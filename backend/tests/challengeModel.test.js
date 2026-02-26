const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const Challenge = require('../models/challengeModel');

test('challenge progress updates participant.progress.lastReadDate and completion', () => {
  const userId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const challenge = new Challenge({
    title: 'Test Challenge',
    description: 'Test description',
    type: 'custom',
    category: 'other',
    startDate: new Date(Date.now() - 60_000),
    endDate: new Date(Date.now() + 60_000),
    createdBy: adminId,
    requirements: {
      booksToRead: 2,
      pagesToRead: 20,
      minutesToRead: 30,
      streakDays: 1,
    },
    participants: [
      {
        user: userId,
        progress: {
          booksRead: 0,
          pagesRead: 0,
          minutesRead: 0,
          longestStreak: 0,
        },
      },
    ],
  });

  const participant = challenge.updateParticipantProgress(userId, {
    booksRead: 2,
    pagesRead: 20,
    minutesRead: 30,
    longestStreak: 1,
  });

  assert.ok(participant.progress.lastReadDate instanceof Date);
  assert.equal(challenge.checkCompletion(userId), true);
});
