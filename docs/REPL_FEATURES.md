# Futuristic REPL Shell - Feature Guide

## Overview
The Genesis OS REPL has been upgraded with a futuristic, modern interface featuring advanced input handling, real-time status display, and interactive command suggestions.

## Key Features

### 1. Enhanced Visual Design
- **Futuristic ASCII Art Banner**: Eye-catching startup banner with GENESIS OS branding
- **Colorful Prompt**: Dynamic prompt showing:
  - Current time `[HH:MM:SS]`
  - Process status indicator (`●` green when running, `○` gray when stopped)
  - System name in magenta
  - Running process count
  - Modern arrow prompt (`❯`)

### 2. Real-time Status Bar
- Displays at the top of each command:
  - System version
  - Uptime counter
  - Process statistics (running/total)
  - Kernel PID
  - Platform information
- Toggle with: `statusbar`

### 3. Advanced Input Handling

#### Arrow Key Navigation
- **Up/Down Arrows**: Navigate command history
- **Left/Right Arrows**: Move cursor within current command
- Full line editing support

#### Tab Completion
- **Single Tab**: Auto-complete when only one match exists
- **Multiple Tabs**: Cycle through available command suggestions
- **Ghost Text**: Shows completion preview in dimmed text

#### Smart Command Suggestions
- Real-time suggestions as you type
- Shows up to 5 matching commands
- Selected suggestion highlighted in blue
- Shows "+N more" indicator for additional matches

### 4. Keyboard Shortcuts
- `Ctrl+L`: Clear screen and redisplay welcome banner
- `Ctrl+U`: Clear current input line
- `Ctrl+C`: Exit REPL or shutdown kernel
- `Tab`: Auto-complete or cycle suggestions
- `↑/↓`: Navigate history
- `←/→`: Move cursor

### 5. New Commands

#### Process Monitoring
```bash
monitor        # Real-time process dashboard (like 'top')
mon            # Alias for monitor
top            # Alias for monitor
```
- Live updating process table
- Color-coded status indicators
- System statistics
- Press 'q' to exit

#### Process Management
```bash
inspect <id>   # Detailed process inspection report
describe <id>  # Alias for inspect
show <id>      # Alias for inspect
logs <id>      # View process logs and metadata
restart <id>   # Restart a process
kill <id>      # Kill a process
```

#### System Commands
```bash
ps             # List all processes in table format
info           # System information
status         # Alias for info
statusbar      # Toggle status bar display
help           # Show all commands
history        # View command history
clear          # Clear screen
eval <code>    # Evaluate JavaScript
man <topic>    # Genesis manual system
```

### 6. Visual Enhancements

#### Color Coding
- **Cyan**: Time, system stats, suggestions
- **Green**: Success states, running processes
- **Yellow**: Warnings, process counts
- **Red**: Errors, failed processes
- **Magenta**: System branding
- **Blue**: Active selections, highlights
- **Gray/Dim**: Secondary information, inactive elements

#### Status Indicators
- `●` Green: Process running
- `○` Gray: Process stopped
- `●` Red: Process failed
- `●` Yellow: Process starting

#### Unicode Symbols
- `❯`: Command prompt
- `→`: List items
- `⬆`: Uptime indicator
- `◉`: Process count
- `⚡`: PID indicator
- `◢◤`: Design elements

## Example Usage

### Starting the REPL
```bash
deno run --allow-all kernel.ts
```

### Interactive Features Demo
1. Type `he` and press Tab → auto-completes to `help`
2. Press Up arrow → shows last command from history
3. Type `ps` → see list of processes with color-coded status
4. Type `monitor` → enter real-time dashboard view
5. Press `q` → exit monitor back to REPL
6. Type `inspect http-server` → detailed process information
7. Press Ctrl+L → clear and refresh screen

### Ghost Text Preview
When you start typing a command:
```
genesis-os> h█lp
         ^^^^ (dimmed ghost text shows "elp")
```

### Multiple Suggestions
```
genesis-os> s█
suggestions: status | statusbar | shutdown | show

Press Tab to cycle through them
```

## Architecture

### Input State Management
The REPL maintains sophisticated input state:
```typescript
{
  buffer: string;        // Current input text
  cursor: number;        // Cursor position
  historyIndex: number;  // Position in history
  suggestionIndex: number; // Selected suggestion
}
```

### Raw Mode Input
- Character-by-character processing
- Escape sequence detection for special keys
- ANSI control codes for cursor manipulation
- Non-blocking keyboard input

### ANSI Escape Sequences
- Cursor movement and positioning
- Color and style formatting
- Screen clearing and line manipulation
- Terminal state management

## Performance
- Efficient suggestion matching with Set deduplication
- Minimal re-rendering with cursor control
- Async I/O for non-blocking operations
- Optimized ANSI sequence counting for cursor positioning

## Compatibility
- Tested on Linux terminals
- Supports modern terminal emulators with ANSI color
- UTF-8 unicode symbol support
- Raw mode terminal input required

## Future Enhancements
- Command argument auto-completion
- Multi-line command editing
- Command syntax validation
- Customizable themes
- Plugin system for custom commands
- Bash-style brace expansion
- History search (Ctrl+R)
