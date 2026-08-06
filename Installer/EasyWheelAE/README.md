# EasyWheelAE - Adobe After Effects CEP Extension

This directory contains the Adobe Common Extensibility Platform (CEP) extension panel for EasyWheelAE. The extension bootstraps inside Adobe After Effects and acts as the interface client between After Effects' scripting engine (ExtendScript) and the external EasyWheel desktop application.

---

## Technical Specifications

- **Host Application**: Adobe After Effects 2021 (v18.x) and newer
- **Technology Stack**: CEP 10.0, HTML5, CSS3, JavaScript (ES6), ExtendScript (JSX)
- **Node.js Integration**: Enabled (`--enable-nodejs`)
- **Casing Protocol**: camelCase

---

## Directory Structure

```
extension/
├── CSXS/
│   └── manifest.xml        # Panel extension metadata configuration
├── client/
│   ├── index.html          # Panel UI (dark theme layout)
│   ├── index.css           # Styling (matching After Effects native panel)
│   └── index.js            # CEP Environment Verification and log outputs
├── jsx/
│   └── bootstrap.jsx       # ExtendScript bootstrap loading endpoints
├── icons/
│   └── icon-normal.png     # Panel menu icon
├── installer/
│   ├── enable_debug.bat    # Windows registry helper for CEP unsigned panels
│   ├── install.bat         # Automatic CEP installer script
│   └── uninstall.bat       # Automatic CEP uninstaller script
└── README.md               # Documentation
```

---

## Installation & Deployment

### Quick Install (Windows)

1. Double-click the `installer\install.bat` script.
2. The installer will:
   - Create the target folder at `%APPDATA%\Adobe\CEP\extensions\EasyWheelAE`.
   - Copy the panel components recursively.
   - Configure your Windows Registry settings to enable `PlayerDebugMode` (allowing unsigned panels).
3. Restart Adobe After Effects.
4. Launch the panel from the menu: **Window** -> **Extensions (Legacy)** -> **EasyWheelAE**.

---

## Development Workflow

### Enabling Debugging Manually

Unsigned panels require `PlayerDebugMode` enabled. The `installer\enable_debug.bat` runs this command automatically:

```cmd
reg add "HKCU\Software\Adobe\CSXS.10" /v PlayerDebugMode /t REG_SZ /d 1 /f
```

### Inspecting the Panel

To open Chromium Developer Tools and debug the HTML/CSS/JS frontend inside After Effects:
1. Ensure a file named `.debug` is present in the root extension directory (defining debug ports).
2. Open Google Chrome or a Chromium-based browser.
3. Navigate to `http://localhost:8088` (or the port defined in `.debug`) to inspect the console, network requests, and DOM tree.

---

## Troubleshooting

### Extension is not visible in After Effects
- Confirm the files are copied correctly to `%APPDATA%\Adobe\CEP\extensions\EasyWheelAE`.
- Ensure registry keys are set (run `enable_debug.bat`).
- Ensure you are checking the **Window -> Extensions (Legacy)** menu.

### Panel is blank
- Right-click inside the panel and select "Reload" if needed, or attach Chromium Developer Tools to check for Javascript syntax or import errors.
