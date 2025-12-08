import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';
import weatherRoutes from './routes/weatherRoutes.js';
import tileRoutes from './routes/tileRoutes.js';
import { startTileGeneration } from './workers/tileWorker.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.io for real-time updates
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static tiles
app.use('/tiles', express.static('tiles'));

// Routes
app.use('/api/weather', weatherRoutes);
app.use('/api/tiles', tileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    websocket: io.engine.clientsCount > 0
  });
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('subscribe', (country) => {
    socket.join(`weather-${country}`);
    console.log(`Client subscribed to ${country}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to other modules
app.set('io', io);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🗺️  Tile server ready at http://localhost:${PORT}/tiles`);
  
  // Start background tile generation
  if (process.env.NODE_ENV === 'production') {
    startTileGeneration(io);
  }
});

export default app;