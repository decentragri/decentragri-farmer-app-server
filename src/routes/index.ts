//** ROUTE FILES
import SoilAi from "./soil-ai.routes";
import Auth from "./auth.routes";
import Insight from "./insight.routes";
import OnChain from "./onchain.routes";
import Weather from "./weather.routes";
import PlantAI from "./plant-ai.routes";
import Farmer from "./farmer.routes";
import Community from "./community.routes";

const routes = (app: any): void => {
    [
        Auth,
        SoilAi,
        PlantAI,
        Insight,
        OnChain,
        Weather,
        Farmer,
        Community
    ].forEach(route => route(app));
}


export default routes;
