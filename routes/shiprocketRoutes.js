// routes/shiprocketRoutes.js
import express from 'express';
import { createOrderForExisting, getTrackingInfo, cancelOrder } from '../controllers/shiprocketOrder.controller.js';
import { authenticateAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Admin routes for Shiprocket
router.post('/create-order/:orderId', createOrderForExisting); // Remove auth for now
router.get('/track/:awbCode', authenticateAdmin, getTrackingInfo);
router.post('/cancel-order/:orderId', authenticateAdmin, cancelOrder);

export default router;