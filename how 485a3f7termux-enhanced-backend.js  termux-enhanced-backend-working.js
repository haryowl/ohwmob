[33md392caa[m[33m ([m[1;36mHEAD[m[33m -> [m[1;32mmain[m[33m, [m[1;31morigin/main[m[33m)[m FIX: IMEI detection broken by command protocol - Fixed socket parameter issue and improved IMEI extraction
[33m5f6f91d[m Add Device Commands feature to Unified Interface - Complete Galileosky command system implementation with mobile-friendly UI - Add CommandPacketBuilder class with correct protocol (0x01 header, tag-based structure) - Add device commands tab to unified interface with status, quick commands, and output control - Add comprehensive API endpoints for all command types - Update README with device commands documentation - Add testing scripts and web interface for command testing
[33m485a3f7[m Add SM EXPORT tab with semicolon-delimited format and incomplete record filtering
[33m2e66976[m Add timezone conversion and device datetime filtering for TRACKING HISTORY, DATA EXPORT, and DATA SM tabs
[33m7150c45[m Fix double .pfsl extension in DATA SM export filename
[33m386df36[m Fix DATA SM export: Use custom CSV conversion with proper headers and .pfsl extension
[33mb249164[m Fix: Add device filter population for Tracking History tab - Updated loadExportDevices() to populate historyDeviceFilter - Added Refresh Devices button to Tracking History filters - Now devices will appear in Tracking History device filter dropdown
[33m299637f[m Fix Data SM timestamp to use device datetime instead of server timestamp
[33maf71ed9[m FIX: DATA EXPORT and DATA SM - Properly flatten data and extract values from tags for clean CSV export
[33m651fdfb[m FIX: Correct DATA EXPORT and DATA SM export functions - Use proper API endpoints and data extraction
