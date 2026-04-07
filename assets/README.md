# Assets Directory

Place your application icons here:

- `icon.ico` - Windows application icon (256x256 recommended)
- `icon.png` - macOS/Linux icon (1024x1024 recommended)
- `icon.icns` - macOS icon bundle

## Generating Icons

You can generate icons using tools like:
- [ICON Convert](https://convertio.co/ico-converter/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- `electron-icon-builder` package

## For Development

For development purposes, you can use a placeholder icon. Create a simple 256x256 .ico file or download one from free icon resources.

Note: The build configuration in `package.json` references `assets/icon.ico` for Windows builds.