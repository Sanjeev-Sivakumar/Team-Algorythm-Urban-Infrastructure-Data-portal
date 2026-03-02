const express = require('express');
const router = express.Router();
const complaintController = require('../controllers/complaintController');
const authenticate = require('../middleware/auth'); // your auth middleware that sets req.user
const roleMiddleware = require('../middleware/roleMiddleware');

// Public routes - list and get complaint details (optional: you might want to protect these too)
router.get('/', authenticate, complaintController.getAllComplaints);
router.get('/:id', authenticate, complaintController.getComplaintById);

// Protected route - all authenticated users can create complaints
router.post('/', authenticate, roleMiddleware(['Citizen', 'Officer', 'Admin', 'Viewer']), complaintController.createComplaint);

// Role protected routes
router.put('/:id/estimate', authenticate, roleMiddleware(['Admin', 'Officer']), complaintController.officerEstimate);
router.put('/:id/approve', authenticate, roleMiddleware(['Admin']), complaintController.adminApprove);
router.put('/:id/close', authenticate, roleMiddleware(['Admin']), complaintController.adminClose);
router.put('/:id/progress', authenticate, roleMiddleware(['Admin', 'Officer']), complaintController.updateProgress);
router.delete('/:id', authenticate, roleMiddleware(['Admin']), complaintController.deleteComplaint);

module.exports = router;