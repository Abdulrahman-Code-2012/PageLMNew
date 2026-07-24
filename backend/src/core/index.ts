import cors from 'cors';
import server from '../utils/server/server';
import { registerRoutes } from './router';
import { loggerMiddleware } from './middleware';

const app = server();


// Logger middleware
app.use(loggerMiddleware);


// CORS
app.use(cors({
  origin: [
    "https://pagelm.netlify.app",
    "http://localhost:5173"
  ],
  methods: [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS'
  ],
  allowedHeaders: [
    'Content-Type',
    'Authorization'
  ],
  credentials: true,
}));

app.options('*', cors({
  origin: [
    "https://pagelm.netlify.app",
    "http://localhost:5173"
  ],
  credentials: true
}));


// Static files
app.use(
  app.serverStatic(
    "/storage",
    "./storage"
  )
);


// Register API routes
registerRoutes(app);


// Start server (Render)
const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, () => {
  console.log(`[pagelm] running on port ${PORT}`);
});


export default app;
