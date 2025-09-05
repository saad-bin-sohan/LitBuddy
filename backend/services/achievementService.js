const Achievement = require('../models/achievementModel');
const ReadingProgress = require('../models/readingProgressModel');
const ReadingGoal = require('../models/readingGoalModel');

class AchievementService {
  // Check and award reading streak achievements
  static async checkReadingStreakAchievements(userId, currentStreak) {
    const streakMilestones = [7, 14, 30, 60, 100];
    
    for (const milestone of streakMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'reading_streak',
        'metadata.streakDays': milestone
      });

      if (!existingAchievement && currentStreak >= milestone) {
        await Achievement.create({
          user: userId,
          type: 'reading_streak',
          title: `${milestone} Day Reading Streak`,
          description: `Maintained a reading streak for ${milestone} consecutive days`,
          icon: '🔥',
          points: milestone * 2,
          metadata: {
            streakDays: milestone
          }
        });
      }
    }
  }

  // Check and award books read achievements
  static async checkBooksReadAchievements(userId, totalBooksRead) {
    const bookMilestones = [1, 5, 10, 25, 50, 100];
    
    for (const milestone of bookMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'books_read',
        'metadata.booksCount': milestone
      });

      if (!existingAchievement && totalBooksRead >= milestone) {
        await Achievement.create({
          user: userId,
          type: 'books_read',
          title: `${milestone} Books Read`,
          description: `Completed reading ${milestone} books`,
          icon: '📚',
          points: milestone * 5,
          metadata: {
            booksCount: milestone
          }
        });
      }
    }
  }

  // Check and award pages read achievements
  static async checkPagesReadAchievements(userId, totalPagesRead) {
    const pageMilestones = [100, 500, 1000, 2500, 5000, 10000];
    
    for (const milestone of pageMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'pages_read',
        'metadata.pagesCount': milestone
      });

      if (!existingAchievement && totalPagesRead >= milestone) {
        await Achievement.create({
          user: userId,
          type: 'pages_read',
          title: `${milestone} Pages Read`,
          description: `Read ${milestone} pages`,
          icon: '📄',
          points: Math.floor(milestone / 10),
          metadata: {
            pagesCount: milestone
          }
        });
      }
    }
  }

  // Check and award reading time achievements
  static async checkReadingTimeAchievements(userId, totalMinutesRead) {
    const timeMilestones = [60, 300, 600, 1200, 2400, 5000]; // 1h, 5h, 10h, 20h, 40h, 83h
    
    for (const milestone of timeMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'minutes_read',
        'metadata.minutesCount': milestone
      });

      if (!existingAchievement && totalMinutesRead >= milestone) {
        const hours = Math.floor(milestone / 60);
        await Achievement.create({
          user: userId,
          type: 'minutes_read',
          title: `${hours} Hours of Reading`,
          description: `Spent ${hours} hours reading`,
          icon: '⏱️',
          points: Math.floor(milestone / 6),
          metadata: {
            minutesCount: milestone
          }
        });
      }
    }
  }

  // Check and award genre exploration achievements
  static async checkGenreExplorationAchievements(userId, genresRead) {
    const uniqueGenres = [...new Set(genresRead)];
    const genreMilestones = [3, 5, 8, 10, 15];
    
    for (const milestone of genreMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'genre_exploration',
        'metadata.genre': milestone
      });

      if (!existingAchievement && uniqueGenres.length >= milestone) {
        await Achievement.create({
          user: userId,
          type: 'genre_exploration',
          title: `${milestone} Genre Explorer`,
          description: `Explored ${milestone} different genres`,
          icon: '🔍',
          points: milestone * 10,
          metadata: {
            genre: milestone
          }
        });
      }
    }
  }

  // Check and award seasonal challenge achievements
  static async checkSeasonalChallengeAchievements(userId, completedSeasonalChallenges) {
    const seasonalMilestones = [1, 3, 5, 10];
    
    for (const milestone of seasonalMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'seasonal_challenge',
        'metadata.season': milestone
      });

      if (!existingAchievement && completedSeasonalChallenges >= milestone) {
        await Achievement.create({
          user: userId,
          type: 'seasonal_challenge',
          title: `${milestone} Seasonal Challenges`,
          description: `Completed ${milestone} seasonal reading challenges`,
          icon: '🌍',
          points: milestone * 25,
          metadata: {
            season: milestone
          }
        });
      }
    }
  }

  // Check and award perfect streak achievements
  static async checkPerfectStreakAchievements(userId, longestStreak) {
    const perfectStreakMilestones = [7, 14, 30, 60, 100];
    
    for (const milestone of perfectStreakMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'perfect_streak',
        'metadata.streakDays': milestone
      });

      if (!existingAchievement && longestStreak >= milestone) {
        await Achievement.create({
          user: userId,
          type: 'perfect_streak',
          title: `${milestone} Day Perfect Streak`,
          description: `Maintained a perfect reading streak for ${milestone} days`,
          icon: '⭐',
          points: milestone * 5,
          metadata: {
            streakDays: milestone
          }
        });
      }
    }
  }

  // Check and award leaderboard achievements
  static async checkLeaderboardAchievements(userId, rank) {
    const rankMilestones = [1, 3, 5, 10, 25, 50];
    
    for (const milestone of rankMilestones) {
      const existingAchievement = await Achievement.findOne({
        user: userId,
        type: 'leaderboard_top',
        'metadata.rank': milestone
      });

      if (!existingAchievement && rank <= milestone) {
        await Achievement.create({
          user: userId,
          type: 'leaderboard_top',
          title: `Top ${milestone} Reader`,
          description: `Reached the top ${milestone} on the global leaderboard`,
          icon: '🏆',
          points: (51 - milestone) * 5,
          metadata: {
            rank: milestone
          }
        });
      }
    }
  }

  // Comprehensive achievement check
  static async checkAllAchievements(userId) {
    try {
      // Get user's reading progress
      const readingProgress = await ReadingProgress.findOne({ user: userId });
      const readingGoal = await ReadingGoal.findOne({ user: userId });
      
      if (!readingProgress) return;

      // Calculate totals
      const totalBooksRead = readingProgress.booksRead || 0;
      const totalPagesRead = readingProgress.pagesRead || 0;
      const totalMinutesRead = readingProgress.minutesRead || 0;
      const currentStreak = readingProgress.currentStreak || 0;
      const longestStreak = readingProgress.longestStreak || 0;
      
      // Get genres from reading progress (if available)
      const genresRead = readingProgress.genresRead || [];

      // Check all achievement types
      await this.checkReadingStreakAchievements(userId, currentStreak);
      await this.checkBooksReadAchievements(userId, totalBooksRead);
      await this.checkPagesReadAchievements(userId, totalPagesRead);
      await this.checkReadingTimeAchievements(userId, totalMinutesRead);
      await this.checkGenreExplorationAchievements(userId, genresRead);
      await this.checkPerfectStreakAchievements(userId, longestStreak);

      console.log(`Achievement check completed for user ${userId}`);
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }

  // Get user's achievement summary
  static async getUserAchievementSummary(userId) {
    try {
      const achievements = await Achievement.find({ user: userId });
      const totalPoints = achievements.reduce((sum, achievement) => sum + achievement.points, 0);
      
      const achievementTypes = achievements.reduce((acc, achievement) => {
        acc[achievement.type] = (acc[achievement.type] || 0) + 1;
        return acc;
      }, {});

      return {
        totalAchievements: achievements.length,
        totalPoints,
        achievementTypes,
        recentAchievements: achievements
          .sort((a, b) => new Date(b.earnedAt) - new Date(a.earnedAt))
          .slice(0, 5)
      };
    } catch (error) {
      console.error('Error getting achievement summary:', error);
      return null;
    }
  }
}

module.exports = AchievementService;
