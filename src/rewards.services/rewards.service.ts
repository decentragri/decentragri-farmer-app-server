
//** CONFIGS IMPORT */
import { getDriver } from "../db/memgraph";
import { NotificationType } from "../notification.services/notification.interface";
import { NotificationService } from "../notification.services/notification.service";
import { CHAIN, ENGINE_ADMIN_WALLET_ADDRESS, FARMER_CREDIT_TOKEN } from "../utils/constants"

//**ENGINE IMPORT */
import WalletService, { engine } from "../wallet.services/wallet.service"




class RewardsService {

    public async sendPlantScanRewards(amount: string, username: string, farmName: string, ) {
        const driver = getDriver();
		const walletService = new WalletService(driver);

        const notificationService = new NotificationService();
        try {
            const toAddress: string = await walletService.getSmartWalletAddress(username);

            await engine.erc20.transfer(CHAIN, FARMER_CREDIT_TOKEN, ENGINE_ADMIN_WALLET_ADDRESS, { 
                toAddress, 
                amount 
            })

            await notificationService.sendRealTimeNotification(username, {
                type: NotificationType.REWARD,
                title: 'Plant Scan Reward',
                message: `You have received a reward of ${amount} for your plant scan.`,
                metadata: {
                    farmName,
                    rewardAmount: amount
                }
            });

        } catch(error: any) {
            console.log(error)
            throw error
        }
    };




} 

export default RewardsService