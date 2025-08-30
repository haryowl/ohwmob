#!/usr/bin/env node

/**
 * Manual Command Testing Script
 * For testing commands with real Galileosky devices
 */

const net = require('net');
const readline = require('readline');

// Command packet builder
class CommandPacketBuilder {
    constructor() {
        this.commandId = 0;
    }

    calculateCRC16(buffer) {
        let crc = 0xFFFF;
        for (let i = 0; i < buffer.length; i++) {
            crc ^= buffer[i];
            for (let j = 0; j < 8; j++) {
                if (crc & 0x0001) {
                    crc = (crc >> 1) ^ 0xA001;
                } else {
                    crc = crc >> 1;
                }
            }
        }
        return crc;
    }

    buildCommandPacket(commandType, targetIMEI, commandData = {}) {
        this.commandId++;
        
        // Build command data
        let commandPayload = Buffer.alloc(0);
        
        // Add command type
        const typeBuffer = Buffer.alloc(1);
        typeBuffer.writeUInt8(commandType, 0);
        commandPayload = Buffer.concat([commandPayload, typeBuffer]);
        
        // Add target IMEI (15 bytes)
        const imeiBuffer = Buffer.alloc(15);
        imeiBuffer.write(targetIMEI, 0, 15, 'ascii');
        commandPayload = Buffer.concat([commandPayload, imeiBuffer]);
        
        // Add command-specific data
        if (commandData.outputStates !== undefined) {
            const outputBuffer = Buffer.alloc(2);
            outputBuffer.writeUInt16LE(commandData.outputStates, 0);
            commandPayload = Buffer.concat([commandPayload, outputBuffer]);
        }
        
        if (commandData.interval !== undefined) {
            const intervalBuffer = Buffer.alloc(2);
            intervalBuffer.writeUInt16LE(commandData.interval, 0);
            commandPayload = Buffer.concat([commandPayload, intervalBuffer]);
        }
        
        // Build complete packet
        let packet = Buffer.alloc(0);
        
        // Header (0x03 for command packet)
        const headerBuffer = Buffer.alloc(1);
        headerBuffer.writeUInt8(0x03, 0);
        packet = Buffer.concat([packet, headerBuffer]);
        
        // Length (2 bytes)
        const lengthBuffer = Buffer.alloc(2);
        lengthBuffer.writeUInt16LE(commandPayload.length, 0);
        packet = Buffer.concat([packet, lengthBuffer]);
        
        // Command data
        packet = Buffer.concat([packet, commandPayload]);
        
        // Calculate and add CRC
        const crc = this.calculateCRC16(packet);
        const crcBuffer = Buffer.alloc(2);
        crcBuffer.writeUInt16LE(crc, 0);
        packet = Buffer.concat([packet, crcBuffer]);
        
        return packet;
    }
}

// Command types
const COMMAND_TYPES = {
    SET_OUTPUT: 0x01,
    GET_STATUS: 0x02,
    SET_CONFIG: 0x03,
    EMERGENCY_STOP: 0x04,
    RESET_DEVICE: 0x05,
    FORCE_TRANSMISSION: 0x06,
    SET_TRANSMISSION_INTERVAL: 0x07,
    GET_CONFIG: 0x08
};

// Test configuration
const TEST_CONFIG = {
    deviceIP: '192.168.1.100',  // Change to your device IP
    devicePort: 3003,           // Default Galileosky port
    deviceIMEI: '861774058687730' // Change to your device IMEI
};

const commandBuilder = new CommandPacketBuilder();
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('🎮 ========================================');
console.log('🎮 GALILEOSKY MANUAL COMMAND TESTER');
console.log('🎮 ========================================');
console.log(`📱 Target Device: ${TEST_CONFIG.deviceIP}:${TEST_CONFIG.devicePort}`);
console.log(`📱 Device IMEI: ${TEST_CONFIG.deviceIMEI}`);
console.log('');

// Function to send command
function sendCommand(commandType, commandData = {}) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();
        
        client.connect(TEST_CONFIG.devicePort, TEST_CONFIG.deviceIP, () => {
            console.log(`🔌 Connected to ${TEST_CONFIG.deviceIP}:${TEST_CONFIG.devicePort}`);
            
            // Build and send command packet
            const commandPacket = commandBuilder.buildCommandPacket(commandType, TEST_CONFIG.deviceIMEI, commandData);
            
            console.log(`📤 Sending command packet:`);
            console.log(`   Type: 0x${commandType.toString(16).padStart(2, '0')}`);
            console.log(`   Target: ${TEST_CONFIG.deviceIMEI}`);
            console.log(`   Data: ${JSON.stringify(commandData)}`);
            console.log(`   Packet: ${commandPacket.toString('hex').toUpperCase()}`);
            console.log(`   Length: ${commandPacket.length} bytes`);
            
            client.write(commandPacket);
        });
        
        client.on('data', (data) => {
            console.log(`📥 Received response: ${data.toString('hex').toUpperCase()}`);
            
            // Parse response
            if (data.length >= 3) {
                const header = data.readUInt8(0);
                if (header === 0x02) {
                    console.log('✅ Command confirmation received!');
                } else if (header === 0x01) {
                    console.log('📊 Status update received!');
                } else {
                    console.log(`❓ Unknown response type: 0x${header.toString(16)}`);
                }
            }
            
            client.destroy();
            resolve();
        });
        
        client.on('error', (error) => {
            console.error(`❌ Connection error: ${error.message}`);
            client.destroy();
            reject(error);
        });
        
        client.on('close', () => {
            console.log('🔌 Connection closed');
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            console.log('⏰ Command timeout');
            client.destroy();
            resolve();
        }, 10000);
    });
}

// Interactive menu
function showMenu() {
    console.log('\n🎯 Available Commands:');
    console.log('1. Set Outputs (0x01)');
    console.log('2. Get Status (0x02)');
    console.log('3. Set Config (0x03)');
    console.log('4. Emergency Stop (0x04)');
    console.log('5. Reset Device (0x05)');
    console.log('6. Force Transmission (0x06)');
    console.log('7. Set Transmission Interval (0x07)');
    console.log('8. Get Config (0x08)');
    console.log('9. Custom Command');
    console.log('0. Exit');
    console.log('');
}

// Handle menu selection
async function handleMenuSelection(choice) {
    try {
        switch (choice) {
            case '1':
                rl.question('Enter output states (0-15): ', async (outputStates) => {
                    const states = parseInt(outputStates) || 0;
                    await sendCommand(COMMAND_TYPES.SET_OUTPUT, { outputStates: states });
                    showMenu();
                    askForCommand();
                });
                break;
                
            case '2':
                await sendCommand(COMMAND_TYPES.GET_STATUS);
                showMenu();
                askForCommand();
                break;
                
            case '3':
                rl.question('Enter transmission interval (seconds): ', async (interval) => {
                    const seconds = parseInt(interval) || 60;
                    await sendCommand(COMMAND_TYPES.SET_CONFIG, { interval: seconds });
                    showMenu();
                    askForCommand();
                });
                break;
                
            case '4':
                console.log('🚨 Sending emergency stop command...');
                await sendCommand(COMMAND_TYPES.EMERGENCY_STOP);
                showMenu();
                askForCommand();
                break;
                
            case '5':
                console.log('🔄 Sending reset command...');
                await sendCommand(COMMAND_TYPES.RESET_DEVICE);
                showMenu();
                askForCommand();
                break;
                
            case '6':
                await sendCommand(COMMAND_TYPES.FORCE_TRANSMISSION);
                showMenu();
                askForCommand();
                break;
                
            case '7':
                rl.question('Enter transmission interval (seconds): ', async (interval) => {
                    const seconds = parseInt(interval) || 60;
                    await sendCommand(COMMAND_TYPES.SET_TRANSMISSION_INTERVAL, { interval: seconds });
                    showMenu();
                    askForCommand();
                });
                break;
                
            case '8':
                await sendCommand(COMMAND_TYPES.GET_CONFIG);
                showMenu();
                askForCommand();
                break;
                
            case '9':
                rl.question('Enter command type (0x01-0x08): ', async (commandType) => {
                    const type = parseInt(commandType, 16) || 1;
                    rl.question('Enter command data (JSON): ', async (dataStr) => {
                        let data = {};
                        if (dataStr) {
                            try {
                                data = JSON.parse(dataStr);
                            } catch (e) {
                                console.log('Invalid JSON, using empty data');
                            }
                        }
                        await sendCommand(type, data);
                        showMenu();
                        askForCommand();
                    });
                });
                break;
                
            case '0':
                console.log('👋 Goodbye!');
                rl.close();
                process.exit(0);
                break;
                
            default:
                console.log('❌ Invalid choice');
                showMenu();
                askForCommand();
                break;
        }
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        showMenu();
        askForCommand();
    }
}

// Ask for command
function askForCommand() {
    rl.question('Enter your choice (0-9): ', handleMenuSelection);
}

// Start the interactive tester
console.log('🚀 Starting manual command tester...');
console.log('📝 Instructions:');
console.log('   - Make sure your Galileosky device is connected to the network');
console.log('   - Update TEST_CONFIG in the script with your device details');
console.log('   - The device should be listening on the specified port');
console.log('   - Commands will be sent directly to the device');
console.log('');

// Check if device is reachable
const testClient = new net.Socket();
testClient.connect(TEST_CONFIG.devicePort, TEST_CONFIG.deviceIP, () => {
    console.log('✅ Device is reachable!');
    testClient.destroy();
    showMenu();
    askForCommand();
});

testClient.on('error', (error) => {
    console.log(`❌ Cannot reach device: ${error.message}`);
    console.log('   Please check:');
    console.log(`   - Device IP: ${TEST_CONFIG.deviceIP}`);
    console.log(`   - Device Port: ${TEST_CONFIG.devicePort}`);
    console.log('   - Network connectivity');
    console.log('   - Device is powered on and connected');
    console.log('');
    console.log('   You can still test the command generation:');
    showMenu();
    askForCommand();
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    rl.close();
    process.exit(0);
});
