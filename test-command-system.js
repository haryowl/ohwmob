#!/usr/bin/env node

/**
 * Test Script for Galileosky Command System (CORRECTED)
 * Tests command packet generation and API endpoints using actual Galileosky protocol
 */

const net = require('net');
const http = require('http');

// Command packet builder (CORRECTED for actual Galileosky protocol)
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

    // Build command packet according to Galileosky protocol
    buildCommandPacket(targetIMEI, deviceNumber, commandText, commandNumber = null) {
        // Generate random command number if not provided
        if (commandNumber === null) {
            commandNumber = Math.floor(Math.random() * 0xFFFFFFFF);
        }
        
        // Convert command text to CP1251 encoding (simplified - using ASCII for now)
        const commandBuffer = Buffer.from(commandText, 'ascii');
        
        // Build packet structure:
        // 01 [LENGTH] 03 [IMEI-15bytes] 04 [DEVICE-NUMBER-2bytes] E0 [COMMAND-NUMBER-4bytes] E1 [COMMAND-LENGTH-1byte] [COMMAND-TEXT] [CHECKSUM]
        
        let packet = Buffer.alloc(0);
        
        // Header (0x01)
        const headerBuffer = Buffer.alloc(1);
        headerBuffer.writeUInt8(0x01, 0);
        packet = Buffer.concat([packet, headerBuffer]);
        
        // Length placeholder (will be calculated later)
        const lengthBuffer = Buffer.alloc(2);
        packet = Buffer.concat([packet, lengthBuffer]);
        
        // Tag 0x03 - IMEI (15 bytes)
        const tag03Buffer = Buffer.alloc(1);
        tag03Buffer.writeUInt8(0x03, 0);
        packet = Buffer.concat([packet, tag03Buffer]);
        
        const imeiBuffer = Buffer.alloc(15);
        imeiBuffer.write(targetIMEI, 0, 15, 'ascii');
        packet = Buffer.concat([packet, imeiBuffer]);
        
        // Tag 0x04 - Device Number (2 bytes)
        const tag04Buffer = Buffer.alloc(1);
        tag04Buffer.writeUInt8(0x04, 0);
        packet = Buffer.concat([packet, tag04Buffer]);
        
        const deviceNumberBuffer = Buffer.alloc(2);
        deviceNumberBuffer.writeUInt16LE(deviceNumber, 0);
        packet = Buffer.concat([packet, deviceNumberBuffer]);
        
        // Tag 0xE0 - Command Number (4 bytes)
        const tagE0Buffer = Buffer.alloc(1);
        tagE0Buffer.writeUInt8(0xE0, 0);
        packet = Buffer.concat([packet, tagE0Buffer]);
        
        const commandNumberBuffer = Buffer.alloc(4);
        commandNumberBuffer.writeUInt32LE(commandNumber, 0);
        packet = Buffer.concat([packet, commandNumberBuffer]);
        
        // Tag 0xE1 - Command Text
        const tagE1Buffer = Buffer.alloc(1);
        tagE1Buffer.writeUInt8(0xE1, 0);
        packet = Buffer.concat([packet, tagE1Buffer]);
        
        // Command length (1 byte)
        const commandLengthBuffer = Buffer.alloc(1);
        commandLengthBuffer.writeUInt8(commandBuffer.length, 0);
        packet = Buffer.concat([packet, commandLengthBuffer]);
        
        // Command text
        packet = Buffer.concat([packet, commandBuffer]);
        
        // Calculate and update length (excluding header and length field itself)
        const dataLength = packet.length - 3; // Header(1) + Length(2)
        packet.writeUInt16LE(dataLength, 1);
        
        // Calculate and add CRC
        const crc = this.calculateCRC16(packet);
        const crcBuffer = Buffer.alloc(2);
        crcBuffer.writeUInt16LE(crc, 0);
        packet = Buffer.concat([packet, crcBuffer]);
        
        return packet;
    }

    // Parse response packet
    parseResponsePacket(data) {
        try {
            if (data.length < 5) {
                return { valid: false, error: 'Packet too short' };
            }
            
            const header = data.readUInt8(0);
            if (header !== 0x01) {
                return { valid: false, error: 'Invalid header (should be 0x01)' };
            }
            
            const length = data.readUInt16LE(1);
            if (data.length !== length + 3) { // Header(1) + Length(2) + Data + CRC(2)
                return { valid: false, error: 'Length mismatch' };
            }
            
            // Extract IMEI (tag 0x03)
            let imei = '';
            let deviceNumber = 0;
            let commandNumber = 0;
            let replyText = '';
            let additionalData = null;
            
            let offset = 3; // Skip header and length
            
            while (offset < data.length - 2) { // -2 for CRC
                const tag = data.readUInt8(offset);
                offset++;
                
                switch (tag) {
                    case 0x03: // IMEI
                        imei = data.slice(offset, offset + 15).toString('ascii');
                        offset += 15;
                        break;
                        
                    case 0x04: // Device Number
                        deviceNumber = data.readUInt16LE(offset);
                        offset += 2;
                        break;
                        
                    case 0xE0: // Command Number
                        commandNumber = data.readUInt32LE(offset);
                        offset += 4;
                        break;
                        
                    case 0xE1: // Reply Text
                        const replyLength = data.readUInt8(offset);
                        offset++;
                        replyText = data.slice(offset, offset + replyLength).toString('ascii');
                        offset += replyLength;
                        break;
                        
                    case 0xEB: // Additional Data
                        const dataLength = data.readUInt8(offset);
                        offset++;
                        additionalData = data.slice(offset, offset + dataLength);
                        offset += dataLength;
                        break;
                        
                    default:
                        // Skip unknown tag
                        offset++;
                        break;
                }
            }
            
            // Validate CRC
            const dataWithoutCRC = data.slice(0, data.length - 2);
            const calculatedCRC = this.calculateCRC16(dataWithoutCRC);
            const packetCRC = data.readUInt16LE(data.length - 2);
            
            if (calculatedCRC !== packetCRC) {
                return { valid: false, error: 'CRC mismatch' };
            }
            
            return {
                valid: true,
                imei: imei,
                deviceNumber: deviceNumber,
                commandNumber: commandNumber,
                replyText: replyText,
                additionalData: additionalData
            };
            
        } catch (error) {
            return { valid: false, error: error.message };
        }
    }
}

// Test constants
const TEST_IMEI = '861774058687730';
const TEST_DEVICE_NUMBER = 0;

console.log('🧪 ========================================');
console.log('🧪 GALILEOSKY COMMAND SYSTEM TEST (CORRECTED)');
console.log('🧪 ========================================');

// Test 1: Command Packet Generation
console.log('\n📦 Test 1: Command Packet Generation');
console.log('=====================================');

const commandBuilder = new CommandPacketBuilder();

// Test different command types
const testCommands = [
    { name: 'STATUS', command: 'status' },
    { name: 'RESET', command: 'reset' },
    { name: 'EMERGENCY_STOP', command: 'emergency' },
    { name: 'SET_OUTPUT', command: 'setoutput 15' },
    { name: 'GET_CONFIG', command: 'getconfig' }
];

testCommands.forEach(cmd => {
    const packet = commandBuilder.buildCommandPacket(TEST_IMEI, TEST_DEVICE_NUMBER, cmd.command);
    
    console.log(`\n${cmd.name} Command:`);
    console.log(`  Command: "${cmd.command}"`);
    console.log(`  Target: ${TEST_IMEI}`);
    console.log(`  Device Number: ${TEST_DEVICE_NUMBER}`);
    console.log(`  Packet: ${packet.toString('hex').toUpperCase()}`);
    console.log(`  Length: ${packet.length} bytes`);
    
    // Validate packet structure
    const header = packet.readUInt8(0);
    const length = packet.readUInt16LE(1);
    const dataLength = packet.length - 5; // Header(1) + Length(2) + CRC(2)
    
    console.log(`  Header: 0x${header.toString(16).padStart(2, '0')} (should be 0x01)`);
    console.log(`  Length field: ${length} (should be ${dataLength})`);
    console.log(`  ✅ ${header === 0x01 ? 'PASS' : 'FAIL'}: Header is 0x01`);
    console.log(`  ✅ ${length === dataLength ? 'PASS' : 'FAIL'}: Length matches data`);
    
    // Parse packet structure
    let offset = 3; // Skip header and length
    const tag03 = packet.readUInt8(offset);
    offset++;
    const imei = packet.slice(offset, offset + 15).toString('ascii');
    offset += 15;
    const tag04 = packet.readUInt8(offset);
    offset++;
    const deviceNum = packet.readUInt16LE(offset);
    offset += 2;
    const tagE0 = packet.readUInt8(offset);
    offset++;
    const cmdNum = packet.readUInt32LE(offset);
    offset += 4;
    const tagE1 = packet.readUInt8(offset);
    offset++;
    const cmdLen = packet.readUInt8(offset);
    offset++;
    const cmdText = packet.slice(offset, offset + cmdLen).toString('ascii');
    
    console.log(`  Tag 0x03: 0x${tag03.toString(16).padStart(2, '0')} (IMEI)`);
    console.log(`  IMEI: ${imei}`);
    console.log(`  Tag 0x04: 0x${tag04.toString(16).padStart(2, '0')} (Device Number)`);
    console.log(`  Device Number: ${deviceNum}`);
    console.log(`  Tag 0xE0: 0x${tagE0.toString(16).padStart(2, '0')} (Command Number)`);
    console.log(`  Command Number: ${cmdNum}`);
    console.log(`  Tag 0xE1: 0x${tagE1.toString(16).padStart(2, '0')} (Command Text)`);
    console.log(`  Command Text: "${cmdText}"`);
});

// Test 2: Mock TCP Server for Command Testing
console.log('\n\n🌐 Test 2: Mock TCP Server');
console.log('==========================');

const mockServer = net.createServer((socket) => {
    console.log('🔌 Mock device connected');
    
    socket.on('data', (data) => {
        console.log(`📥 Received data: ${data.toString('hex').toUpperCase()}`);
        
        // Parse received command
        if (data.length >= 3) {
            const header = data.readUInt8(0);
            const length = data.readUInt16LE(1);
            
            console.log(`  Header: 0x${header.toString(16).padStart(2, '0')}`);
            console.log(`  Length: ${length}`);
            
            if (header === 0x01) {
                console.log('  ✅ Galileosky command packet received!');
                
                // Parse the command packet
                const parsed = commandBuilder.parseResponsePacket(data);
                if (parsed.valid) {
                    console.log(`  IMEI: ${parsed.imei}`);
                    console.log(`  Device Number: ${parsed.deviceNumber}`);
                    console.log(`  Command Number: ${parsed.commandNumber}`);
                    console.log(`  Command Text: "${parsed.replyText}"`);
                }
                
                // Send mock response (status response)
                const responsePacket = commandBuilder.buildCommandPacket(
                    TEST_IMEI, 
                    TEST_DEVICE_NUMBER, 
                    'Dev50 Soft=223 Pack=116 TmDt=00:24:14 1.01.00 Per=10 Nav=255 Lat=0.000000 Lon=0.000000 Spd=0.0 HDOP=0.0 SatCnt=0 A=0.00',
                    0
                );
                socket.write(responsePacket);
                console.log(`📤 Sent mock response: ${responsePacket.toString('hex').toUpperCase()}`);
            }
        }
    });
    
    socket.on('close', () => {
        console.log('🔌 Mock device disconnected');
    });
});

// Test 3: API Endpoint Testing
console.log('\n\n🔗 Test 3: API Endpoint Testing');
console.log('===============================');

function testAPIEndpoint(endpoint, method, data) {
    return new Promise((resolve, reject) => {
        const postData = data ? JSON.stringify(data) : '';
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: endpoint,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        const req = http.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const response = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: response });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

// Start mock server
mockServer.listen(3004, () => {
    console.log('🚀 Mock device server listening on port 3004');
    
    // Test command sending to mock device
    setTimeout(async () => {
        console.log('\n📤 Testing command sending to mock device...');
        
        const client = new net.Socket();
        
        client.connect(3004, 'localhost', () => {
            console.log('🔌 Connected to mock device');
            
            // Send test command
            const testPacket = commandBuilder.buildCommandPacket(
                TEST_IMEI, 
                TEST_DEVICE_NUMBER, 
                'status'
            );
            
            client.write(testPacket);
            console.log(`📤 Sent command: ${testPacket.toString('hex').toUpperCase()}`);
        });
        
        client.on('data', (data) => {
            console.log(`📥 Received response: ${data.toString('hex').toUpperCase()}`);
            
            // Parse response
            const parsed = commandBuilder.parseResponsePacket(data);
            if (parsed.valid) {
                console.log('✅ Valid response packet received!');
                console.log(`  Reply: "${parsed.replyText}"`);
            } else {
                console.log('❌ Invalid response packet');
            }
            
            client.destroy();
        });
        
        client.on('close', () => {
            console.log('🔌 Connection closed');
            
            // Test API endpoints
            setTimeout(async () => {
                console.log('\n🔗 Testing API endpoints...');
                
                try {
                    // Test connected devices endpoint
                    const devicesResponse = await testAPIEndpoint('/api/connected-devices', 'GET');
                    console.log('Connected devices response:', devicesResponse);
                    
                    // Test command endpoint (will fail if no real devices connected)
                    const commandResponse = await testAPIEndpoint('/api/command', 'POST', {
                        deviceIMEI: TEST_IMEI,
                        deviceNumber: TEST_DEVICE_NUMBER,
                        commandText: 'status'
                    });
                    console.log('Command response:', commandResponse);
                    
                } catch (error) {
                    console.log('API test error (expected if server not running):', error.message);
                }
                
                // Cleanup
                mockServer.close();
                console.log('\n✅ Testing completed!');
            }, 1000);
        });
        
    }, 1000);
});

// Test 4: Packet Validation
console.log('\n\n🔍 Test 4: Packet Validation');
console.log('============================');

function validateCommandPacket(packet) {
    if (packet.length < 5) {
        return { valid: false, error: 'Packet too short' };
    }
    
    const header = packet.readUInt8(0);
    if (header !== 0x01) {
        return { valid: false, error: 'Invalid header (should be 0x01)' };
    }
    
    const length = packet.readUInt16LE(1);
    const expectedDataLength = packet.length - 5; // Header(1) + Length(2) + CRC(2)
    
    if (length !== expectedDataLength) {
        return { valid: false, error: `Length mismatch: expected ${expectedDataLength}, got ${length}` };
    }
    
    // Validate CRC
    const dataWithoutCRC = packet.slice(0, packet.length - 2);
    const calculatedCRC = commandBuilder.calculateCRC16(dataWithoutCRC);
    const packetCRC = packet.readUInt16LE(packet.length - 2);
    
    if (calculatedCRC !== packetCRC) {
        return { valid: false, error: `CRC mismatch: calculated 0x${calculatedCRC.toString(16)}, packet 0x${packetCRC.toString(16)}` };
    }
    
    return { valid: true };
}

// Test packet validation
const testPacket = commandBuilder.buildCommandPacket(TEST_IMEI, TEST_DEVICE_NUMBER, 'status');
const validation = validateCommandPacket(testPacket);

console.log(`Test packet validation: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!validation.valid) {
    console.log(`Error: ${validation.error}`);
}

console.log('\n🎉 All tests completed!');
