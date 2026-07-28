import server from '../utils/server/server';
import { registerRoutes } from './router';
import { loggerMiddleware } from './middleware';
import { cfg } from './config'; // <-- add this (check path if different)

console.log({
    provider: cfg.embeddings_provider,
    model: cfg.gemini_embed_model,
    api: !!cfg.gemini
});

const app = server();


// CORS FIRST (before everything)
app.use((req: any, res: any, next: any) => {

    const origin = req.headers.origin;

    const allowed = [
        "https://pagelmai.netlify.app",
        "http://localhost:5173"
    ];

    if (origin && allowed.includes(origin)) {
        res.setHeader(
            "Access-Control-Allow-Origin",
            origin
        );
    }

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );

    res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    res.setHeader(
        "Access-Control-Allow-Credentials",
        "true"
    );

    res.setHeader(
        "Access-Control-Max-Age",
        "86400"
    );

    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        return res.end();
    }

    next();
});


// Logger
app.use(loggerMiddleware);


// Static
app.use(
    app.serverStatic(
        "/storage",
        "./storage"
    )
);


// Routes
registerRoutes(app);


// Render
const PORT = Number(process.env.PORT || 5000);

app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(`[pagelm] running on port ${PORT}`);
    }
);


export default app;
