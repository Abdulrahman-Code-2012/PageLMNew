import server from '../utils/server/server';
import { registerRoutes } from './router';
import { loggerMiddleware } from './middleware';

const app = server();


// Logger
app.use(loggerMiddleware);


// CORS
app.use((req: any, res: any, next: any) => {

    const allowedOrigins = [
        "https://pagelmai.netlify.app",
        "http://localhost:5173"
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
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


    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        return res.end();
    }


    next();
});



// Static
app.use(
    app.serverStatic(
        "/storage",
        "./storage"
    )
);


// Routes
registerRoutes(app);


// Render PORT
const PORT = Number(process.env.PORT || 5000);


app.listen(
    PORT,
    "0.0.0.0",
    () => {
        console.log(
            `[pagelm] running on port ${PORT}`
        );
    }
);


export default app;
