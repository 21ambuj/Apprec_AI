const express = require('express');
const router = express.Router();
const { getAllUsers, toggleBlockUser, deleteUserByAdmin, toggleVerifyUser } = require('../controllers/adminController');
const { adminProtect } = require('../middleware/adminMiddleware');

// All routes are protected by admin middleware
router.use(adminProtect);

router.route('/users').get(getAllUsers);
router.route('/users/:id/block').put(toggleBlockUser);
router.route('/users/:id/verify').put(toggleVerifyUser);
router.route('/users/:id').delete(deleteUserByAdmin);

module.exports = router;
