# Technical Deep Dive: cli-builder.ts Architecture

## Executive Summary

The `cli-builder.ts` file is a **meta-programming tool** — a program that writes other programs. It's a CLI (Command Line Interface) generator that creates production-ready command-line tools following specific architectural patterns.

---

## 1. Meta-Programming: A Program that Writes Programs

### What Makes This "Meta"?

Most programs perform tasks directly (like copying files or processing data). This tool is different — **it generates entire applications**.

**Think of it like this:**

- A **carpenter** builds houses
- A **carpenter's toolmaker** builds the tools carpenters use
- **cli-builder.ts is the toolmaker** — it builds CLI tools that developers use

### Code Generation Flow

```
User Input → cli-builder.ts → Generated CLI Tool
   ↓              ↓                    ↓
 "I need a    Processes      Fully functional
 deployment   specifications   deployment.ts
 tool"        and templates    application
```

---

## 2. Unix Philosophy Implementation

### The Core Principles

The tool explicitly follows **Unix Philosophy**, a set of design principles from the 1970s that remain relevant today:

#### Principle 1: Do One Thing Well

```typescript
/**
 * - Do one thing well: Generate production-ready CLI tools
 */
```

**Translation:** Instead of trying to be a Swiss Army knife, this tool focuses exclusively on generating CLI applications. It doesn't deploy apps, manage databases, or serve web pages — it just generates CLI tools exceptionally well.

#### Principle 2: Text-Based I/O

```typescript
/**
 * - Accept text input: Command specifications, configuration
 * - Produce text output: TypeScript CLI files with all patterns
 */
```

**Translation:** Everything is text. Input is text (your specifications), output is text (generated TypeScript files). This makes the tool composable with other Unix tools using pipes and redirection.

#### Principle 3: Composability

```typescript
/**
 * - Filter and transform: CLI spec → fully-featured command file
 * - Composable: Generated CLIs follow same composability principles
 */
```

**Translation:** The generated CLIs can be chained together with other programs. For example:

```bash
my-tool list | grep "error" | my-other-tool process
```

---

## 3. Type-Driven Architecture

### TypeScript Interfaces as Specifications

The tool uses **TypeScript interfaces** as a blueprint system:

```typescript
interface CLISpec {
  name: string;
  description: string;
  version: string;
  author?: string;
  commands: CommandSpec[];
  globalOptions: OptionSpec[];
  colors: boolean;
  interactivePrompts: boolean;
  validationHelpers: boolean;
}
```

**Why This Matters:**

1. **Compile-Time Safety:** TypeScript checks that all required fields exist before runtime
2. **Self-Documentation:** The interface IS the specification — no separate documentation needed
3. **IDE Integration:** Code editors provide autocomplete and error checking automatically

### Nested Type Hierarchies

```
CLISpec
  ├── CommandSpec[]          (Multiple commands)
  │   ├── OptionSpec[]       (Command-specific options)
  │   ├── ArgumentSpec[]     (Required arguments)
  │   ├── ValidationSpec[]   (Input validation rules)
  │   └── Permission[]       (Security permissions)
  └── OptionSpec[]           (Global options)
```

This hierarchical structure models **real-world CLI complexity** where commands have sub-options, arguments have validators, and everything requires security permissions.

---

## 4. Template-Based Code Generation

### String Template Functions

The tool uses **function-generated templates** to create code:

```typescript
function generateHeader(spec: CLISpec): string {
  return `#!/usr/bin/env -S deno run ${getAllPermissions(spec)
    .map((p) => p.flag)
    .join(" ")}

/**
 * ${spec.name} - ${spec.description}
 * Version: ${spec.version}
 ${spec.author ? `Author: ${spec.author}` : ""}
 *
 * Unix Philosophy Implementation:
 * - Do one thing well: ${spec.description}
 * ...
 */`;
}
```

**Key Concepts:**

1. **Template Literals:** The backticks (`` ` ``) allow multi-line strings with embedded variables using `${}`
2. **Dynamic Injection:** Values like `spec.name` and `spec.description` are injected at generation time
3. **Conditional Content:** The ternary operator `spec.author ? ... : ""` includes content only if it exists

### Shebang Generation

```typescript
#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-env
```

**Technical Breakdown:**

- `#!/usr/bin/env`: The "shebang" — tells the OS what interpreter to use
- `-S`: Allows passing multiple arguments to the interpreter
- `deno run`: The Deno runtime command
- `--allow-*`: **Security permissions** explicitly granted (more on this below)

---

## 5. Security-First Design

### Explicit Permission Model

Unlike Node.js (which has full system access by default), **Deno requires explicit permissions**:

```typescript
interface Permission {
  flag: string; // e.g., "--allow-read"
  description: string;
  paths?: string[]; // Optional: specific paths only
}
```

**Why This Matters:**

```typescript
// BAD (Node.js style - implicit full access)
fs.writeFileSync("/etc/passwd", "hacked"); // No warning!

// GOOD (Deno style - explicit permission required)
Deno.writeTextFile("/etc/passwd", "hacked"); // ERROR: No --allow-write permission!
```

### Permission Aggregation

```typescript
function getAllPermissions(spec: CLISpec): Permission[] {
  const permissionMap = new Map<string, Permission>();

  for (const command of spec.commands) {
    for (const permission of command.permissions) {
      if (!permissionMap.has(permission.flag)) {
        permissionMap.set(permission.flag, permission);
      }
    }
  }

  return Array.from(permissionMap.values());
}
```

**What's Happening:**

1. **Map for Deduplication:** Uses a `Map` to automatically remove duplicate permissions
2. **Iterative Collection:** Loops through all commands to gather every permission needed
3. **Conversion to Array:** Transforms the Map back into an array for the shebang

---

## 6. Interactive Wizard Pattern

### Multi-Stage User Input Collection

```typescript
async function gatherCLISpecification(context: CLIContext): Promise<CLISpec> {
  logSection("CLI.ts - Create New CLI Tool");

  console.log(`
${Colors.CYAN}This wizard will guide you through creating a new CLI tool.${Colors.RESET}
${Colors.DIM}Following Unix Philosophy and Deno Genesis patterns.${Colors.RESET}
`);

  // Gather specification through prompts
  // ...
}
```

**Progressive Disclosure Pattern:**

1. **Ask Only What's Needed:** Start with essential questions (name, description)
2. **Build on Previous Answers:** Use earlier responses to customize later questions
3. **Provide Defaults:** Every question has a sensible default based on context
4. **Validate Incrementally:** Check each answer before moving to the next question

### Validation Helpers

```typescript
function validateRequired(
  value: string,
  fieldName: string,
): { valid: boolean; error?: string } {
  if (!value || !value.trim()) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}
```

**Design Patterns:**

- **Result Object Pattern:** Returns `{ valid, error }` instead of throwing exceptions
- **Null-Safe Checking:** Uses `!value || !value.trim()` to catch empty/whitespace-only strings
- **Descriptive Errors:** Includes field name in error message for clarity

---

## 7. ANSI Color Utilities

### Terminal Escape Sequences

```typescript
const Colors = {
  RED: "\x1b[31m",
  GREEN: "\x1b[32m",
  YELLOW: "\x1b[33m",
  BLUE: "\x1b[34m",
  CYAN: "\x1b[36m",
  RESET: "\x1b[0m",
  BOLD: "\x1b[1m",
};
```

**What Are ANSI Escape Codes?**

- `\x1b` is the "escape" character (ASCII 27)
- `[31m` is a command meaning "switch to red text"
- These are **terminal control sequences** that change text appearance

**Usage Pattern:**

```typescript
function logSuccess(message: string): void {
  console.log(`${Colors.GREEN}✅ ${message}${Colors.RESET}`);
}
```

**Result:** `✅ Operation completed` (in green text)

---

## 8. Command-Pattern Architecture

### Command Registry

```typescript
interface CommandDefinition {
  name: string;
  description: string;
  usage: string;
  examples: string[];
  handler: (args: string[], context: CLIContext) => Promise<number>;
}

const COMMANDS: Record<string, CommandDefinition> = {
  new: {
    /* ... */
  },
  list: {
    /* ... */
  },
  validate: {
    /* ... */
  },
};
```

**Design Benefits:**

1. **Extensibility:** Add new commands by adding entries to the record
2. **Decoupling:** Each command handler is independent
3. **Documentation Included:** Usage and examples are part of the command definition
4. **Type Safety:** TypeScript ensures all commands have required properties

### Async Handler Pattern

```typescript
handler: (args: string[], context: CLIContext) => Promise<number>;
```

**Why Async and Return a Number?**

- **Async:** Commands might need to read files, make network requests, or spawn processes
- **Number Return:** Unix convention — `0` means success, non-zero means error
  - Example: `return 1` signals an error to the shell
  - Allows script chaining: `tool1 && tool2` (tool2 only runs if tool1 returns 0)

---

## 9. File Generation Pipeline

### Multi-File Output Strategy

```typescript
await generateCLIFile(spec, cliPath, context);
await generateREADME(spec, outputDir);
await generateExampleConfig(spec, outputDir);
await generateTestFile(spec, outputDir);
```

**Generated File Structure:**

```
my-tool/
├── my-tool.ts                    # Main executable
├── README.md                     # Documentation
├── my-tool.config.example.ts     # Configuration template
└── my-tool.test.ts              # Test suite
```

**Why Multiple Files?**

1. **Separation of Concerns:** Code, docs, config, and tests are separate
2. **Convention Over Configuration:** Standard structure everyone recognizes
3. **Immediate Usability:** Generated project is ready to run without additional setup

### Executable Bit Setting

```typescript
await Deno.chmod(outputPath, 0o755);
```

**Unix Permission Bits:**

- `0o755` is octal notation (base-8)
- Binary breakdown: `111 101 101`
  - Owner: `111` (7) = read + write + execute
  - Group: `101` (5) = read + execute
  - Others: `101` (5) = read + execute

**Result:** Makes the file directly executable via `./my-tool.ts`

---

## 10. Zero-Configuration Philosophy

### Smart Defaults

```typescript
interface CLIContext {
  cwd: string; // Defaults to current directory
  configPath: string; // Defaults to sensible location
  verbose: boolean; // Defaults to false
  dryRun: boolean; // Defaults to false
  format: "text" | "json" | "yaml"; // Defaults to text
}
```

**Principle:** The tool should work with zero configuration but allow customization when needed.

**Examples:**

- No config file? Uses current directory
- No format specified? Outputs human-readable text
- No verbosity flag? Quiet operation

### Self-Documenting Output

```typescript
console.log(`
${Colors.GREEN}${Colors.BOLD}✅ CLI tool generated successfully!${Colors.RESET}

${Colors.BOLD}Generated Files:${Colors.RESET}
  📄 ${spec.name}.ts
  📖 README.md
  ⚙️  ${spec.name}.config.example.ts
  🧪 ${spec.name}.test.ts

${Colors.BOLD}Quick Start:${Colors.RESET}
  cd ${spec.name}
  ./${spec.name}.ts --help
`);
```

**Every output tells the user:**

1. What just happened
2. What was created
3. What to do next

---

## 11. Test Suite Generation

### Automatic Test Scaffolding

```typescript
function generateTestFile(spec: CLISpec, outputDir: string): Promise<void> {
  const testContent = `
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/testing/asserts.ts";

${spec.commands
  .map(
    (cmd) => `
Deno.test("${cmd.name} command - basic execution", async () => {
  const context = createMockContext();
  // TODO: Add test implementation
  assertExists(context);
});
`,
  )
  .join("\n")}
  `;
}
```

**What's Generated:**

1. **Import Statements:** Test utilities from Deno standard library
2. **Mock Context:** Fake environment for testing
3. **Test Stubs:** One test per command with TODO markers
4. **Help/Version Tests:** Verification of standard CLI features

**Developer Experience:**

- Tests exist from day one
- Clear TODO markers show where to add logic
- Run with `deno test` immediately

---

## 12. Key Architectural Decisions

### Why These Choices Matter

| Decision                 | Rationale                                                  | Alternative Considered           |
| ------------------------ | ---------------------------------------------------------- | -------------------------------- |
| **TypeScript**           | Compile-time type checking prevents entire classes of bugs | JavaScript (less safe)           |
| **Template Strings**     | Simple, readable, maintainable code generation             | AST manipulation (too complex)   |
| **Deno Runtime**         | Security-first, modern JavaScript, built-in TypeScript     | Node.js (legacy security model)  |
| **Explicit Permissions** | Security audit trail, principle of least privilege         | Implicit access (insecure)       |
| **Interactive Wizard**   | Lower barrier to entry, discoverability                    | Config file only (requires docs) |
| **Multi-File Output**    | Separation of concerns, standard project structure         | Single file (unmaintainable)     |

---

## 13. Advanced Concepts Demonstrated

### Higher-Order Functions

```typescript
const COMMANDS: Record<string, CommandDefinition> = {
  new: {
    handler: newCommand, // Function reference
  },
};
```

The `handler` is a **function that takes functions as arguments** — a higher-order function.

### Functional Composition

```typescript
const sections = [
  generateHeader(spec),
  generateColorUtilities(spec),
  generateValidationHelpers(spec),
  ...spec.commands.map((cmd) => generateCommandHandler(cmd, spec)),
  generateMainFunction(spec),
];

const content = sections.filter(Boolean).join("\n");
```

**What's Happening:**

1. Each generator returns a string (or empty string)
2. `.filter(Boolean)` removes empty strings
3. `.join("\n")` combines all sections with newlines
4. Result: Complete program assembled from modular pieces

### Promise-Based Async Flow

```typescript
async function newCommand(
  args: string[],
  context: CLIContext,
): Promise<number> {
  try {
    const spec = await gatherCLISpecification(context); // Async I/O
    await generateCLIFile(spec, cliPath, context); // Async I/O
    await generateREADME(spec, outputDir); // Async I/O
    return 0; // Success
  } catch (error) {
    logError(`Failed: ${error.message}`);
    return 1; // Failure
  }
}
```

**Error Handling Strategy:**

- **try/catch** wraps all async operations
- Errors are logged with context
- Exit codes signal success/failure to shell
- User sees helpful error messages, not stack traces

---

## Conclusion: Why This Architecture Stands Out

1. **Meta-Programming Excellence:** Generates complete, working applications from specifications
2. **Security-First:** Explicit permissions at every level
3. **Type-Driven Design:** Leverages TypeScript's type system for correctness
4. **Unix Philosophy:** Composable, text-based, focused tools
5. **Developer Experience:** Zero-config defaults with full customization
6. **Production-Ready Output:** Generated code includes tests, docs, and configuration
7. **Maintainability:** Clear separation of concerns, modular architecture
8. **Educational Value:** Demonstrates advanced patterns in a readable way

This isn't just a code generator — it's a **teaching tool** that embeds best practices into every generated application.
