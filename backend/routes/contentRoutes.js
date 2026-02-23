const express = require('express');
const router = express.Router();
const {
  getBlogPosts,
  getBlogPostBySlug,
  getCareerOpenings,
  getCareerOpeningBySlug,
  getPressResources,
} = require('../controllers/contentController');
const { contentReadLimiter } = require('../middleware/rateLimiter');

router.use(contentReadLimiter);

router.get('/blog', getBlogPosts);
router.get('/blog/:slug', getBlogPostBySlug);

router.get('/careers', getCareerOpenings);
router.get('/careers/:slug', getCareerOpeningBySlug);

router.get('/press/resources', getPressResources);

module.exports = router;
