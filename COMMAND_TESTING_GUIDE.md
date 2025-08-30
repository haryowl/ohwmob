# 🧪 Galileosky Command System Testing Guide

## 🎯 Overview

This guide provides comprehensive testing strategies for the Galileosky bidirectional command system. The system allows sending commands to Galileosky devices and receiving responses.

## 📋 Testing Levels

### **Level 1: Unit Testing (No Hardware Required)**
### **Level 2: Integration Testing (Mock Devices)**
### **Level 3: Real Device Testing (Hardware Required)**

---

## 🧪 Level 1: Unit Testing

### **1.1 Command Packet Generation Test**

**File:** `test-command-system.js`

**Purpose:** Validate command packet structure and CRC calculation

**Run:**
```bash
node test-command-system.js
```

**Expected Output:**
```
🧪 ========================================
🧪 GALILEOSKY COMMAND SYSTEM TEST
🧪 ========================================

📦 Test 1: Command Packet Generation
=====================================

SET_OUTPUT Command:
  Type: 0x01
  Target: 861774058687730
  Data: {"outputStates":15}
  Packet: 0300120101383631373734303538363837373330000FXXXX
  Length: 22 bytes
  Header: 0x03 (should be 0x03)
  Length field: 18 (should be 18)
  ✅ PASS: Header is 0x03
  ✅ PASS: Length matches data
```

**What to Check:**
- ✅ Header is 0x03 (command packet)
- ✅ Length field matches data length
- ✅ CRC calculation is correct
- ✅ IMEI is properly formatted (15 bytes)

### **1.2 API Endpoint Testing**

**Test the backend API endpoints:**

```bash
# Test connected devices endpoint
curl http://localhost:3001/api/connected-devices

# Test command endpoint (will fail if no devices connected)
curl -X POST http://localhost:3001/api/command \
  -H "Content-Type: application/json" \
  -d '{
    "deviceIMEI": "861774058687730",
    "commandType": 1,
    "commandData": {"outputStates": 15}
  }'
```

**Expected Responses:**
```json
// Connected devices
{
  "devices": [],
  "count": 0
}

// Command (if device connected)
{
  "success": true,
  "message": "Command sent to device 861774058687730",
  "commandType": "0x01",
  "timestamp": "2025-01-XX..."
}
```

---

## 🌐 Level 2: Integration Testing

### **2.1 Mock Device Testing**

**File:** `test-command-system.js` (includes mock server)

**Purpose:** Test command sending and response handling

**Run:**
```bash
node test-command-system.js
```

**What Happens:**
1. Mock TCP server starts on port 3004
2. Test client connects and sends command
3. Mock server receives command and sends confirmation
4. Test validates the communication

**Expected Output:**
```
🌐 Test 2: Mock TCP Server
==========================
🚀 Mock device server listening on port 3004

📤 Testing command sending to mock device...
🔌 Connected to mock device
📤 Sent command: 0300120101383631373734303538363837373330000FXXXX
📥 Received response: 020600
🔌 Connection closed
```

### **2.2 Web Interface Testing**

**File:** `test-command-interface.html`

**Purpose:** Test the web-based command interface

**Access:**
```
http://localhost:3001/test-command-interface.html
```

**Test Steps:**
1. **Connection Test:**
   - Click "🔄 Refresh Status"
   - Should show "✅ Connected to server"

2. **Device Loading:**
   - Click "📱 Load Connected Devices"
   - Should show connected devices or "No devices connected"

3. **Command Sending:**
   - Enter device IMEI
   - Select command type
   - Enter command data
   - Click "📤 Send Command"
   - Check command log for results

---

## 📱 Level 3: Real Device Testing

### **3.1 Manual Command Testing**

**File:** `test-command-manual.js`

**Purpose:** Test commands with real Galileosky devices

**Setup:**
1. Update `TEST_CONFIG` in the script:
```javascript
const TEST_CONFIG = {
    deviceIP: '192.168.1.100',  // Your device IP
    devicePort: 3003,           // Device port
    deviceIMEI: '861774058687730' // Your device IMEI
};
```

2. Ensure device is connected to network

**Run:**
```bash
node test-command-manual.js
```

**Test Commands:**
```
🎯 Available Commands:
1. Set Outputs (0x01)
2. Get Status (0x02)
3. Set Config (0x03)
4. Emergency Stop (0x04)
5. Reset Device (0x05)
6. Force Transmission (0x06)
7. Set Transmission Interval (0x07)
8. Get Config (0x08)
9. Custom Command
0. Exit
```

### **3.2 Real Device Response Validation**

**Expected Device Responses:**

#### **Command Confirmation (0x02):**
```
📥 Received response: 020600
✅ Command confirmation received!
```

#### **Status Update (0x01):**
```
📥 Received response: 01XXXX...
📊 Status update received!
```

#### **Error Response:**
```
📥 Received response: 023F00
❌ Command error or device not supported
```

---

## 🔧 Testing Checklist

### **Pre-Testing Setup:**
- [ ] Server is running (`node termux-enhanced-backend.js`)
- [ ] Device is connected to network
- [ ] Device IP and port are correct
- [ ] Device IMEI is known
- [ ] Network connectivity is verified

### **Unit Tests:**
- [ ] Command packet generation
- [ ] CRC calculation
- [ ] Packet validation
- [ ] API endpoint responses
- [ ] Error handling

### **Integration Tests:**
- [ ] Mock server communication
- [ ] Web interface functionality
- [ ] Command sending/receiving
- [ ] Response parsing
- [ ] Connection management

### **Real Device Tests:**
- [ ] Device connectivity
- [ ] Command transmission
- [ ] Response reception
- [ ] Device behavior changes
- [ ] Error scenarios

---

## 🚨 Troubleshooting

### **Common Issues:**

#### **1. Device Not Reachable**
```
❌ Cannot reach device: connect ECONNREFUSED
```
**Solutions:**
- Check device IP address
- Verify device is powered on
- Check network connectivity
- Verify device port (usually 3003)

#### **2. Command Not Acknowledged**
```
📤 Sent command: 030012...
📥 No response received
```
**Solutions:**
- Check device supports command type
- Verify IMEI is correct
- Check device firmware version
- Try different command types

#### **3. Invalid Response**
```
📥 Received response: 023F00
❌ Command error
```
**Solutions:**
- Check command format
- Verify device capabilities
- Check device configuration
- Try simpler commands first

#### **4. Web Interface Issues**
```
❌ Connection failed: fetch failed
```
**Solutions:**
- Check server is running
- Verify server port (3001)
- Check CORS settings
- Clear browser cache

---

## 📊 Test Results Documentation

### **Test Report Template:**

```markdown
# Command System Test Report

**Date:** [Date]
**Tester:** [Name]
**Device:** [Device Model/IMEI]

## Test Results

### Unit Tests
- [ ] Command packet generation: ✅/❌
- [ ] CRC calculation: ✅/❌
- [ ] API endpoints: ✅/❌

### Integration Tests
- [ ] Mock server: ✅/❌
- [ ] Web interface: ✅/❌

### Real Device Tests
- [ ] Device connectivity: ✅/❌
- [ ] Command 0x01 (Set Output): ✅/❌
- [ ] Command 0x02 (Get Status): ✅/❌
- [ ] Command 0x04 (Emergency Stop): ✅/❌

## Issues Found
1. [Issue description]
2. [Issue description]

## Recommendations
1. [Recommendation]
2. [Recommendation]
```

---

## 🎯 Success Criteria

### **Minimum Viable Testing:**
- ✅ Command packets are correctly formatted
- ✅ CRC calculation is accurate
- ✅ API endpoints respond correctly
- ✅ Mock device communication works
- ✅ Web interface is functional

### **Full Testing:**
- ✅ Real device accepts commands
- ✅ Device responds with confirmations
- ✅ Device behavior changes as expected
- ✅ Error handling works correctly
- ✅ All command types are supported

---

## 🚀 Next Steps

After successful testing:

1. **Integrate into main application**
2. **Add command interface to unified UI**
3. **Implement command scheduling**
4. **Add command logging and history**
5. **Create command templates**
6. **Add batch command support**

---

## 📞 Support

If you encounter issues during testing:

1. **Check the troubleshooting section**
2. **Review device documentation**
3. **Verify network configuration**
4. **Test with simpler commands first**
5. **Contact device manufacturer for protocol details**

**Remember:** The Galileosky protocol may vary between device models and firmware versions. Always test with your specific device configuration.
