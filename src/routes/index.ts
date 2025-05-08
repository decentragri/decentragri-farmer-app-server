//** ROUTE FILES
import SoilAi from "./soil-ai.routes";
import Auth from "./auth.routes";
import Insight from "./insight.routes";
import OnChain from "./onchain.routes";


const routes = (app: any): void => {
    [
        Auth,
        SoilAi,
        Insight,
        OnChain
    ].forEach(route => route(app));
}

export default routes;
