# Neovim + LazyVim + Deno File Structure Documentation

This document provides comprehensive documentation for the file structure and organization of your Neovim configuration optimized for Deno development using LazyVim.

## Overview

The configuration follows LazyVim's modular architecture, providing a clean separation between core functionality, user customizations, and Deno-specific optimizations. This structure promotes maintainability, performance, and ease of customization.

## Complete Directory Structure

```
~/.config/nvim/                          # Main Neovim configuration directory
├── init.lua                             # Bootstrap entry point
├── lazy-lock.json                       # Plugin version lockfile (auto-generated)
├── lua/                                 # Lua configuration modules
│   ├── config/                          # Core configuration (auto-loaded)
│   │   ├── autocmds.lua                 # Automatic commands and event handlers
│   │   ├── keymaps.lua                  # Global keybinding definitions
│   │   ├── lazy.lua                     # Plugin manager bootstrap and setup
│   │   ├── options.lua                  # Neovim options and settings
│   │   └── init.lua                     # Configuration loader (optional)
│   └── plugins/                         # Plugin specifications and configurations
│       ├── editor.lua                   # Editor enhancement plugins
│       ├── ui.lua                       # User interface and theming plugins
│       ├── lsp.lua                      # Language Server Protocol configurations
│       ├── dap.lua                      # Debug Adapter Protocol setup
│       ├── deno.lua                     # Deno-specific configurations
│       ├── formatting.lua               # Code formatting configurations
│       ├── treesitter.lua               # Syntax highlighting and parsing
│       ├── telescope.lua                # Fuzzy finder customizations
│       ├── git.lua                      # Git integration plugins
│       ├── terminal.lua                 # Terminal and shell integrations
│       └── extras/                      # Optional plugin configurations
│           ├── copilot.lua              # AI code completion
│           ├── markdown.lua             # Markdown enhancements
│           └── testing.lua              # Testing framework integrations
└── after/                               # Late-loading configurations
    ├── ftplugin/                        # Filetype-specific configurations
    │   ├── typescript.lua               # TypeScript-specific settings
    │   ├── javascript.lua               # JavaScript-specific settings
    │   ├── json.lua                     # JSON file configurations
    │   └── lua.lua                      # Lua development settings
    └── queries/                         # Custom Treesitter queries
        └── typescript/                  # TypeScript-specific queries
            ├── highlights.scm           # Custom syntax highlighting
            └── injections.scm           # Language injection rules
```

## Core Configuration Files

### `init.lua` - Bootstrap Entry Point

**Purpose**: Primary entry point that loads LazyVim and initializes the plugin system.

**Location**: `~/.config/nvim/init.lua`

**Structure**:
```lua
-- Bootstrap lazy.nvim plugin manager
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- Load LazyVim
require("lazy").setup({
  spec = {
    { "LazyVim/LazyVim", import = "lazyvim.plugins" },
    { import = "plugins" },  -- Import user plugins
  },
  defaults = {
    lazy = false,
    version = false,
  },
  checker = { enabled = true },
  performance = {
    rtp = {
      disabled_plugins = {
        "gzip",
        "matchit",
        "matchparen", 
        "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})
```

**Key Functions**:
- Downloads and installs lazy.nvim plugin manager if not present
- Sets up runtime path for plugin loading
- Configures LazyVim with performance optimizations
- Enables automatic plugin updates checking

### `lua/config/` - Core Configuration Directory

This directory contains configuration files that are automatically loaded by LazyVim during startup.

#### `lua/config/options.lua` - Neovim Settings

**Purpose**: Global Neovim options and editor behavior configuration.

**Key Sections**:
```lua
-- Editor Behavior
vim.opt.conceallevel = 0        -- Show concealed text
vim.opt.wrap = true             -- Enable line wrapping
vim.opt.linebreak = true        -- Break lines at word boundaries
vim.opt.showbreak = "↪ "        -- Show line break indicator

-- Indentation (Optimized for Deno/TypeScript)
vim.opt.tabstop = 2             -- Tab width
vim.opt.shiftwidth = 2          -- Indentation width
vim.opt.expandtab = true        -- Use spaces instead of tabs
vim.opt.smartindent = true      -- Smart auto-indentation

-- Search and Navigation
vim.opt.ignorecase = true       -- Case-insensitive search
vim.opt.smartcase = true        -- Case-sensitive if uppercase present
vim.opt.hlsearch = false        -- Don't highlight search results
vim.opt.incsearch = true        -- Incremental search

-- File Handling
vim.opt.undofile = true         -- Persistent undo
vim.opt.backup = false          -- No backup files
vim.opt.swapfile = false        -- No swap files
vim.opt.autoread = true         -- Auto-reload changed files

-- Performance
vim.opt.updatetime = 250        -- Faster completion
vim.opt.timeoutlen = 300        -- Faster key sequence timeout
vim.opt.lazyredraw = true       -- Don't redraw during macros
```

#### `lua/config/keymaps.lua` - Global Keybindings

**Purpose**: Global keybinding definitions and custom shortcuts.

**Structure**:
```lua
local keymap = vim.keymap.set

-- Leader key configuration
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- Navigation
keymap("n", "<C-h>", "<C-w>h", { desc = "Go to left window" })
keymap("n", "<C-j>", "<C-w>j", { desc = "Go to lower window" })
keymap("n", "<C-k>", "<C-w>k", { desc = "Go to upper window" })
keymap("n", "<C-l>", "<C-w>l", { desc = "Go to right window" })

-- Buffer management
keymap("n", "<S-h>", "<cmd>bprevious<cr>", { desc = "Prev buffer" })
keymap("n", "<S-l>", "<cmd>bnext<cr>", { desc = "Next buffer" })
keymap("n", "[b", "<cmd>bprevious<cr>", { desc = "Prev buffer" })
keymap("n", "]b", "<cmd>bnext<cr>", { desc = "Next buffer" })

-- File operations
keymap("n", "<leader>fn", "<cmd>enew<cr>", { desc = "New file" })
keymap("n", "<leader>fs", "<cmd>w<cr>", { desc = "Save file" })
keymap("n", "<leader>fq", "<cmd>q<cr>", { desc = "Quit" })

-- Deno-specific shortcuts
keymap("n", "<leader>dr", "<cmd>!deno run %<cr>", { desc = "Run Deno file" })
keymap("n", "<leader>dt", "<cmd>!deno test<cr>", { desc = "Run Deno tests" })
keymap("n", "<leader>df", "<cmd>!deno fmt<cr>", { desc = "Format with Deno" })
keymap("n", "<leader>dl", "<cmd>!deno lint<cr>", { desc = "Lint with Deno" })
```

#### `lua/config/autocmds.lua` - Automatic Commands

**Purpose**: Event-driven automation and file-specific behaviors.

**Key Automations**:
```lua
local autocmd = vim.api.nvim_create_autocmd
local augroup = vim.api.nvim_create_augroup

-- Highlight on yank
autocmd("TextYankPost", {
  group = augroup("highlight_yank", { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})

-- Auto-format on save for Deno files
autocmd("BufWritePre", {
  group = augroup("deno_format", { clear = true }),
  pattern = { "*.ts", "*.js", "*.tsx", "*.jsx" },
  callback = function()
    local bufname = vim.api.nvim_buf_get_name(0)
    if vim.fn.executable("deno") == 1 and 
       (vim.fn.filereadable("deno.json") == 1 or 
        vim.fn.filereadable("deno.jsonc") == 1) then
      vim.cmd("silent !deno fmt " .. bufname)
      vim.cmd("edit")
    end
  end,
})

-- Restore cursor position
autocmd("BufReadPost", {
  group = augroup("restore_cursor", { clear = true }),
  callback = function()
    local mark = vim.api.nvim_buf_get_mark(0, '"')
    local lcount = vim.api.nvim_buf_line_count(0)
    if mark[1] > 0 and mark[1] <= lcount then
      pcall(vim.api.nvim_win_set_cursor, 0, mark)
    end
  end,
})
```

## Plugin Configuration Files

### `lua/plugins/deno.lua` - Deno Development Configuration

**Purpose**: Complete Deno development environment setup including LSP, formatting, and debugging.

**Structure**:
```lua
return {
  -- Deno LSP Configuration
  {
    "neovim/nvim-lspconfig",
    dependencies = { "sigmaSd/deno-nvim" },
    opts = {
      servers = {
        denols = {
          root_dir = function(fname)
            local util = require("lspconfig.util")
            return util.root_pattern("deno.json", "deno.jsonc", "deno.lock")(fname)
          end,
          settings = {
            deno = {
              enable = true,
              lint = true,
              unstable = true,
              suggest = {
                imports = {
                  hosts = {
                    ["https://deno.land"] = true,
                    ["https://cdn.nest.land"] = true,
                    ["https://esm.sh"] = true,
                    ["https://cdn.skypack.dev"] = true,
                    ["https://unpkg.com"] = true,
                  },
                },
              },
              inlayHints = {
                parameterNames = { enabled = "all" },
                parameterTypes = { enabled = true },
                variableTypes = { enabled = true },
                propertyDeclarationTypes = { enabled = true },
                functionLikeReturnTypes = { enabled = true },
                enumMemberValues = { enabled = true },
              },
            },
          },
        },
      },
      setup = {
        denols = function(_, opts)
          require("deno-nvim").setup({ server = opts })
          return true
        end,
      },
    },
  },

  -- Prevent TypeScript server conflicts
  {
    "neovim/nvim-lspconfig",
    opts = {
      servers = {
        ts_ls = {
          root_dir = function(fname)
            local util = require("lspconfig.util")
            local deno_root = util.root_pattern("deno.json", "deno.jsonc")(fname)
            if deno_root then
              return nil
            end
            return util.root_pattern("package.json", "tsconfig.json")(fname)
          end,
          single_file_support = false,
        },
      },
    },
  },

  -- Deno debugging support
  {
    "mfussenegger/nvim-dap",
    dependencies = { "rcarriga/nvim-dap-ui" },
    opts = function()
      local dap = require("dap")
      
      dap.configurations.typescript = {
        {
          type = 'pwa-node',
          request = 'launch',
          name = "Launch Deno file",
          runtimeExecutable = "deno",
          runtimeArgs = { "run", "--inspect-wait", "--allow-all" },
          program = "${file}",
          cwd = "${workspaceFolder}",
          attachSimplePort = 9229,
        },
      }
    end,
  },
}
```

### `lua/plugins/lsp.lua` - Language Server Configuration

**Purpose**: General LSP setup and language server configurations.

**Key Components**:
```lua
return {
  {
    "neovim/nvim-lspconfig",
    dependencies = {
      "mason.nvim",
      "williamboman/mason-lspconfig.nvim",
      "hrsh7th/cmp-nvim-lsp",
    },
    opts = {
      -- Global LSP settings
      diagnostics = {
        underline = true,
        update_in_insert = false,
        virtual_text = {
          spacing = 4,
          source = "if_many",
          prefix = "●",
        },
        severity_sort = true,
      },
      
      -- Auto-format settings
      autoformat = true,
      
      -- Servers configuration
      servers = {
        lua_ls = {
          settings = {
            Lua = {
              workspace = {
                checkThirdParty = false,
              },
              completion = {
                callSnippet = "Replace",
              },
            },
          },
        },
      },
    },
  },
}
```

### `lua/plugins/formatting.lua` - Code Formatting Configuration

**Purpose**: Code formatting setup using conform.nvim with Deno integration.

**Structure**:
```lua
return {
  "stevearc/conform.nvim",
  opts = {
    formatters_by_ft = {
      typescript = { "deno_fmt" },
      javascript = { "deno_fmt" },
      typescriptreact = { "deno_fmt" },
      javascriptreact = { "deno_fmt" },
      json = { "deno_fmt" },
      jsonc = { "deno_fmt" },
      markdown = { "deno_fmt" },
      lua = { "stylua" },
    },
    
    formatters = {
      deno_fmt = {
        command = "deno",
        args = { "fmt", "-" },
        stdin = true,
        condition = function(ctx)
          return vim.fn.executable("deno") == 1 and 
                 (vim.fn.filereadable(ctx.dirname .. "/deno.json") == 1 or
                  vim.fn.filereadable(ctx.dirname .. "/deno.jsonc") == 1)
        end,
      },
    },
    
    format_on_save = {
      timeout_ms = 500,
      lsp_fallback = true,
    },
  },
}
```

## Filetype-Specific Configurations

### `after/ftplugin/` - Language-Specific Settings

These files automatically load when editing specific file types.

#### `after/ftplugin/typescript.lua`

**Purpose**: TypeScript-specific editor settings and behaviors.

```lua
-- TypeScript-specific options
vim.opt_local.tabstop = 2
vim.opt_local.shiftwidth = 2
vim.opt_local.expandtab = true

-- Enable spell checking in comments
vim.opt_local.spell = true
vim.opt_local.spelllang = "en_us"

-- TypeScript-specific keybindings
local keymap = vim.keymap.set
local opts = { buffer = true, silent = true }

keymap("n", "<leader>to", "<cmd>TypescriptOrganizeImports<cr>", 
       vim.tbl_extend("force", opts, { desc = "Organize imports" }))
keymap("n", "<leader>tr", "<cmd>TypescriptRenameFile<cr>", 
       vim.tbl_extend("force", opts, { desc = "Rename file" }))
keymap("n", "<leader>ta", "<cmd>TypescriptAddMissingImports<cr>", 
       vim.tbl_extend("force", opts, { desc = "Add missing imports" }))

-- Auto-commands for TypeScript files
local autocmd = vim.api.nvim_create_autocmd
local augroup = vim.api.nvim_create_augroup("typescript_settings", { clear = true })

-- Deno-specific type checking
autocmd("BufWritePost", {
  group = augroup,
  buffer = 0,
  callback = function()
    if vim.fn.executable("deno") == 1 and 
       (vim.fn.filereadable("deno.json") == 1 or 
        vim.fn.filereadable("deno.jsonc") == 1) then
      vim.cmd("silent !deno check " .. vim.fn.expand("%"))
    end
  end,
})
```

## Project-Specific Files

### `deno.json` - Deno Project Configuration

**Purpose**: Deno project configuration, tasks, and import maps.

**Location**: Project root directory

**Structure**:
```json
{
  "lock": false,
  "tasks": {
    "dev": "deno run --watch --allow-net --allow-read --allow-write main.ts",
    "start": "deno run --allow-net --allow-read main.ts", 
    "test": "deno test --allow-all",
    "bench": "deno bench --allow-all",
    "lint": "deno lint",
    "fmt": "deno fmt",
    "check": "deno check **/*.ts"
  },
  "imports": {
    "@std/": "https://deno.land/std@0.208.0/",
    "@oak/oak": "jsr:@oak/oak@^14.2.0",
    "@fresh/core": "jsr:@fresh/core@^2.0.0"
  },
  "compilerOptions": {
    "allowJs": true,
    "lib": ["deno.window", "dom", "dom.iterable"],
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  },
  "fmt": {
    "useTabs": false,
    "lineWidth": 100,
    "indentWidth": 2,
    "singleQuote": false,
    "exclude": ["coverage/", "dist/"]
  },
  "lint": {
    "rules": {
      "tags": ["recommended"],
      "include": ["ban-untagged-todo"],
      "exclude": ["no-unused-vars"]
    },
    "exclude": ["coverage/", "dist/"]
  }
}
```

## Data and Cache Directories

### `~/.local/share/nvim/` - Neovim Data Directory

```
~/.local/share/nvim/
├── lazy/                               # Plugin installations
│   ├── lazy.nvim/                      # Plugin manager
│   ├── LazyVim/                        # LazyVim distribution
│   ├── nvim-lspconfig/                 # LSP configurations
│   ├── nvim-treesitter/                # Syntax highlighting
│   └── ...                            # Other plugins
├── mason/                              # LSP server installations
│   ├── bin/                           # LSP server binaries
│   ├── packages/                      # Installed packages
│   └── registries/                    # Package registries
└── site/                              # Site-specific data
    └── pack/                          # Package data
```

### `~/.cache/nvim/` - Cache Directory

```
~/.cache/nvim/
├── luac/                              # Compiled Lua cache
├── swap/                              # Swap files (if enabled)
├── undo/                              # Undo history files
└── backup/                            # Backup files (if enabled)
```

## File Loading Order and Priority

1. **`init.lua`** - Bootstrap and plugin manager setup
2. **`lua/config/lazy.lua`** - Plugin manager configuration  
3. **LazyVim core plugins** - Base functionality
4. **`lua/config/options.lua`** - Global options
5. **`lua/config/autocmds.lua`** - Automatic commands
6. **`lua/config/keymaps.lua`** - Global keybindings
7. **`lua/plugins/*.lua`** - User plugin configurations
8. **`after/ftplugin/*.lua`** - Filetype-specific settings (when opening files)

## Customization Guidelines

### Adding New Plugins

1. Create a new file in `lua/plugins/` or add to existing file
2. Use LazyVim's plugin specification format
3. Include proper lazy loading configuration
4. Document keybindings and configuration options

### Modifying Existing Plugins

1. Create override in `lua/plugins/` directory
2. Use the same plugin name to override defaults
3. Merge configurations using `opts` function
4. Test changes don't break existing functionality

### Creating Filetype Configurations

1. Add files to `after/ftplugin/[filetype].lua`
2. Use `vim.opt_local` for buffer-local settings
3. Create filetype-specific keybindings with `buffer = true`
4. Add relevant auto-commands for the filetype

This file structure provides a maintainable, performant, and extensible Neovim configuration optimized for Deno development while maintaining compatibility with other programming languages and workflows.