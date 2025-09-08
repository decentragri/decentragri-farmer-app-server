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
import YieldPrediction from "./yield-prediction.routes";
import FarmReport from "./farm-report.routes";
import CropPlanning from "./crop-planning.routes";

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
        Staking,
        YieldPrediction,
        FarmReport,
        CropPlanning
    ].forEach(route => route(app));
}


export default routes;
