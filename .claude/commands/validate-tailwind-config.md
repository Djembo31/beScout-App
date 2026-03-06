---
description: Validates Tailwind CSS configuration and catches potential errors before build
allowed-tools: Read, Grep, Glob, LS
model: auto
---

{
  "id": "validate-tailwind-config",
  "name": "Validate Tailwind Configuration",
  "description": "Validates Tailwind CSS configuration and catches potential errors before build",
  "category": "validation",
  "tags": ["tailwind", "css", "validation", "config"],
  "allowedTools": ["Read", "Grep", "Glob", "LS"],
  "model": "auto",
  "content": "# Validate Tailwind Configuration\n\nPerform a comprehensive validation of the Tailwind CSS setup in this project.\n\n## Validation Steps\n\n### 1. Configuration File Check\n- Locate tailwind.config.js/ts/mjs file\n- Verify it exports a valid configuration object\n- Check for syntax errors or invalid options\n\n### 2. Theme Extension Validation\n- Identify all custom utilities used in the codebase (bg-background, text-foreground, etc.)\n- Cross-reference with theme.extend in config\n- List any undefined utilities that will cause errors\n\n### 3. CSS Variable Validation\n- If using CSS variables in config (var(--name)), verify they're defined\n- Check :root selector in CSS files\n- Verify dark mode variables if applicable\n\n### 4. Content Path Validation\n- Check the 'content' array in config\n- Verify paths match actual file locations\n- Warn if files might be missed\n\n### 5. PostCSS Configuration\n- Check for postcss.config.js\n- Verify Tailwind plugin is included\n- Check plugin order (Tailwind should be early)\n\n### 6. Package Dependencies\n- Verify tailwindcss is installed\n- Check version (especially v3 vs v4)\n- Verify autoprefixer and postcss are installed\n\n### 7. Tailwind Directives\n- Find main CSS file\n- Verify @tailwind directives are present\n- Check for @layer usage if custom CSS exists\n\n### 8. Common Errors to Catch\n\n#### Error Type 1: Unknown Utility Classes\n```\nCannot apply unknown utility class `bg-background`\n```\n**Check:** Is 'background' defined in theme.extend.colors?\n\n#### Error Type 2: Missing CSS Variables\n```\nCSS variable --background is not defined\n```\n**Check:** Are all referenced variables defined in :root?\n\n#### Error Type 3: Invalid Config\n```\nTailwind config is invalid\n```\n**Check:** Syntax errors, wrong export format\n\n## Output Format\n\nProvide results as:\n\n✅ **Valid:** [What's correct]\n❌ **Errors:** [What will break the build]\n⚠️ **Warnings:** [What might cause issues]\n💡 **Fixes:** [Exact code to add/change]\n\n## Priority Focus\n\n1. **Undefined utility classes** - These cause immediate build errors\n2. **Missing configuration** - No config file when Tailwind is used\n3. **CSS variable mismatches** - Config references undefined variables\n4. **Version conflicts** - v3 config with v4 or vice versa"
}