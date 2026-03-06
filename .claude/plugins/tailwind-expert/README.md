# Tailwind CSS Expert Plugin

> Proactive CSS error detection and Tailwind CSS expertise for Claude Code

## Overview

The Tailwind CSS Expert plugin provides real-time validation and error detection for Tailwind CSS projects, catching configuration and utility class errors **before** you run your build commands. This plugin specifically addresses the common frustration of discovering CSS errors only after running `npm/pnpm/yarn dev`.

## Key Features

### 🚨 Proactive Error Detection

Catches the exact errors you would see during build, but at edit time:

- **Unknown utility classes**: `Cannot apply unknown utility class 'bg-background'`
- **Missing configuration**: Undefined custom utilities in `tailwind.config.ts`
- **CSS variable mismatches**: References to undefined CSS variables
- **Tailwind v4 compatibility**: Version-specific issues and migration guidance

### 🎯 Real-Time Validation

Two powerful hooks validate your code as you work:

1. **Tailwind Validator Hook**: Validates utility classes during file editing
2. **Pre-Build Validator Hook**: Comprehensive project validation before build commands

### 📚 Comprehensive Templates

- **validate-config**: Validates entire Tailwind setup
- **check-utilities**: Scans and validates all utility classes
- **tailwind-v4-migration**: Helps migrate from v3 to v4
- **fix-custom-utilities**: Automatically fixes undefined utilities
- **setup-tailwind**: Complete Tailwind CSS setup guide

### 🤖 CSS Analyzer Agent

A specialized agent that performs static CSS analysis without running builds, identifying issues and suggesting fixes.

## Installation

### Via Interactive Wizard (Recommended)

```bash
claude-setup init
# Select "🎨 Frontend Bundle" which includes:
# - Frontend Expert
# - Tailwind CSS Expert
# - shadcn/ui Style Expert
```

### Direct Installation

```bash
claude-setup add tailwind-expert
```

## How It Works

### Example: Catching Undefined Utilities

When you write code with undefined Tailwind utilities:

```jsx
// Your React component
<div className="bg-background text-foreground">
  Content
</div>
```

**Without this plugin**: You discover the error only after running `pnpm dev`:
```
[vite] Internal server error: Cannot apply unknown utility class `bg-background`
```

**With this plugin**: The error is caught immediately during editing:
```
🚨 Tailwind CSS Error: Unknown utility classes detected
File: src/components/Header.tsx

Cannot apply unknown utility classes:
  • `bg-background`
  • `text-foreground`

This is the exact error you would see when running `pnpm dev`!

To fix this, add to your tailwind.config.ts:
theme: {
  extend: {
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
    }
  }
}
```

### Pre-Build Validation

Before running any build command (`npm run dev`, `pnpm build`, etc.), the plugin validates:

- Tailwind configuration exists and is valid
- Required dependencies are installed
- CSS variables are defined
- PostCSS is configured correctly
- No undefined utility classes in the codebase

## Common Issues Solved

### 1. Tailwind CSS v4 @theme Directive

**Problem**: Custom utilities defined with `@theme` don't automatically create utility classes.

**Solution**: The plugin detects this pattern and suggests proper configuration.

### 2. Missing CSS Variables

**Problem**: Tailwind config references CSS variables that aren't defined.

**Solution**: The plugin checks both configuration and CSS files, ensuring alignment.

### 3. Dark Mode Setup

**Problem**: Dark mode utilities not working as expected.

**Solution**: Templates and validation for proper dark mode configuration.

## Commands Available After Installation

Once installed, you'll have access to these slash commands in Claude Code:

- `/validate-tailwind-config` - Run comprehensive validation
- `/check-tailwind-utilities` - Scan all utility classes
- `/tailwind-v4-migration` - Get migration assistance
- `/fix-custom-utilities` - Auto-fix undefined utilities
- `/setup-tailwind` - Complete setup guide

## Integration with Other Plugins

Works seamlessly with:

- **Frontend Expert**: Enhanced frontend development features
- **shadcn/ui Style Expert**: Component library styling
- **Code Quality**: General code improvements

## Requirements

- Node.js project with package.json
- Tailwind CSS or planning to use Tailwind CSS
- Claude Code installed and configured

## Configuration

The plugin respects your existing Tailwind configuration and provides suggestions based on your setup. No additional configuration required beyond standard Tailwind CSS setup.

## Troubleshooting

### Plugin not detecting errors?

1. Ensure the plugin is installed: `claude-setup list`
2. Check hooks are registered in `~/.claude/settings.json`
3. Verify Tailwind is in your project dependencies

### False positives?

The plugin is conservative and may warn about dynamic classes. You can:
- Use safelist in Tailwind config for dynamic classes
- Ignore warnings for intentionally dynamic patterns

## Contributing

This plugin is part of the claude-code-setup project. Contributions welcome!

## License

MIT