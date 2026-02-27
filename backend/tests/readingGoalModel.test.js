const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const ReadingGoal = require('../models/readingGoalModel');

test('reading goal monthly map supports numeric month updates via string keys', () => {
  const userId = new mongoose.Types.ObjectId();
  const goal = new ReadingGoal({ user: userId, year: 2026 });

  goal.updateMonthlyProgress(2, { targetBooks: 3, completedBooks: 1 });

  const monthGoals = goal.getCurrentMonthGoals(2);
  assert.equal(monthGoals.targetBooks, 3);
  assert.equal(monthGoals.completedBooks, 1);
  assert.equal(goal.monthlyGoals.has('2'), true);
});

test('reading goal rejects invalid month updates', () => {
  const userId = new mongoose.Types.ObjectId();
  const goal = new ReadingGoal({ user: userId, year: 2026 });

  assert.throws(() => goal.updateMonthlyProgress(0, { targetBooks: 1 }));
  assert.throws(() => goal.updateMonthlyProgress(13, { targetBooks: 1 }));
});
