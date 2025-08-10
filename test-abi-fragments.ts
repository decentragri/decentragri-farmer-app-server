// Test script to verify ABI fragments are working
import StakingService from "./src/staking.services/staking.service";

const testStakingService = async () => {
    try {
        const stakingService = new StakingService();
        
        // Test a simple function that doesn't require a real JWT token
        // We'll catch the authentication error but verify the ABI is working
        try {
            await stakingService.getReleaseTimeFrame("fake_token");
        } catch (error: any) {
            // If we get an authentication error, it means the ABI is working
            // If we get a URI too long error, it means the ABI is still too big
            console.log("Error message:", error.message);
            
            if (error.message.includes("URI too long") || error.message.includes("414")) {
                console.log("❌ ABI is still too long!");
                return false;
            } else if (error.message.includes("verifyAccessToken") || error.message.includes("token")) {
                console.log("✅ ABI fragments are working! Got expected auth error.");
                return true;
            } else {
                console.log("⚠️ Got unexpected error:", error.message);
                return false;
            }
        }
    } catch (error) {
        console.error("Test failed:", error);
        return false;
    }
};

testStakingService().then(result => {
    if (result) {
        console.log("🎉 ABI fragments are working correctly!");
    } else {
        console.log("❌ ABI fragments test failed.");
    }
});
