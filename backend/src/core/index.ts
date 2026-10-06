import server from "../utils/server/server";
import { registerRoutes } from "./router";
import { loggerMiddleware } from "./middleware";

const app = server();

app.use((req: any, res: any, next: any) => {
  const configuredOrigins = (process.env.CORS_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean);
  const allowedOrigins = new Set([
    "https://pagelmai.netlify.app",
    "https://igcsehub-eoc.netlify.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    ...configuredOrigins,
  ]);
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }
  next();
});

app.get("/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, service: "pagelm-backend", environment: process.env.NODE_ENV || "development", timestamp: new Date().toISOString() });
});
app.get("/api/health", (_req: any, res: any) => {
  res.status(200).json({ ok: true, service: "pagelm-backend", environment: process.env.NODE_ENV || "development", timestamp: new Date().toISOString() });
});

app.use(loggerMiddleware);
app.use(app.serverStatic("/storage", "./storage"));
registerRoutes(app);

const PORT = Number(process.env.PORT || 5000);
if (!Number.isFinite(PORT) || PORT <= 0) throw new Error("Invalid PORT value: " + process.env.PORT);
const host = process.env.HOST || "0.0.0.0";
app.listen(PORT, host, () => console.log("[pagelm] running on " + host + ":" + PORT));

export default app;
