import app from "./app";
import { APP_PORT } from "./utils/constants";

const port: number = APP_PORT;
const hostname: string = 'localhost'


app.listen({ port }, async () => {
    console.log(`DecentrAgri HTTP server is running on port http://${hostname}:${port}/`);
    }
);
