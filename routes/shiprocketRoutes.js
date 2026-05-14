// routes/shiprocketRoutes.js
import express from 'express';
import { createOrderForExisting, getTrackingInfo, cancelOrder } from '../controllers/shiprocketOrder.controller.js';
// import { authenticateAdmin } from '../middleware/adminAuth.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Admin routes for Shiprocket
// router.post('/create-order/:orderId', createOrderForExisting); // Remove auth for now
// router.get('/track/:awbCode', authenticateAdmin, getTrackingInfo);
// router.post('/cancel-order/:orderId', authenticateAdmin, cancelOrder);
router.post('/create-order/:orderId', requireAuth, createOrderForExisting);
router.get('/track/:awbCode', requireAuth, getTrackingInfo);
router.post('/cancel-order/:orderId', requireAuth, cancelOrder);

export default router;