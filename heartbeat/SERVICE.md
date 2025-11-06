# Heartbeat Service Setup

This document explains how to run Heartbeat as a background systemd service with minimal lifeline output.

## Service Mode

The service mode (`deno task service`) provides a minimal output suitable for background logging:
- Compact one-line format with timestamp, status, and key metrics
- Minimal lifeline animation (ANSI codes stripped for log clarity)
- Periodic inspirational quotes from deno genesis
- Critical alert notifications
- All output goes to systemd journal

Example output:
```
[2025-10-30T12:34:56.789Z] 💓 Heartbeat service starting...
[2025-10-30T12:34:56.790Z] 📡 Monitoring system vitals...
[2025-10-30T12:34:56.790Z] 💭 "one person, one paradigm shift"

[2025-10-30T12:34:57.123Z] 🟢 ▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂ | CPU: 23.4% | MEM: 28.5%
[2025-10-30T12:34:58.234Z] 🟢 ▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂▁▂▃▄▅▆▅▄▃▂ | CPU: 24.1% | MEM: 28.6%
[2025-10-30T12:35:17.890Z] 💭 "simplicity is the ultimate sophistication"
```

## Installation (User Service - Recommended)

User services run under your user account and don't require root privileges.

1. **Copy the service file:**
   ```bash
   mkdir -p ~/.config/systemd/user
   cp heartbeat.service ~/.config/systemd/user/
   ```

2. **Reload systemd:**
   ```bash
   systemctl --user daemon-reload
   ```

3. **Enable and start the service:**
   ```bash
   systemctl --user enable heartbeat.service
   systemctl --user start heartbeat.service
   ```

4. **Check status:**
   ```bash
   systemctl --user status heartbeat.service
   ```

5. **View logs:**
   ```bash
   # Follow live logs
   journalctl --user -u heartbeat.service -f

   # View recent logs
   journalctl --user -u heartbeat.service -n 50

   # View logs from today
   journalctl --user -u heartbeat.service --since today
   ```

6. **Enable at boot (persist after logout):**
   ```bash
   loginctl enable-linger $USER
   ```

## Management Commands

### User Service
```bash
# Start service
systemctl --user start heartbeat.service

# Stop service
systemctl --user stop heartbeat.service

# Restart service
systemctl --user restart heartbeat.service

# Check status
systemctl --user status heartbeat.service

# Enable at boot
systemctl --user enable heartbeat.service

# Disable at boot
systemctl --user disable heartbeat.service

# View live logs
journalctl --user -u heartbeat.service -f

# View logs with grep
journalctl --user -u heartbeat.service | grep "ALERT"
```

## Configuration

### Adjusting the Service

Edit `~/.config/systemd/user/heartbeat.service` to:

1. **Change restart behavior:**
   ```ini
   RestartSec=30  # Wait 30 seconds before restart
   ```

2. **Set resource limits:**
   ```ini
   MemoryMax=512M    # Maximum memory usage
   CPUQuota=50%      # Maximum CPU usage
   ```

3. **Add environment variables:**
   ```ini
   Environment="DENO_DIR=/custom/path"
   ```

After editing, reload and restart:
```bash
systemctl --user daemon-reload
systemctl --user restart heartbeat.service
```

### Customizing Quotes

Edit `service-mode.ts` and modify the `GENESIS_QUOTES` array:
```typescript
const GENESIS_QUOTES = [
  "your custom quote here",
  "another inspiring thought",
  // ...
];
```

### Adjusting Quote Frequency

In `service-mode.ts`, change:
```typescript
const METRICS_BETWEEN_QUOTES = 20;  // Show quote every 20 metrics (20 seconds)
```

## Troubleshooting

### Service won't start
```bash
# Check for errors
systemctl --user status heartbeat.service
journalctl --user -u heartbeat.service -n 50

# Verify deno path
which deno

# Test manually
cd /home/grenas405/.local/src/heartbeat
deno task service
```

### Service stops after logout
```bash
# Enable lingering to keep services running
loginctl enable-linger $USER
```

### Logs growing too large
```bash
# Check journal size
journalctl --user -u heartbeat.service --disk-usage

# Limit journal size in /etc/systemd/journald.conf:
# SystemMaxUse=100M
```

## System Service (Alternative)

If you prefer to run as a system service (requires root):

1. **Edit the service file:**
   ```bash
   sudo nano /etc/systemd/system/heartbeat.service
   ```

   Update the `User` and `Group` fields:
   ```ini
   [Service]
   User=grenas405
   Group=grenas405
   WorkingDirectory=/home/grenas405/.local/src/heartbeat
   ExecStart=/home/grenas405/.deno/bin/deno task service
   ```

2. **Enable and start:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable heartbeat.service
   sudo systemctl start heartbeat.service
   ```

3. **View logs:**
   ```bash
   sudo journalctl -u heartbeat.service -f
   ```

## Uninstallation

### User Service
```bash
systemctl --user stop heartbeat.service
systemctl --user disable heartbeat.service
rm ~/.config/systemd/user/heartbeat.service
systemctl --user daemon-reload
```

### System Service
```bash
sudo systemctl stop heartbeat.service
sudo systemctl disable heartbeat.service
sudo rm /etc/systemd/system/heartbeat.service
sudo systemctl daemon-reload
```

## Genesis Quotes

The service includes inspirational quotes from the deno genesis philosophy:
- "one person, one paradigm shift"
- "simplicity is the ultimate sophistication"
- "observe the system, understand the rhythm"
- "every heartbeat tells a story"
- "monitor with purpose, react with precision"
- "in the pulse of data, find clarity"
- "steady state is earned, not given"
- "vigilance breeds reliability"
- "from chaos, we bring order"
- "the system breathes, we listen"

These rotate periodically in the logs to provide inspiration and context for the monitoring activity.
