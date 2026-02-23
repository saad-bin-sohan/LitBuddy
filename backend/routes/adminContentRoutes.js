const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/rbacMiddleware');
const {
  listBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  listCareerOpenings,
  createCareerOpening,
  updateCareerOpening,
  deleteCareerOpening,
  listPressResources,
  createPressResource,
  updatePressResource,
  deletePressResource,
} = require('../controllers/adminContentController');

router.use(protect, requireAdmin);

router.route('/blog').get(listBlogPosts).post(createBlogPost);
router.route('/blog/:id').patch(updateBlogPost).delete(deleteBlogPost);

router.route('/careers').get(listCareerOpenings).post(createCareerOpening);
router.route('/careers/:id').patch(updateCareerOpening).delete(deleteCareerOpening);

router.route('/press-resources').get(listPressResources).post(createPressResource);
router.route('/press-resources/:id').patch(updatePressResource).delete(deletePressResource);

module.exports = router;
