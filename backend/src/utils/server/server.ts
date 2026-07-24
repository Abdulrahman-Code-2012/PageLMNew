"use strict";

/**
 * Fubelt Server Wrapper
 */

import fs from "fs";
import path from "path";
import http from "http";
import { parse } from "url";
import { WebSocketServer } from "ws";


function server() {

    const ROUTES: any[] = [];
    const WARES: any[] = [];
    const WS_ROUTES: any[] = [];

    const wss = new WebSocketServer({
        noServer: true
    });


    const SERVER = http.createServer(
        (req: any, res: any) => {

            const u = parse(req.url || "", true);

            req.query = u.query || {};
            req.path = u.pathname || "/";

            req.hostname =
                (req.headers.host || "")
                .split(":")[0]
                .replace(/[^\w.-]/g, "");


            req.ip =
                (req.socket.remoteAddress || "")
                .replace(/[^\w.:]/g, "");



            res.statusCode = 200;


            res.status = (code: number) => {
                res.statusCode = code;
                return res;
            };


            res.json = (data: any) => {

                res.writeHead(
                    res.statusCode || 200,
                    {
                        "Content-Type":
                            "application/json"
                    }
                );

                res.end(
                    JSON.stringify(data)
                );
            };



            res.send = (data: any) => {

                if (
                    data === undefined ||
                    data === null
                ) {
                    data = "";
                }


                if (
                    typeof data === "object"
                ) {
                    return res.json(data);
                }


                res.writeHead(
                    res.statusCode || 200,
                    {
                        "Content-Type":
                            "text/plain"
                    }
                );


                res.end(String(data));
            };



            res.set = (
                key: string,
                value: string
            ) => {

                res.setHeader(
                    key,
                    value
                );

                return res;
            };



            const route =
                matchRoute(
                    req.method.toUpperCase(),
                    req.path
                );


            req.params =
                route
                ? route.params
                : {};



            const handlers = [
                ...WARES
            ];



            handlers.push(

                route

                ?

                (
                    req:any,
                    res:any,
                    next:any
                ) =>
                    route.handler(
                        req,
                        res,
                        next
                    )


                :

                (
                    _req:any,
                    res:any
                ) =>
                    res
                    .status(404)
                    .end(
                        "404: Not Found"
                    )
            );



            let index = 0;


            const next = () => {

                if (
                    index <
                    handlers.length
                ) {

                    handlers[index++](
                        req,
                        res,
                        next
                    );

                }

            };


            next();

        }
    );




    SERVER.on(
        "upgrade",
        (
            req:any,
            socket:any,
            head:any
        ) => {


            const u =
                parse(
                    req.url || "",
                    true
                );


            const urlPath =
                u.pathname;



            for (
                const route of WS_ROUTES
            ) {


                if (
                    route.path === urlPath
                ) {


                    wss.handleUpgrade(
                        req,
                        socket,
                        head,
                        (ws:any)=>{

                            ws.req = req;

                            route.handler(
                                ws,
                                req
                            );

                        }
                    );


                    return;

                }

            }


            socket.destroy();

        }
    );






    function matchRoute(
        method:string,
        urlPath:string
    ) {


        for (
            const route of ROUTES
        ) {


            if (
                route.method !== method &&
                route.method !== "ALL"
            ) {
                continue;
            }



            const routeParts =
                route.path
                .split("/")
                .filter(Boolean);



            const urlParts =
                urlPath
                .split("/")
                .filter(Boolean);



            if (
                routeParts.length !==
                urlParts.length
            ) {
                continue;
            }



            const params:any = {};

            let matched = true;



            for (
                let i = 0;
                i < routeParts.length;
                i++
            ) {


                if (
                    routeParts[i]
                    .startsWith(":")
                ) {


                    params[
                        routeParts[i]
                        .slice(1)
                    ] =
                        decodeURIComponent(
                            urlParts[i]
                        );


                }

                else if (
                    routeParts[i] !==
                    urlParts[i]
                ) {


                    matched = false;
                    break;

                }

            }



            if (matched) {

                return {
                    handler:
                        route.handler,
                    params
                };

            }

        }



        return null;

    }






    function add(
        method:string,
        routePath:string,
        handler:any
    ) {


        ROUTES.push({

            method:
                method.toUpperCase(),

            path:
                routePath,

            handler

        });

    }






    function use(
        middleware:any
    ) {

        WARES.push(
            middleware
        );

    }






    function listen(
        port:number,
        host?:string | Function,
        callback?:Function
    ) {


        SERVER.setTimeout(
            10000
        );



        if (
            typeof host === "function"
        ) {

            callback =
                host;

            host =
                "0.0.0.0";

        }



        SERVER.listen(
            port,
            host || "0.0.0.0",
            callback as any
        );

    }







    function serverStatic(
        endpoint:string,
        dir:string
    ) {


        const absolute =
            path.resolve(dir);



        if (
            !fs.existsSync(absolute) ||
            !fs.statSync(absolute)
            .isDirectory()
        ) {


            console.error(
                `[STATIC] Directory not found: ${absolute}`
            );


            return (
                _req:any,
                _res:any,
                next:any
            ) =>
                next();

        }





        const base =
            endpoint.endsWith("/")
            ? endpoint
            : endpoint + "/";





        return (
            req:any,
            res:any,
            next:any
        ) => {



            if (
                req.method !== "GET" &&
                req.method !== "HEAD"
            ) {

                return next();

            }



            if (
                !req.path.startsWith(base)
            ) {

                return next();

            }





            const file =
                path.join(
                    absolute,
                    req.path.substring(
                        base.length
                    )
                );




            fs.stat(
                file,
                (
                    err,
                    stats
                )=>{


                    if (
                        err ||
                        !stats.isFile()
                    ) {

                        return next();

                    }



                    fs.createReadStream(
                        file
                    )
                    .pipe(res);


                }
            );

        };

    }







    // JSON body parser

    use(
        (
            req:any,
            res:any,
            next:any
        )=>{


            const type =
                req.headers[
                    "content-type"
                ];



            if (
                type &&
                type.includes(
                    "application/json"
                )
            ) {


                let body = "";



                req.on(
                    "data",
                    (
                        chunk:any
                    )=>{

                        body += chunk;

                    }
                );



                req.on(
                    "end",
                    ()=>{


                        try {

                            req.body =
                                JSON.parse(body);

                        }

                        catch {

                            req.body =
                                null;

                        }



                        next();

                    }
                );

            }

            else {

                next();

            }

        }
    );






    return {


        use,

        listen,

        serverStatic,


        routes:
            ROUTES,


        getRoutes:
            () => ROUTES,



        get:
            (
                p:string,
                h:any
            ) =>
                add(
                    "GET",
                    p,
                    h
                ),



        post:
            (
                p:string,
                h:any
            ) =>
                add(
                    "POST",
                    p,
                    h
                ),



        put:
            (
                p:string,
                h:any
            ) =>
                add(
                    "PUT",
                    p,
                    h
                ),



        patch:
            (
                p:string,
                h:any
            ) =>
                add(
                    "PATCH",
                    p,
                    h
                ),



        delete:
            (
                p:string,
                h:any
            ) =>
                add(
                    "DELETE",
                    p,
                    h
                ),



        options:
            (
                p:string,
                h:any
            ) =>
                add(
                    "OPTIONS",
                    p,
                    h
                ),



        all:
            (
                p:string,
                h:any
            ) =>
                add(
                    "ALL",
                    p,
                    h
                ),



        ws:
            (
                p:string,
                h:any
            ) =>
                WS_ROUTES.push({
                    path:p,
                    handler:h
                })

    };

}



export default server;
