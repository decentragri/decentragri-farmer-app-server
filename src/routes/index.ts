//** ROUTE FILES
import SoilAi from "./soil-ai.routes";
import Auth from "./auth.routes";
import Insight from "./insight.routes";
import OnChain from "./onchain.routes";
import Weather from "./weather.routes";
import PlantAI from "./plant-ai.routes";
import Farmer from "./farm.routes";
import Community from "./community.routes";
import Notification from "./notification.routes";
import Staking from "./staking.routes";

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
        Notification,
        Staking
    ].forEach(route => route(app));
}


export default routes;
