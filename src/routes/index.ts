//** ROUTE FILES
import SoilAi from "./soil-ai.routes";
import Auth from "./auth.routes";
import Insight from "./insight.routes";
import OnChain from "./onchain.routes";
import Weather from "./weather.routes";
import PlantAI from "./plant-ai.routes";


const routes = (app: any): void => {
    [
        Auth,
        SoilAi,
        PlantAI,
        Insight,
        OnChain,
        Weather
    ].forEach(route => route(app));
}


export default routes;
