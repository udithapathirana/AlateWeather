import express from 'express';
import { getTile, getTileMetadata } from '../controllers/tileController.js';

const router = express.Router();

// Get a specific tile: /api/tiles/{layer}/{z}/{x}/{y}.png
router.get('/:layer/:z/:x/:y.png', getTile);

// Get tile metadata
router.get('/:layer/metadata', getTileMetadata);

export default router;