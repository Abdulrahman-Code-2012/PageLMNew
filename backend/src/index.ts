import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import { registerRoutes } from "./core/routes";
import server from "./utils/server/server";


// Create server
const app = server();


// ===============================
// CORS CONFIGURATION
// ===============================

app.use(
    (req: any, res: any, next: any) => {

        const allowedOrigins = [
            "https://pagelmai.netlify.app",
            "http://localhost:5173"
        ];


        const origin = req.headers.origin;


        if (
            !origin ||
            allowedOrigins.includes(origin)
        ) {
            res.set(
                "Access-Control-Allow-Origin",
                origin || "*"
            );
        }


        res.set(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        );


        res.set(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        );


        res.set(
            "Access-Control-Allow-Credentials",
            "true"
        );


        if (req.method === "OPTIONS") {
            res.statusCode = 204;
            return res.end();
        }


        next();
    }
);


// ===============================
// JSON BODY PARSER
// ===============================

app.use(
    (req:any,res:any,next:any)=>{

        if(
            req.headers["content-type"]
            ?.includes("application/json")
        ){

            let body = "";

            req.on(
                "data",
                (chunk:any)=>{
                    body += chunk;
                }
            );


            req.on(
                "end",
                ()=>{

                    try{
                        req.body =
                            JSON.parse(body);
                    }
                    catch{
                        req.body = null;
                    }

                    next();
                }
            );

        }
        else{
            next();
        }

    }
);


// ===============================
// TEST ROUTE
// ===============================

app.get(
    "/",
    (_req:any,res:any)=>{

        res.json({
            status:"online",
            name:"PageLM API",
            version:"1.0.0"
        });

    }
);


// ===============================
// REGISTER ALL AI ROUTES
// ===============================

registerRoutes(app);


// ===============================
// START SERVER
// ===============================

const PORT =
    Number(process.env.PORT) || 10000;


app.listen(
    PORT,
    "0.0.0.0",
    ()=>{

        console.log(
            `[pagelm] running on port ${PORT}`
        );

    }
);
