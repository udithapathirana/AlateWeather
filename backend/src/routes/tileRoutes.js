// backend/src/routes/tileRoutes.js
import express from 'express';
import { getTile, getTileMetadata } from '../controllers/tileController.js';

const router = express.Router();

// Support both .json and .png extensions for compatibility
router.get('/:layer/:z/:x/:y.json', getTile);
router.get('/:layer/:z/:x/:y.png', getTile);  // Also support .png for MapLibre compatibility

// Get tile metadata
router.get('/:layer/metadata', getTileMetadata);

export default router;