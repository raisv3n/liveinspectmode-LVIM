# LiveInspectMode (LVIM)

> ⚠️ **Beta** — This extension is in active development. Features may change and bugs may appear. Use on non-production pages.

A Chrome Extension for visual web page inspection, editing, and reverse engineering. Toggle edit mode on any webpage, select elements, and modify styles directly.



## ✨ Features

### Core Editing
- **Edit Mode Toggle** — Enable/disable page editing with one click
- **Element Selection** — Hover to preview, click to select (Shift+Click for parent element)
- **Visual Outlines** — Clear hover (tan) and selection (dark olive) indicators
- **Inline Text Editing** — Click any text element to edit directly on the page

### Style Editing Toolbar
- **Text Color** — Change font color with color picker
- **Background Color** — Modify element backgrounds
- **Font Size** — Adjust text size (8px - 200px)
- **Font Family** — 11 fonts including system fonts (Arial, Georgia) and Google Fonts (Inter, Roboto, Poppins)
- **Apply to All** — Apply current styles to all matching elements
- **Reset** — Restore original styles per element or all changes

### Find & Navigate
- **Element Selector Display** — Shows CSS selector (e.g., `p.leading-relaxed`)
- **Find All** — Discover all visually similar elements on the page
- **Match Highlighting** — Cyan dashed outlines on all matches
- **Scrollbar Markers** — Visual indicators showing match positions
- **Prev/Next Navigation** — Cycle through matches with smooth scrolling

## 🚀 Installation

### From Source (Developer Mode)

1. Clone this repository:
```bash
git clone https://github.com/raisv3n/liveinspectmode-LVIM.git
cd liveinspectmode-LVIM
```

2. Open Chrome and navigate to:
```
chrome://extensions/
```

3. Enable **Developer mode** (toggle in top-right)

4. Click **Load unpacked**

5. Select the `liveinspectmode-LVIM` folder

6. The extension icon will appear in your toolbar

## 📖 Usage

### Basic Editing

1. Click the extension icon in your toolbar
2. Toggle **Edit Mode** ON
3. Hover over elements to see the tan outline
4. Click to select (dark olive outline appears)
5. Use the floating toolbar to:
   - Change colors
   - Adjust font size
   - Change font family
   - Apply styles to all similar elements
6. Click outside the element to deselect
7. Toggle Edit Mode OFF when done

### Finding Similar Elements

1. Select any element
2. Click **Find** in the toolbar
3. All matching elements get cyan dashed outlines
4. Use **‹ ›** buttons to navigate between matches
5. Click scrollbar markers to jump to specific matches

### Keyboard Shortcuts

- **Shift + Click** — Select parent element instead of child

## 🎨 Color Palette

The extension uses a warm, aesthetic color scheme:

- **Dark**: `#535040` (selection outline, accent buttons)
- **Light**: `#f0eee4` (toolbar background)
- **Accent**: `#c5b1a0` (hover outline, highlights)

## 🛠️ Development

### File Structure
```
├── manifest.json      # Extension configuration
├── background.js      # Service worker
├── content.js         # Main editing logic (injected into pages)
├── popup.html         # Extension popup UI
├── popup.js           # Popup logic
├── styles.css         # Overlay styles
└── icons/             # Extension icons
```

### Key Components

- **content.js** — Core functionality:
  - `getSelectorSummary()` — Builds CSS selectors filtering utility classes
  - `applyStylesToAll()` — Applies styles to matching elements
  - `findAllMatches()` — Discovers and highlights similar elements

### State Management
The extension maintains internal state for:
- Selected element
- Original content (for reset)
- Edited elements tracking
- Font loading
- Match results and navigation index

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m "Add feature"`
4. Push to branch: `git push origin feature-name`
5. Open a Pull Request

## 📄 License

MIT License - feel free to use and modify!

## 🙏 Acknowledgments

- Google Fonts for typography options
- Chrome Extensions API documentation
- Tailwind CSS class filtering inspiration

---

Built with ❤️ for web designers, developers, and content creators who need to quickly inspect and edit web content.
