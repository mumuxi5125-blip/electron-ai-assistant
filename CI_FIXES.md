# CI/CD Build Fixes for Electron Builder

This document explains the solutions implemented for common electron-builder CI issues.

## Problem 1: `GH_TOKEN not set` Error

### Symptom
```bash
Error: GH_TOKEN is not set, cannot publish
```

### Solution
1. **Set dummy token in CI environment**:
   ```yaml
   env:
     GH_TOKEN: ${{ secrets.GITHUB_TOKEN || 'dummy_token' }}
   ```

2. **Disable publishing in package.json**:
   ```json
   "build": {
     "publish": null
   }
   ```

3. **Use --publish never flag**:
   ```bash
   npx electron-builder --win --publish never
   ```

## Problem 2: `Cannot find module 'electron-publisher-never'`

### Symptom
```bash
Error: Cannot find module 'electron-publisher-never'
```

### Root Cause
When using `--publish never`, electron-builder looks for a publisher named "never" which doesn't exist.

### Solution
1. **Set publish to null in configuration** (as above)
2. **Use the correct command-line approach**:
   ```bash
   # Instead of --publish never
   npx electron-builder --win
   # With publish: null in config, it won't attempt to publish
   ```

## Complete GitHub Actions Workflow

The implemented workflow (`build.yml`) includes:

```yaml
name: Build Electron App
on:
  workflow_dispatch:  # Manual trigger
  push:
    tags: ['v*']      # Auto-build on version tags

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    
    - name: Install dependencies
      run: |
        npm ci
        npm install --save-dev electron-builder
    
    - name: Build Electron app
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN || 'dummy_token' }}
      run: npx electron-builder --win
    
    - name: Upload artifact
      uses: actions/upload-artifact@v3
      with:
        name: Electron-AI-Assistant-Setup
        path: dist/*.exe
```

## Alternative Solutions

### Option A: Complete Publish Configuration
If you want to enable publishing to GitHub Releases:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "your-repo"
    }
  }
}
```

And set the token in CI:
```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Option B: Conditional Publishing
For development vs production builds:

```json
{
  "scripts": {
    "build:ci": "electron-builder --win --publish never",
    "build:release": "electron-builder --win --publish always"
  }
}
```

## Testing Locally

To test the build process locally:

```bash
# Install dependencies
npm install

# Test build without publishing
npx electron-builder --win --publish never

# Or with configuration-based approach
npx electron-builder --win
```

## Troubleshooting Tips

1. **Clear cache**:
   ```bash
   rm -rf node_modules
   npm cache clean --force
   npm install
   ```

2. **Check electron-builder version**:
   ```bash
   npx electron-builder --version
   ```

3. **Verbose logging**:
   ```bash
   npx electron-builder --win --publish never --debug
   ```

4. **Platform-specific issues**:
   - Windows: Ensure NSIS is installed (included in GitHub Windows runner)
   - macOS: Requires Xcode command line tools
   - Linux: Depends on distribution-specific packages

## References

- [electron-builder CI Configuration](https://www.electron.build/configuration/publish)
- [GitHub Actions for Electron](https://www.electron.build/configuration/publish#github)
- [Common CI Issues](https://github.com/electron-userland/electron-builder/issues)