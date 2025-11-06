# Heartbeat 💓

A lightweight, real-time system monitoring tool with intelligent anomaly
detection and beautiful terminal UI. Heartbeat tracks CPU, memory, and swap
usage, alerting you to potential issues like CPU spikes and memory leaks.

## Features

- **Real-time Monitoring**: Collects system metrics every second with live
  updates
- **Beautiful Terminal UI**: Rich, color-coded display with progress bars and
  visual indicators
- **Per-Core CPU Tracking**: Shows usage for each CPU core individually with
  color-coded status
- **Memory Analysis**: Tracks total, used, free, and available memory with
  visual progress bars
- **Swap Monitoring**: Monitors swap usage with detailed statistics
- **Anomaly Detection**:
  - 🚨 CPU spike alerts when usage exceeds 2x the baseline average
  - 🚨 Memory leak detection when usage grows 20% above baseline
- **Enhanced Console Styling**:
  - 256-color support with automatic terminal capability detection
  - RGB/Hex color support for custom branding
  - Color-coded metrics based on usage thresholds
  - Visual alerts and prominent warnings for critical issues
- **JSON Output**: Structured data output for integration with other tools
- **Cross-Platform**: Works on Linux, macOS, and Windows

## Architecture

Heartbeat uses a hybrid Rust/TypeScript architecture with rich terminal styling:

- **Rust Backend**: High-performance system metrics collection using `sysinfo`
- **Deno Frontend**: Beautiful CLI interface with ConsoleStyler for rich
  formatting
- **ConsoleStyler**: Enterprise-grade terminal styling with 256-color support
- **IPC**: JSON communication over stdout pipes

## Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) 1.90.0 or later
- [Deno](https://deno.land/) 2.5.4 or later

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd heartbeat
```

2. Build the Rust binary (optional, happens automatically on first run):

```bash
cargo build --release
```

## Usage

### Run with Beautiful UI (Recommended)

```bash
deno task start
```

Or with development mode (no hot-reload for better display):

```bash
deno task dev
```

### Run ConsoleStyler Demo

To see all the styling capabilities:

```bash
deno task demo
```

### Monitor Modes

Heartbeat ships with several visualization modes that share the same Rust
metrics backend. List all modes with:

```bash
deno task modes
```

Run a specific mode:

- `deno task start` — **ecg** (default) full dashboard with lifeline animation
- `deno task compact` — condensed dashboard for small terminals
- `deno task sparkline` — single-line sparkline stream for piping or status bars
- `deno task alerts` — alert-focused stream with periodic healthy heartbeats
- `deno task raw` — raw JSON output for scripting and integrations
- `deno task timeline` — rolling trend timeline with sparklines and min/avg/max
  stats
- `deno task percore` — per-core heatmap bars with top-core highlights
- `deno task stats` — aggregated statistics view with trend deltas and anomaly
  counters
- `deno task aurora` — ambient aurora skyline with flowing gradients
- `deno task zen` — meditative minimal view with rotating mantras
- `deno task retro` — neon synthwave skyline and animated grid
- `deno task cycle` — carousel that rotates through every mode every 5 minutes
- `deno task service` — journal-friendly service logs (also available via
  `--mode service`)

### Run Rust Binary Directly

For raw JSON output (useful for piping to other tools):

```bash
cargo run --release --quiet
```

## Example Output

The monitor displays a beautiful, color-coded interface with real-time updates:

```
╔════════════════════════════════════════════════════════════════╗
║         🚀 Real-time System Performance Monitor            ║
╚════════════════════════════════════════════════════════════════╝

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 💓 Heartbeat System Monitor                                   ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

╔════════════════════════════════════════════════════════════════╗
║ 🖥️  CPU Metrics                                                ║
╚════════════════════════════════════════════════════════════════╝
📊 Overall CPU Usage: 23.45%
   Core 0: 24.3%  Core 1: 21.8%  Core 2: 23.9%  Core 3: 22.6%

╔════════════════════════════════════════════════════════════════╗
║ 💾 Memory Metrics                                              ║
╚════════════════════════════════════════════════════════════════╝
📊 Used: 4.56 GB / 16.00 GB (28.50%)
ℹ️  Available: 11.44 GB | Free: 9.87 GB
│███████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│ 28.5% Memory Usage

💿 Swap: 0 MB / 8192 MB (0.00%)

⏰ Last Updated: 7:43:21 PM
```

When alerts are detected, they appear in a prominent red box:

```
╔════════════════════════════════════════════════════════════════╗
║ ⚠️  CRITICAL ALERTS                                            ║
╠════════════════════════════════════════════════════════════════╣
║ 🚨 CPU SPIKE DETECTED - Usage significantly above baseline    ║
║ 🚨 MEMORY LEAK SUSPECTED - Usage growing abnormally           ║
╚════════════════════════════════════════════════════════════════╝
```

**Color Coding:**

- 🟢 Green: Normal usage (CPU <60%, Memory <70%)
- 🟡 Yellow/Orange: Elevated usage (CPU 60-80%, Memory 70-85%)
- 🔴 Red: High usage (CPU >80%, Memory >85%)

## How It Works

### Monitoring Engine

The Rust backend (`src/main.rs`) collects system metrics using the `sysinfo`
library and maintains a rolling history of the last 30 samples for both CPU and
memory usage.

### Anomaly Detection

**CPU Spike Detection:**

- Calculates the average CPU usage from the last 10 samples (baseline)
- Alerts when current usage exceeds 2x the baseline average
- Requires at least 10 samples before detection begins

**Memory Leak Detection:**

- Tracks memory usage trends over the last 30 samples
- Alerts when current usage is 20% higher than the baseline average
- Requires at least 10 samples before detection begins

### Data Flow

```
System → sysinfo → Monitor → JSON → stdout → Deno → ConsoleStyler → Beautiful UI
         (Rust)    (Rust)   (Rust)   (pipe)  (TS)    (TS)           (User)
```

The ConsoleStyler provides:

- Automatic terminal capability detection (basic/256/truecolor)
- Color-coded output based on metric thresholds
- Visual progress bars for memory usage
- Boxed alerts for critical conditions
- Per-core CPU color coding

## Configuration

Current configuration is hardcoded in `src/main.rs`. You can modify these
constants:

```rust
baseline_samples: 10           // Samples needed for baseline
spike_threshold_multiplier: 2.0  // CPU spike threshold (2x baseline)
memory_leak_threshold: 1.2       // Memory leak threshold (1.2x = 20% growth)
```

Monitoring interval: 1 second (configurable in the main loop)

## Project Structure

```
heartbeat/
├── src/
│   └── main.rs                           # Rust monitoring core
├── utils/
│   └── console-styler/
│       ├── ConsoleStyler.ts              # Main styling class
│       ├── unit-test.ts                  # Style demo/tests
│       └── lib/
│           └── colors.ts                 # Color system (256/RGB/hex)
├── target/                               # Rust build artifacts
├── main.ts                               # TypeScript CLI wrapper
├── Cargo.toml                            # Rust dependencies
├── Cargo.lock                            # Rust dependency lock
├── deno.json                             # Deno configuration and tasks
└── README.md                             # This file
```

## Development

### Building

**Debug build:**

```bash
cargo build
```

**Release build (optimized):**

```bash
cargo build --release
```

### Running in Development Mode

The `deno task dev` command runs with hot-reload enabled, automatically
restarting when files change:

```bash
deno task dev
```

## Dependencies

### Rust

- `sysinfo 0.33` - Cross-platform system information
- `tokio 1.48` - Async runtime
- `serde 1.0` - Serialization framework
- `serde_json 1.0` - JSON support

### Deno/TypeScript

- `@std/assert` (JSR) - Standard assertions
- **ConsoleStyler** (built-in) - Enterprise terminal styling library with:
  - 256-color palette support
  - RGB/Hex color conversion
  - Terminal capability auto-detection
  - Progress bars, tables, and boxes
  - Gradient rendering
  - Themed color palettes (Solarized, Nord, Dracula, Monokai)

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]

## Credits

Built with Rust and Deno.
