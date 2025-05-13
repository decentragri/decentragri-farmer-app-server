//** ROUTE FILES
import SoilAi from "./soil-ai.routes";
import Auth from "./auth.routes";
import Insight from "./insight.routes";
import OnChain from "./onchain.routes";
import Weather from "./weather.routes";


const routes = (app: any): void => {
    [
        Auth,
        SoilAi,
        Insight,
        OnChain,
        Weather
    ].forEach(route => route(app));
}

export default routes;
