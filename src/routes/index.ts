//** ROUTE FILES
import SoilAi from "./soil-ai.routes";
import Auth from "./auth.routes";
import Insight from "./insight.routes";
import OnChain from "./onchain.routes";
import Weather from "./weather.routes";
import PlantAI from "./plant-ai.routes";
import Farmer from "./farm.routes";
import Community from "./community.routes";
import NotificationRoutes from "./websocket/notification.routes";
const routes = (app: any): void => {
    [
        Auth,
        SoilAi,
        PlantAI,
        Insight,
        OnChain,
        Weather,
        Farmer,
        Community,

        //** WEBSOCKET ROUTES */
        NotificationRoutes
    ].forEach(route => route(app));
}


export default routes;
