import cors from 'cors';
import server from '../utils/server/server';
import { registerRoutes } from './router';
import { loggerMiddleware } from './middleware';

const app = server();


// Logger
app.use(loggerMiddleware);


// CORS
app.use(cors({
  origin: "*",
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

app.options('*', cors());


// Static storage files
app.use(
  app.serverStatic(
    "/storage",
    "./storage"
  )
);


// Register API routes
registerRoutes(app);


// Render / production server
const PORT = Number(process.env.PORT || 5000);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[pagelm] running on port ${PORT}`);
});


export default app;
