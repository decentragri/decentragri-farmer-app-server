// Test cache service behavior without Redis
import CacheService from "./src/utils/redis.service";

async function testCacheService() {
    console.log("🧪 Testing Cache Service...\n");
    
    const cache = CacheService.getInstance();
    
    // Show cache status
    console.log("📊 Cache Status:");
    console.log(cache.getCacheStatus());
    console.log("");
    
    // Test basic cache operations
    console.log("💾 Testing cache operations...");
    
    // Set a value
    await cache.set("test:key1", { message: "Hello World", timestamp: Date.now() }, 60);
    console.log("✅ Set test:key1");
    
    // Get the value
    const retrieved = await cache.get("test:key1");
    console.log("✅ Retrieved test:key1:", retrieved);
    
    // Test getOrSet pattern
    console.log("\n🔄 Testing getOrSet pattern...");
    
    const fetchFunction = async () => {
        console.log("  🔍 Function executed (cache miss)");
        return { data: "Fresh data", fetched: new Date().toISOString() };
    };
    
    // First call - cache miss
    console.log("First call (should execute function):");
    const result1 = await cache.getOrSet("test:expensive", fetchFunction, 60);
    console.log("  Result:", result1);
    
    // Second call - cache hit
    console.log("\nSecond call (should use cache):");
    const result2 = await cache.getOrSet("test:expensive", fetchFunction, 60);
    console.log("  Result:", result2);
    
    // Test cache invalidation
    console.log("\n🗑️ Testing cache invalidation...");
    await cache.delPattern("test:*");
    console.log("✅ Deleted all test:* keys");
    
    // Show final cache status
    console.log("\n📊 Final Cache Status:");
    console.log(cache.getCacheStatus());
    
    console.log("\n🎉 Cache service test completed!");
}

testCacheService().catch(console.error);
