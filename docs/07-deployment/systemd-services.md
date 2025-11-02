# SystemD Service Patterns for DenoGenesis Framework

**AI-Augmented Development Documentation**  
**Version:** 1.0  
**Framework:** DenoGenesis v2.1+  
**Purpose:** Standardized patterns for creating systemd services in multi-site Deno applications

---

## 🎯 **Pattern Overview**

This documentation defines repeatable patterns for creating systemd services within the DenoGenesis framework ecosystem. These patterns ensure consistency, security, and reliability across all deployed sites.

### **Core Philosophy**
- **Consistency:** All services follow identical structural patterns
- **Security:** Defense-in-depth security hardening
- **Reliability:** Robust restart and failure handling
- **Observability:** Comprehensive logging and monitoring
- **Scalability:** Resource limits and dependency management

---

## 🏗️ **Service Architecture Pattern**

### **Directory Structure Convention**
```
/etc/systemd/system/
├── pedromdominguez.service     # Port 3003, Site Key: pedromdominguez-com
├── heavenlyroofing.service     # Port 3001, Site Key: heavenlyroofing  
├── okdevs.service             # Port 3002, Site Key: okdevs
├── domtech.service            # Port 3000, Site Key: domtech
└── efficientmovers.service    # Port 3004, Site Key: efficientmovers
```

### **Service Working Directories**
```
/home/admin/deno-genesis/sites/
├── pedromdominguez-com/       # Main portfolio site
├── heavenlyroofingok-com/     # Roofing business site  
├── okdevs-xyz/                # Developer community
├── domingueztechsolutions-com/ # Tech solutions business
└── efficientmoversllc-com/    # Moving services business
```

---

## 📋 **SystemD Unit File Pattern**

### **Template Structure**
```ini
# =============================================================================
# [SERVICE_NAME] - SYSTEMD SERVICE UNIT
# =============================================================================
[Unit]
Description=[BUSINESS_DESCRIPTION]
Documentation=[WEBSITE_URL]
After=network.target mysql.service nginx.service
Wants=network-online.target
Requires=mysql.service

[Service]
Type=simple
User=admin
Group=admin
WorkingDirectory=[SITE_WORKING_DIRECTORY]
Environment=DENO_ENV=production
Environment=PORT=[SERVICE_PORT]
Environment=DB_HOST=localhost
Environment=DB_USER=webadmin
Environment=DB_PASSWORD=Password123!
Environment=DB_NAME=universal_db
Environment=SITE_KEY=[SITE_KEY]

ExecStart=/home/admin/.deno/bin/deno run \
  --allow-net \
  --allow-read \
  --allow-write \
  --allow-env \
  --allow-run \
  --unstable \
  --lock=deno.lock \
  --cached-only \
  main.ts

Restart=on-failure
RestartSec=[RESTART_DELAY]
StartLimitBurst=3
StartLimitInterval=60

LimitNOFILE=65536
LimitNPROC=4096

NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=[SITE_WORKING_DIRECTORY]
ReadWritePaths=/tmp
ReadWritePaths=/var/log

KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
TimeoutStartSec=60

StandardOutput=journal
StandardError=journal
SyslogIdentifier=[SERVICE_IDENTIFIER]

[Install]
WantedBy=multi-user.target
Alias=[SERVICE_NAME].service
```

---

## 🔧 **Configuration Patterns**

### **Port Assignment Strategy**
| Service | Port | Business Domain | Site Key |
|---------|------|----------------|----------|
| domtech | 3000 | Tech Solutions | domtech |
| heavenlyroofing | 3001 | Roofing Services | heavenlyroofing |
| okdevs | 3002 | Developer Community | okdevs |
| pedromdominguez | 3003 | Portfolio/Personal | pedromdominguez-com |
| efficientmovers | 3004 | Moving Services | efficientmovers |

### **Restart Timing Pattern**
```ini
# Staggered restart delays to prevent resource conflicts
RestartSec=10   # domtech (base service)
RestartSec=12   # okdevs (+2 seconds)  
RestartSec=15   # heavenlyroofing (+5 seconds)
RestartSec=10   # pedromdominguez (base)
RestartSec=18   # efficientmovers (+8 seconds)
```

### **Environment Variables Pattern**
```ini
# Standard environment for all DenoGenesis services
Environment=DENO_ENV=production
Environment=PORT=[UNIQUE_PORT]
Environment=DB_HOST=localhost
Environment=DB_USER=webadmin
Environment=DB_PASSWORD=Password123!
Environment=DB_NAME=universal_db
Environment=SITE_KEY=[UNIQUE_SITE_KEY]
```

---

## 🔒 **Security Hardening Patterns**

### **Process Security**
```ini
# Prevent privilege escalation
NoNewPrivileges=yes

# Isolated temporary directory
PrivateTmp=yes

# Read-only root filesystem
ProtectSystem=strict

# Deny access to /home directories (except specified paths)
ProtectHome=yes
```

### **File System Access Control**
```ini
# Minimal write access - only to necessary directories
ReadWritePaths=[SITE_WORKING_DIRECTORY]
ReadWritePaths=/tmp
ReadWritePaths=/var/log
```

### **Resource Limits Pattern**
```ini
# File descriptor limits (handles concurrent connections)
LimitNOFILE=65536

# Process limits (prevents fork bombs)
LimitNPROC=4096
```

---

## ⚡ **Process Management Patterns**

### **Graceful Shutdown Pattern**
```ini
# Mixed kill mode: SIGTERM to main process, SIGKILL to remaining
KillMode=mixed

# Initial termination signal
KillSignal=SIGTERM

# Allow 30 seconds for graceful shutdown
TimeoutStopSec=30

# Allow 60 seconds for startup
TimeoutStartSec=60
```

### **Failure Recovery Pattern**
```ini
# Restart only on failure (not on successful exit)
Restart=on-failure

# Wait before restarting (prevents rapid cycling)
RestartSec=[STAGGERED_DELAY]

# Limit restart attempts
StartLimitBurst=3
StartLimitInterval=60
```

---

## 📊 **Logging & Observability Patterns**

### **Journal Integration Pattern**
```ini
# Send stdout to systemd journal
StandardOutput=journal

# Send stderr to systemd journal  
StandardError=journal

# Unique identifier for log filtering
SyslogIdentifier=[SERVICE_NAME]
```

### **Log Monitoring Commands**
```bash
# Real-time log monitoring
sudo journalctl -u [SERVICE_NAME].service -f

# Recent logs with context
sudo journalctl -u [SERVICE_NAME].service -n 50

# Logs since boot
sudo journalctl -u [SERVICE_NAME].service -b

# Multi-service monitoring
sudo journalctl -u pedromdominguez.service -u heavenlyroofing.service -f
```

---

## 🔗 **Dependency Management Patterns**

### **Service Dependencies**
```ini
# Wait for network and required services
After=network.target mysql.service nginx.service

# Prefer network-online over basic network
Wants=network-online.target

# Hard dependency - fail if MySQL unavailable
Requires=mysql.service
```

### **Service Ordering Strategy**
1. **Infrastructure Services** (MySQL, Nginx)
2. **Core Application Services** (pedromdominguez)
3. **Business Services** (heavenlyroofing, domtech)
4. **Community Services** (okdevs)
5. **Auxiliary Services** (efficientmovers)

---

## 🤖 **AI Prompt Patterns**

### **Service Generation Prompt**
```
Create a systemd service unit for [SERVICE_NAME] following DenoGenesis patterns:

Required Information:
- Service Name: [SERVICE_NAME]
- Business Description: [DESCRIPTION]
- Port: [PORT_NUMBER]
- Site Key: [SITE_KEY]
- Domain: [DOMAIN_NAME]
- Working Directory: /home/admin/deno-genesis/sites/[DIRECTORY_NAME]

Apply these patterns:
- Standard DenoGenesis security hardening
- Appropriate restart delays (staggered)
- MySQL and nginx dependencies
- Resource limits (65536 file descriptors, 4096 processes)
- Journal logging with unique SyslogIdentifier
- Production environment variables
```

### **Service Validation Prompt**
```
Validate this systemd service against DenoGenesis patterns:

Check for:
- Correct port assignment (avoid conflicts)
- Proper working directory path
- Security hardening (NoNewPrivileges, ProtectSystem, etc.)
- Resource limits within acceptable ranges
- Appropriate restart configuration
- Environment variables matching framework requirements
- Dependency declarations (MySQL, nginx)
- Journal logging configuration
```

---

## 📝 **Service Creation Workflow**

### **Step 1: Information Gathering**
```bash
# Required information checklist:
SERVICE_NAME="[unique-service-name]"
PORT="[unique-port-3000-3004]" 
SITE_KEY="[unique-site-identifier]"
DOMAIN="[primary-domain.com]"
BUSINESS_DESC="[brief-business-description]"
WORKING_DIR="/home/admin/deno-genesis/sites/[directory-name]"
```

### **Step 2: Service File Generation**
```bash
# Use template pattern to generate service file
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << 'EOF'
[Generated service content using patterns]
EOF
```

### **Step 3: Service Activation**
```bash
# Standard activation sequence
sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}.service
sudo systemctl start ${SERVICE_NAME}.service
sudo systemctl status ${SERVICE_NAME}.service
```

### **Step 4: Validation**
```bash
# Port conflict check
sudo ss -tlnp | grep :${PORT}

# Service health check
sudo systemctl is-active ${SERVICE_NAME}.service

# Log verification
sudo journalctl -u ${SERVICE_NAME}.service -n 10
```

---

## 🔍 **Troubleshooting Patterns**

### **Common Issues & Solutions**

#### **Port Conflicts**
```bash
# Problem: Port already in use
# Solution: Check and kill conflicting processes
sudo lsof -i :${PORT}
sudo kill -9 ${PID}
```

#### **Permission Issues** 
```bash
# Problem: Permission denied errors
# Solution: Verify file ownership and permissions
sudo chown -R admin:admin ${WORKING_DIR}
chmod +x ${WORKING_DIR}/main.ts
```

#### **Dependency Failures**
```bash
# Problem: Service fails to start due to dependencies
# Solution: Check dependency service status
sudo systemctl status mysql.service nginx.service

# Restart dependencies if needed
sudo systemctl restart mysql.service
```

#### **Resource Exhaustion**
```bash
# Problem: Service hitting resource limits
# Solution: Check resource usage and adjust limits
# Monitor file descriptors
lsof -u admin | wc -l

# Monitor processes
ps -u admin --no-headers | wc -l
```

### **Health Check Script Pattern**
```bash
#!/bin/bash
# health-check-[SERVICE_NAME].sh

SERVICE_NAME="[service-name]"
PORT="[port-number]"

echo "🔍 Health Check: ${SERVICE_NAME}"
echo "================================="

# Service status
echo "📊 Service Status:"
sudo systemctl is-active ${SERVICE_NAME}.service

# Port listening
echo "🔌 Port Status:"
sudo ss -tlnp | grep :${PORT} || echo "❌ Port ${PORT} not listening"

# Recent logs
echo "📝 Recent Logs:"
sudo journalctl -u ${SERVICE_NAME}.service -n 5 --no-pager

# Process info
echo "🔧 Process Info:"
sudo systemctl show ${SERVICE_NAME}.service -p MainPID,ActiveState,SubState
```

---

## 📈 **Performance Patterns**

### **Resource Monitoring**
```bash
# Monitor service resource usage
sudo systemctl status [SERVICE_NAME].service

# Check memory usage
sudo systemctl show [SERVICE_NAME].service -p MemoryCurrent

# Monitor file descriptor usage
sudo cat /proc/$(pgrep -f [SERVICE_NAME])/limits
```

### **Performance Tuning**
```ini
# Adjust based on load requirements
LimitNOFILE=131072      # High traffic sites
LimitNPROC=8192         # CPU intensive operations

# Optimize restart delays for business criticality
RestartSec=5            # Critical services (pedromdominguez)
RestartSec=10           # Standard services
RestartSec=15           # Non-critical services
```

---

## 🚀 **Deployment Patterns**

### **Blue-Green Deployment Support**
```ini
# Environment variable for deployment slot
Environment=DEPLOYMENT_SLOT=blue

# Alternative working directory for green deployment
# WorkingDirectory=/home/admin/deno-genesis/sites/[service]-green
```

### **Rolling Update Pattern**
```bash
#!/bin/bash
# rolling-update-[SERVICE_NAME].sh

SERVICE_NAME="[service-name]"

echo "🔄 Rolling Update: ${SERVICE_NAME}"

# Graceful service restart
sudo systemctl reload-or-restart ${SERVICE_NAME}.service

# Wait for service to be fully active
sleep 10

# Health check
if sudo systemctl is-active --quiet ${SERVICE_NAME}.service; then
    echo "✅ ${SERVICE_NAME} update successful"
else
    echo "❌ ${SERVICE_NAME} update failed"
    sudo systemctl status ${SERVICE_NAME}.service
    exit 1
fi
```

---

## 📚 **AI Development Integration**

### **Pattern Recognition Prompts**
```
Analyze this systemd service file and identify which DenoGenesis patterns it follows:

[PASTE SERVICE FILE]

Check for compliance with:
- Port assignment strategy
- Security hardening standards  
- Restart configuration patterns
- Environment variable conventions
- Dependency management patterns
- Logging configuration standards
```

### **Service Generation from Business Requirements**
```
Generate a systemd service for a new DenoGenesis site:

Business Requirements:
- Company: [COMPANY_NAME]
- Industry: [INDUSTRY]
- Primary Function: [FUNCTION]
- Expected Traffic: [HIGH/MEDIUM/LOW]
- Criticality: [CRITICAL/STANDARD/LOW]

Auto-assign:
- Available port from range 3000-3004
- Appropriate restart delays
- Resource limits based on expected load
- Security hardening level
```

### **Batch Operations Script Generation**
```
Create a management script for all DenoGenesis services that can:

1. Start/stop/restart all services in dependency order
2. Check health status of all services
3. View aggregated logs from all services
4. Perform rolling updates across all services
5. Generate service status report

Include error handling and rollback capabilities.
```

---

## ✅ **Pattern Validation Checklist**

### **Security Compliance**
- [ ] NoNewPrivileges=yes
- [ ] PrivateTmp=yes  
- [ ] ProtectSystem=strict
- [ ] ProtectHome=yes
- [ ] Minimal ReadWritePaths
- [ ] Resource limits defined
- [ ] Non-root user execution

### **Reliability Standards**
- [ ] Restart=on-failure
- [ ] StartLimitBurst=3
- [ ] StartLimitInterval=60
- [ ] Appropriate RestartSec delay
- [ ] Graceful shutdown timeouts
- [ ] Dependency declarations

### **Observability Requirements**
- [ ] StandardOutput=journal
- [ ] StandardError=journal
- [ ] Unique SyslogIdentifier
- [ ] Descriptive service description
- [ ] Documentation URL provided

### **Framework Integration**
- [ ] Correct working directory
- [ ] Standard environment variables
- [ ] Proper Deno permissions
- [ ] Framework-compatible paths
- [ ] Consistent naming conventions

---

## 🎯 **Summary**

These systemd service patterns provide a robust, secure, and maintainable foundation for deploying DenoGenesis framework applications. By following these patterns, AI-augmented development workflows can generate consistent, production-ready service configurations that integrate seamlessly with the existing infrastructure.

**Key Benefits:**
- **Consistency:** Uniform configuration across all services
- **Security:** Defense-in-depth protection mechanisms  
- **Reliability:** Robust failure recovery and resource management
- **Observability:** Comprehensive logging and monitoring capabilities
- **Maintainability:** Standardized patterns for easy updates and modifications
