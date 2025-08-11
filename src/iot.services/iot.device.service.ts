// Real-time IoT device integration and management
import { EventEmitter } from 'events';
import CacheService from "../utils/redis.service";

interface IoTDevice {
    id: string;
    type: 'sensor' | 'actuator' | 'camera' | 'weather_station' | 'irrigation_controller';
    location: {
        farmId: string;
        coordinates: { lat: number; lng: number; };
        zone: string;
    };
    status: 'online' | 'offline' | 'maintenance' | 'error';
    lastSeen: string;
    battery?: number;
    firmware_version: string;
    capabilities: string[];
}

interface SensorReading {
    deviceId: string;
    timestamp: string;
    type: string;
    value: number;
    unit: string;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
    metadata?: Record<string, any>;
}

interface DeviceCommand {
    deviceId: string;
    command: string;
    parameters: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'critical';
    scheduledFor?: string;
}

interface AlertRule {
    id: string;
    deviceId: string;
    condition: {
        parameter: string;
        operator: '>' | '<' | '=' | '!=' | 'between';
        value: number | [number, number];
    };
    severity: 'info' | 'warning' | 'critical';
    action: 'notify' | 'auto_correct' | 'emergency_stop';
    enabled: boolean;
}

interface DeviceAutomation {
    id: string;
    name: string;
    trigger: {
        type: 'sensor_reading' | 'time_based' | 'weather_forecast' | 'manual';
        conditions: any[];
    };
    actions: DeviceCommand[];
    enabled: boolean;
}

export class IoTDeviceService extends EventEmitter {
    private static instance: IoTDeviceService;
    private cache: CacheService;
    private devices: Map<string, IoTDevice> = new Map();
    private recentReadings: Map<string, SensorReading[]> = new Map();
    private alertRules: Map<string, AlertRule> = new Map();
    private automations: Map<string, DeviceAutomation> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;

    private constructor() {
        super();
        this.cache = CacheService.getInstance();
        this.startHeartbeatMonitoring();
        this.setupEventHandlers();
    }

    public static getInstance(): IoTDeviceService {
        if (!IoTDeviceService.instance) {
            IoTDeviceService.instance = new IoTDeviceService();
        }
        return IoTDeviceService.instance;
    }

    /**
     * Device Registration and Management
     */
    public async registerDevice(device: Omit<IoTDevice, 'lastSeen'>): Promise<boolean> {
        try {
            const fullDevice: IoTDevice = {
                ...device,
                lastSeen: new Date().toISOString()
            };

            this.devices.set(device.id, fullDevice);
            await this.cache.set(`device:${device.id}`, JSON.stringify(fullDevice), 86400);

            this.emit('device:registered', fullDevice);
            console.log(`📱 Device registered: ${device.id} (${device.type})`);
            
            return true;
        } catch (error) {
            console.error('Failed to register device:', error);
            return false;
        }
    }

    public async getDevice(deviceId: string): Promise<IoTDevice | null> {
        try {
            // Try memory first
            if (this.devices.has(deviceId)) {
                return this.devices.get(deviceId)!;
            }

            // Try cache
            const cached = await this.cache.get(`device:${deviceId}`);
            if (cached) {
                const device = JSON.parse(cached) as IoTDevice;
                this.devices.set(deviceId, device);
                return device;
            }

            return null;
        } catch (error) {
            console.error('Failed to get device:', error);
            return null;
        }
    }

    public async getFarmDevices(farmId: string): Promise<IoTDevice[]> {
        try {
            const cacheKey = `farm:devices:${farmId}`;
            
            return await this.cache.getOrSet(cacheKey, async () => {
                const farmDevices: IoTDevice[] = [];
                
                for (const device of this.devices.values()) {
                    if (device.location.farmId === farmId) {
                        farmDevices.push(device);
                    }
                }

                return farmDevices;
            }, 300); // Cache for 5 minutes
        } catch (error) {
            console.error('Failed to get farm devices:', error);
            return [];
        }
    }

    /**
     * Sensor Data Processing
     */
    public async processSensorReading(reading: SensorReading): Promise<void> {
        try {
            // Store reading
            if (!this.recentReadings.has(reading.deviceId)) {
                this.recentReadings.set(reading.deviceId, []);
            }

            const deviceReadings = this.recentReadings.get(reading.deviceId)!;
            deviceReadings.push(reading);

            // Keep only last 100 readings per device
            if (deviceReadings.length > 100) {
                deviceReadings.shift();
            }

            // Cache recent reading
            await this.cache.set(
                `reading:${reading.deviceId}:latest`, 
                JSON.stringify(reading), 
                3600
            );

            // Update device status
            const device = await this.getDevice(reading.deviceId);
            if (device) {
                device.lastSeen = reading.timestamp;
                device.status = 'online';
                await this.cache.set(`device:${device.id}`, JSON.stringify(device), 86400);
            }

            // Check alert rules
            await this.checkAlertRules(reading);

            // Trigger automations
            await this.processAutomations(reading);

            // Emit event for real-time updates
            this.emit('sensor:reading', reading);

            console.log(`📊 Sensor reading processed: ${reading.deviceId} - ${reading.type}: ${reading.value}${reading.unit}`);
        } catch (error) {
            console.error('Failed to process sensor reading:', error);
        }
    }

    public async getSensorHistory(deviceId: string, hours: number = 24): Promise<SensorReading[]> {
        try {
            const cacheKey = `history:${deviceId}:${hours}h`;
            
            return await this.cache.getOrSet(cacheKey, async () => {
                const readings = this.recentReadings.get(deviceId) || [];
                const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
                
                return readings.filter(reading => 
                    new Date(reading.timestamp) > cutoff
                );
            }, 1800); // Cache for 30 minutes
        } catch (error) {
            console.error('Failed to get sensor history:', error);
            return [];
        }
    }

    /**
     * Device Control and Commands
     */
    public async sendCommand(command: DeviceCommand): Promise<boolean> {
        try {
            const device = await this.getDevice(command.deviceId);
            if (!device) {
                throw new Error(`Device ${command.deviceId} not found`);
            }

            if (device.status !== 'online') {
                throw new Error(`Device ${command.deviceId} is not online`);
            }

            // Queue command for delivery
            await this.cache.set(
                `command:${command.deviceId}:${Date.now()}`, 
                JSON.stringify(command), 
                3600
            );

            // Simulate command execution
            await this.executeCommand(command);

            this.emit('device:command_sent', command);
            console.log(`📤 Command sent to ${command.deviceId}: ${command.command}`);
            
            return true;
        } catch (error) {
            console.error('Failed to send command:', error);
            return false;
        }
    }

    private async executeCommand(command: DeviceCommand): Promise<void> {
        // Simulate command execution
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate different command types
        switch (command.command) {
            case 'start_irrigation':
                console.log(`💧 Starting irrigation on device ${command.deviceId}`);
                break;
            case 'stop_irrigation':
                console.log(`💧 Stopping irrigation on device ${command.deviceId}`);
                break;
            case 'take_photo':
                console.log(`📸 Taking photo with device ${command.deviceId}`);
                break;
            case 'adjust_lighting':
                console.log(`💡 Adjusting lighting on device ${command.deviceId}`);
                break;
            default:
                console.log(`⚙️ Executing command ${command.command} on device ${command.deviceId}`);
        }

        this.emit('device:command_executed', command);
    }

    /**
     * Alert Rules Management
     */
    public async addAlertRule(rule: AlertRule): Promise<void> {
        this.alertRules.set(rule.id, rule);
        await this.cache.set(`alert_rule:${rule.id}`, JSON.stringify(rule), 86400 * 7);
        console.log(`🚨 Alert rule added: ${rule.id}`);
    }

    private async checkAlertRules(reading: SensorReading): Promise<void> {
        try {
            for (const rule of this.alertRules.values()) {
                if (rule.deviceId !== reading.deviceId || !rule.enabled) continue;

                const isTriggered = this.evaluateCondition(reading, rule.condition);
                
                if (isTriggered) {
                    await this.triggerAlert(rule, reading);
                }
            }
        } catch (error) {
            console.error('Failed to check alert rules:', error);
        }
    }

    private evaluateCondition(reading: SensorReading, condition: AlertRule['condition']): boolean {
        if (reading.type !== condition.parameter) return false;

        switch (condition.operator) {
            case '>':
                return reading.value > (condition.value as number);
            case '<':
                return reading.value < (condition.value as number);
            case '=':
                return reading.value === (condition.value as number);
            case '!=':
                return reading.value !== (condition.value as number);
            case 'between':
                const [min, max] = condition.value as [number, number];
                return reading.value >= min && reading.value <= max;
            default:
                return false;
        }
    }

    private async triggerAlert(rule: AlertRule, reading: SensorReading): Promise<void> {
        const alert = {
            id: `alert_${Date.now()}`,
            ruleId: rule.id,
            deviceId: rule.deviceId,
            severity: rule.severity,
            message: `${reading.type} value ${reading.value}${reading.unit} triggered alert rule`,
            timestamp: new Date().toISOString(),
            reading
        };

        // Store alert
        await this.cache.set(`alert:${alert.id}`, JSON.stringify(alert), 86400 * 30);

        // Execute action
        switch (rule.action) {
            case 'notify':
                this.emit('device:alert', alert);
                break;
            case 'auto_correct':
                await this.executeAutoCorrection(rule, reading);
                break;
            case 'emergency_stop':
                await this.executeEmergencyStop(rule.deviceId);
                break;
        }

        console.log(`🚨 Alert triggered: ${alert.message}`);
    }

    private async executeAutoCorrection(rule: AlertRule, reading: SensorReading): Promise<void> {
        // Implement auto-correction logic based on the alert
        console.log(`🔧 Auto-correcting issue for device ${rule.deviceId}`);
    }

    private async executeEmergencyStop(deviceId: string): Promise<void> {
        await this.sendCommand({
            deviceId,
            command: 'emergency_stop',
            parameters: {},
            priority: 'critical'
        });
    }

    /**
     * Automation System
     */
    public async addAutomation(automation: DeviceAutomation): Promise<void> {
        this.automations.set(automation.id, automation);
        await this.cache.set(`automation:${automation.id}`, JSON.stringify(automation), 86400 * 7);
        console.log(`🤖 Automation added: ${automation.name}`);
    }

    private async processAutomations(reading: SensorReading): Promise<void> {
        try {
            for (const automation of this.automations.values()) {
                if (!automation.enabled) continue;

                const shouldTrigger = await this.evaluateAutomationTrigger(automation, reading);
                
                if (shouldTrigger) {
                    await this.executeAutomation(automation);
                }
            }
        } catch (error) {
            console.error('Failed to process automations:', error);
        }
    }

    private async evaluateAutomationTrigger(automation: DeviceAutomation, reading: SensorReading): Promise<boolean> {
        // Simplified trigger evaluation
        if (automation.trigger.type === 'sensor_reading') {
            // Check if any condition matches the reading
            return automation.trigger.conditions.some((condition: any) => 
                condition.deviceId === reading.deviceId && 
                condition.parameter === reading.type
            );
        }
        
        return false;
    }

    private async executeAutomation(automation: DeviceAutomation): Promise<void> {
        console.log(`🤖 Executing automation: ${automation.name}`);
        
        for (const action of automation.actions) {
            await this.sendCommand(action);
        }

        this.emit('automation:executed', automation);
    }

    /**
     * Device Health Monitoring
     */
    private startHeartbeatMonitoring(): void {
        this.heartbeatInterval = setInterval(async () => {
            await this.checkDeviceHealth();
        }, 60000); // Check every minute
    }

    private async checkDeviceHealth(): Promise<void> {
        try {
            const now = new Date();
            const threshold = 5 * 60 * 1000; // 5 minutes

            for (const device of this.devices.values()) {
                const lastSeen = new Date(device.lastSeen);
                const timeDiff = now.getTime() - lastSeen.getTime();

                if (timeDiff > threshold && device.status === 'online') {
                    device.status = 'offline';
                    await this.cache.set(`device:${device.id}`, JSON.stringify(device), 86400);
                    
                    this.emit('device:offline', device);
                    console.log(`📱 Device went offline: ${device.id}`);
                }
            }
        } catch (error) {
            console.error('Failed to check device health:', error);
        }
    }

    private setupEventHandlers(): void {
        this.on('device:alert', (alert) => {
            console.log(`🚨 ALERT: ${alert.message}`);
        });

        this.on('device:offline', (device) => {
            console.log(`📱 Device ${device.id} is now offline`);
        });
    }

    /**
     * Analytics and Insights
     */
    public async getDeviceAnalytics(farmId: string): Promise<any> {
        try {
            const cacheKey = `analytics:devices:${farmId}`;
            
            return await this.cache.getOrSet(cacheKey, async () => {
                const devices = await this.getFarmDevices(farmId);
                
                const analytics = {
                    total_devices: devices.length,
                    online_devices: devices.filter(d => d.status === 'online').length,
                    device_types: this.groupDevicesByType(devices),
                    battery_status: this.analyzeBatteryStatus(devices),
                    recent_alerts: await this.getRecentAlerts(farmId),
                    uptime_stats: this.calculateUptimeStats(devices)
                };

                return analytics;
            }, 300); // Cache for 5 minutes
        } catch (error) {
            console.error('Failed to get device analytics:', error);
            return null;
        }
    }

    private groupDevicesByType(devices: IoTDevice[]): Record<string, number> {
        return devices.reduce((acc, device) => {
            acc[device.type] = (acc[device.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }

    private analyzeBatteryStatus(devices: IoTDevice[]): any {
        const withBattery = devices.filter(d => d.battery !== undefined);
        
        if (withBattery.length === 0) return { no_battery_devices: devices.length };

        const lowBattery = withBattery.filter(d => d.battery! < 20);
        const averageBattery = withBattery.reduce((sum, d) => sum + d.battery!, 0) / withBattery.length;

        return {
            devices_with_battery: withBattery.length,
            low_battery_devices: lowBattery.length,
            average_battery: Math.round(averageBattery)
        };
    }

    private async getRecentAlerts(farmId: string): Promise<any[]> {
        // Simplified - would normally query stored alerts
        return [];
    }

    private calculateUptimeStats(devices: IoTDevice[]): any {
        const onlineDevices = devices.filter(d => d.status === 'online').length;
        const uptime = devices.length > 0 ? (onlineDevices / devices.length) * 100 : 0;

        return {
            overall_uptime: Math.round(uptime),
            online_devices: onlineDevices,
            total_devices: devices.length
        };
    }

    public shutdown(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.removeAllListeners();
    }
}

export default IoTDeviceService;
