const mongoose = require('mongoose');
const User = require('../models/userModel');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/litbuddy', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixProfileCompletion() {
  try {
    console.log('Starting profile completion fix...');
    
    // Find all users
    const users = await User.find({});
    console.log(`Found ${users.length} total users`);
    
    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    
    for (const user of users) {
      // Check if user has complete profile based on required fields
      const hasRequiredFields = ['name', 'age', 'gender'].every(field => {
        const value = user[field];
        return value !== undefined && value !== null && value !== '';
      });
      
      if (hasRequiredFields && !user.hasCompletedSetup) {
        // User has complete profile but is marked as incomplete
        user.hasCompletedSetup = true;
        await user.save();
        console.log(`Fixed user: ${user.email || user.phone} (${user.name})`);
        fixedCount++;
      } else if (hasRequiredFields && user.hasCompletedSetup) {
        // User has complete profile and is correctly marked
        alreadyCorrectCount++;
      } else if (!hasRequiredFields && user.hasCompletedSetup) {
        // User is marked as complete but doesn't have required fields
        user.hasCompletedSetup = false;
        await user.save();
        console.log(`Corrected user: ${user.email || user.phone} (${user.name}) - marked as incomplete`);
        fixedCount++;
      }
    }
    
    console.log(`\nProfile completion fix completed:`);
    console.log(`- Fixed: ${fixedCount} users`);
    console.log(`- Already correct: ${alreadyCorrectCount} users`);
    console.log(`- Total processed: ${users.length} users`);
    
  } catch (error) {
    console.error('Error fixing profile completion:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Run the script
fixProfileCompletion();
