// WYSIWYG Page Editor - Content Script
// Handles element selection, editing, and export functionality

(function() {
  'use strict';

  // ============================================
  // STATE MANAGEMENT
  // ============================================
  
  let state = {
    editMode: false,
    selectedElement: null,
    originalContent: new Map(),
    editedElements: new Set(),
    hoveredElement: null,
    loadedFonts: new Set(),
    matchResults: [],
    currentMatchIndex: 0
  };

  // ============================================
  // STYLE CONSTANTS
  // ============================================
  
  const HOVER_BORDER = '2px solid #c5b1a0';
  const SELECTED_BORDER = '3px solid #535040';

  // ============================================
  // TOOLBAR CREATION
  // ============================================
  
  function createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'wysiwyg-toolbar';
    toolbar.className = 'wysiwyg-toolbar';
    toolbar.innerHTML = `
      <div class="toolbar-row" id="selectorRow">
        <div id="selectorDisplay"></div>
      </div>
      <div class="toolbar-row">
        <label class="toolbar-label">
          <input type="color" id="textColorPicker" value="#000000" title="Text Color">
        </label>
        <label class="toolbar-label">
          <input type="color" id="bgColorPicker" value="#ffffff" title="Background Color">
        </label>
        <label class="toolbar-label">
          <input type="number" id="fontSizeInput" min="8" max="200" value="16" title="Font Size">
          <span>px</span>
        </label>
        <select id="fontFamilySelect" title="Font Family">
          <option value="">Font</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
          <option value="Inter">Inter</option>
          <option value="Roboto">Roboto</option>
          <option value="Poppins">Poppins</option>
          <option value="Montserrat">Montserrat</option>
          <option value="Playfair Display">Playfair Display</option>
          <option value="Lato">Lato</option>
        </select>
      </div>
      <div class="toolbar-divider"></div>
      <div class="toolbar-row">
        <button class="toolbar-btn accent-btn" id="applyToAllBtn" title="Apply to All">All</button>
        <button class="toolbar-btn accent-btn" id="findAllBtn" title="Find All Matching">Find</button>
        <button class="toolbar-btn" id="prevMatchBtn" title="Previous Match" style="display:none;">&#8249;</button>
        <span id="matchCounter" style="display:none;">0/0</span>
        <button class="toolbar-btn" id="nextMatchBtn" title="Next Match" style="display:none;">&#8250;</button>
        <button class="toolbar-btn" id="resetElementBtn" title="Reset">↩</button>
        <button class="toolbar-btn close-btn" id="closeToolbarBtn" title="Close">✕</button>
      </div>
    `;
    toolbar.style.cssText = 'position:fixed;display:flex;flex-direction:column;gap:6px;padding:10px 12px;background:#f0eee4;border:1px solid #c5b1a0;border-radius:8px;box-shadow:0 4px 20px rgba(83,80,64,0.18);z-index:2147483647;min-width:220px;top:0;left:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important;';
    toolbar.setAttribute('data-wysiwyg', 'true');
    return toolbar;
  }

  function createStyles() {
    const style = document.createElement('style');
    style.id = 'wysiwyg-styles';
    style.textContent = `
      #wysiwyg-toolbar { color: #535040 !important; }
      #wysiwyg-toolbar * { font-size: 11px !important; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; }
      .toolbar-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .toolbar-divider { height: 1px; background: #c5b1a0; margin: 2px 0; }
      .toolbar-label { display: flex; align-items: center; gap: 3px; color: #535040 !important; }
      .toolbar-label input[type="color"] { width: 24px !important; height: 24px !important; border: 2px solid #c5b1a0 !important; border-radius: 4px !important; cursor: pointer; padding: 0; background: #f0eee4 !important; }
      .toolbar-label input[type="number"] { width: 38px !important; padding: 3px 5px !important; border: 1px solid #c5b1a0 !important; border-radius: 4px !important; font-size: 11px !important; background: #fff !important; color: #535040 !important; }
      .toolbar-label span { color: #535040 !important; font-size: 10px !important; font-weight: 600 !important; }
      .toolbar-row select { padding: 3px 6px !important; border: 1px solid #c5b1a0 !important; border-radius: 4px !important; font-size: 10px !important; background: #fff !important; color: #535040 !important; cursor: pointer !important; }
      #selectorDisplay { font-size: 10px !important; color: #535040 !important; word-break: break-all; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: rgba(197,177,160,0.15); padding: 2px 6px; border-radius: 3px; font-family: "SF Mono", Monaco, "Cascadia Code", monospace !important; letter-spacing: 0.3px; }
      .toolbar-btn { padding: 4px 8px !important; border: 1px solid #c5b1a0 !important; border-radius: 4px !important; cursor: pointer !important; font-size: 10px !important; font-weight: 600 !important; background: #fff !important; color: #535040 !important; transition: all 0.15s ease !important; }
      .toolbar-btn:hover { background: #f0eee4 !important; border-color: #535040 !important; }
      .accent-btn { background: #535040 !important; color: #f0eee4 !important; border-color: #535040 !important; }
      .accent-btn:hover { background: #6b6855 !important; }
      .close-btn { background: transparent !important; color: #535040 !important; border-color: #c5b1a0 !important; }
      .close-btn:hover { background: #535040 !important; color: #f0eee4 !important; }
      #matchCounter { font-size: 10px !important; color: #535040 !important; font-weight: 600; min-width: 30px; text-align: center; }
      .wysiwyg-hover { outline: 2px solid #c5b1a0 !important; outline-offset: -2px !important; position: relative; z-index: 2147483646 !important; }
      .wysiwyg-selected { outline: 3px solid #535040 !important; outline-offset: -3px !important; position: relative; z-index: 2147483647 !important; }
      .wysiwyg-content-editable { cursor: text !important; }
      .wysiwyg-match { outline: 2px dashed #c5b1a0 !important; outline-offset: -2px !important; }
    `;
    return style;
  }

  // ============================================
  // ELEMENT TRACKING
  // ============================================
  
  function storeOriginalContent(element) {
    if (!state.originalContent.has(element)) {
      state.originalContent.set(element, {
        html: element.innerHTML,
        text: element.textContent,
        styles: element.getAttribute('style') || ''
      });
    }
  }

  function isEditableElement(element) {
    const tagName = element.tagName.toLowerCase();
    const editableTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'div', 'a', 'label', 'li', 'td', 'th', 'blockquote', 'code', 'pre', 'section', 'article', 'header', 'footer', 'nav', 'aside', 'main'];
    return editableTags.includes(tagName) || element.isContentEditable;
  }

  function isInteractiveElement(element) {
    const tagName = element.tagName.toLowerCase();
    const excludedTags = ['script', 'style', 'noscript', 'iframe', 'canvas', 'video', 'audio', 'svg'];
    return !excludedTags.includes(tagName);
  }

  // ============================================
  // ELEMENT SELECTION
  // ============================================
  
  function clearHoverState() {
    if (state.hoveredElement && state.hoveredElement !== state.selectedElement) {
      state.hoveredElement.classList.remove('wysiwyg-hover');
      state.hoveredElement = null;
    }
  }

  function handleHover(event) {
    if (!state.editMode) return;
    const target = event.target;
    if (!isInteractiveElement(target)) return;
    clearHoverState();
    if (target !== state.selectedElement) {
      target.classList.add('wysiwyg-hover');
      state.hoveredElement = target;
    }
  }

  function selectElement(element) {
    if (state.selectedElement) {
      deselectElement();
    }
    state.selectedElement = element;
    storeOriginalContent(element);
    state.editedElements.add(element);
    element.classList.add('wysiwyg-selected');
    showToolbar(element);
  }

  function deselectElement() {
    if (state.selectedElement) {
      state.selectedElement.classList.remove('wysiwyg-selected');
      state.selectedElement.classList.remove('wysiwyg-content-editable');
      state.selectedElement.contentEditable = false;
      state.selectedElement = null;
    }
    removeScrollMarkers();
    hideToolbar();
  }

  function handleClick(event) {
    if (!state.editMode) return;
    
    // Ignore clicks on the toolbar
    if (toolbar && toolbar.contains(event.target)) return;
    
    let target = event.target;

    // FEATURE 4: Parent Selection (Shift + Click)
    if (event.shiftKey && target.parentElement) {
      const parentTag = target.parentElement.tagName.toLowerCase();
      if (!['body', 'html'].includes(parentTag)) {
        target = target.parentElement;
      }
    }
    
    // Prevent clicking through links
    if (target.tagName.toLowerCase() === 'a') {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (!isInteractiveElement(target)) return;
    
    // Select new element
    selectElement(target);
    
    // Enable text editing for editable elements
    if (isEditableElement(target)) {
      enableTextEditing(target);
    }
  }

  function findEditableParent(element) {
    let current = element;
    while (current && current !== document.body) {
      if (isEditableElement(current)) {
        return current;
      }
      current = current.parentElement;
    }
    return element;
  }

  function enableTextEditing(element) {
    element.contentEditable = true;
    element.classList.add('wysiwyg-content-editable');
    element.focus();
  }

  // ============================================
  // TOOLBAR FUNCTIONALITY
  // ============================================
  
  let toolbar = null;
  let toolbarEventsAttached = false;

  function showToolbar(element) {
    if (!toolbar) {
      toolbar = createToolbar();
      document.body.appendChild(toolbar);
    }
    
    if (!toolbarEventsAttached) {
      toolbar.dataset.attached = 'true';
      attachToolbarEvents();
      toolbarEventsAttached = true;
    }
    
    // Always show in fixed corner position
    toolbar.style.position = 'fixed';
    toolbar.style.left = 'auto';
    toolbar.style.right = '10px';
    toolbar.style.top = '10px';
    toolbar.style.bottom = 'auto';
    toolbar.style.display = 'flex';
    
    // Update selector display
    const selectorDisplay = document.getElementById('selectorDisplay');
    if (selectorDisplay) {
      const info = getSelectorSummary(element);
      selectorDisplay.textContent = info.full;
      selectorDisplay.title = info.full;
    }
    
    initializeToolbarValues(element);
  }

  function hideToolbar() {
    if (toolbar) {
      toolbar.classList.remove('visible');
    }
  }

  function initializeToolbarValues(element) {
    const textColorPicker = document.getElementById('textColorPicker');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const fontSizeInput = document.getElementById('fontSizeInput');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    
    const computedStyle = window.getComputedStyle(element);
    
    const color = computedStyle.color;
    textColorPicker.value = (color && color !== 'rgba(0, 0, 0, 0)') ? rgbToHex(color) || '#000000' : '#000000';
    
    const bgColor = computedStyle.backgroundColor;
    bgColorPicker.value = (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') ? rgbToHex(bgColor) || '#ffffff' : '#ffffff';
    
    const fontSize = computedStyle.fontSize;
    fontSizeInput.value = parseInt(fontSize) || 16;
    
    const fontFamily = computedStyle.fontFamily;
    if (fontFamily) {
      const fonts = fontFamily.replace(/['"]/g, '').split(',').map(f => f.trim());
      fontFamilySelect.value = fonts[0] || '';
    }
  }

  function rgbToHex(rgb) {
    if (!rgb || rgb.startsWith('#')) return rgb;
    const match = rgb.match(/\d+/g);
    if (!match || match.length < 3) return null;
    const r = parseInt(match[0]);
    const g = parseInt(match[1]);
    const b = parseInt(match[2]);
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function attachToolbarEvents() {
    const textColorPicker = document.getElementById('textColorPicker');
    const bgColorPicker = document.getElementById('bgColorPicker');
    const fontSizeInput = document.getElementById('fontSizeInput');
    const fontFamilySelect = document.getElementById('fontFamilySelect');
    const applyToAllBtn = document.getElementById('applyToAllBtn');
    const findAllBtn = document.getElementById('findAllBtn');
    const prevMatchBtn = document.getElementById('prevMatchBtn');
    const nextMatchBtn = document.getElementById('nextMatchBtn');
    const resetElementBtn = document.getElementById('resetElementBtn');
    const closeToolbarBtn = document.getElementById('closeToolbarBtn');
    
    textColorPicker.addEventListener('input', (e) => {
      if (state.selectedElement) {
        state.selectedElement.style.setProperty('color', e.target.value, 'important');
        storeOriginalContent(state.selectedElement);
      }
    });
    
    bgColorPicker.addEventListener('input', (e) => {
      if (state.selectedElement) {
        state.selectedElement.style.setProperty('background-color', e.target.value, 'important');
        storeOriginalContent(state.selectedElement);
      }
    });
    
    fontSizeInput.addEventListener('input', (e) => {
      if (state.selectedElement) {
        state.selectedElement.style.setProperty('font-size', e.target.value + 'px', 'important');
        storeOriginalContent(state.selectedElement);
      }
    });

    fontFamilySelect.addEventListener('change', (e) => {
      if (state.selectedElement && e.target.value) {
        const fontName = e.target.value;
        if (['Inter', 'Roboto', 'Poppins', 'Montserrat', 'Playfair Display', 'Lato'].includes(fontName)) {
          loadGoogleFont(fontName);
        }
        state.selectedElement.style.setProperty('font-family', "'" + fontName + "', sans-serif", 'important');
        storeOriginalContent(state.selectedElement);
      }
    });
    
    applyToAllBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        applyStylesToAll(state.selectedElement);
      }
    });

    findAllBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        findAllMatches();
      }
    });

    prevMatchBtn.addEventListener('click', () => {
      goToPrevMatch();
    });

    nextMatchBtn.addEventListener('click', () => {
      goToNextMatch();
    });
    
    resetElementBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        resetElement(state.selectedElement);
      }
    });
    
    closeToolbarBtn.addEventListener('click', () => {
      deselectElement();
    });
  }

  // ============================================
  // FEATURE 1: APPLY STYLES TO ALL
  // ============================================

  function applyStylesToAll(element) {
    const styles = element.style.cssText;
    if (!styles) return;

    const tagName = element.tagName.toLowerCase();

    // Text-level tags: match globally by tag name only
    const textTags = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span', 'a', 'li', 'label', 'td', 'th', 'blockquote', 'button', 'strong', 'em', 'small', 'code', 'pre'];

    let targets;
    if (textTags.includes(tagName)) {
      targets = Array.from(document.querySelectorAll(tagName));
    } else {
      // Container tags (div, section, etc.): use tag + first class only
      const classList = element.className && typeof element.className === 'string'
        ? element.className.split(/\s+/).filter(c => c && !c.startsWith('wysiwyg-'))
        : [];
      const selector = classList.length > 0
        ? tagName + '.' + classList[0]
        : tagName;
      targets = Array.from(document.querySelectorAll(selector));
    }

    targets.forEach(el => {
      if (el === element) return;
      if (el.id === 'wysiwyg-toolbar' || el.id === 'wysiwyg-scroll-markers') return;
      const elTag = el.tagName.toLowerCase();
      if (['script', 'style', 'iframe'].includes(elTag)) return;
      storeOriginalContent(el);
      // Merge styles instead of overwriting
      el.style.cssText = el.style.cssText ? el.style.cssText + ';' + styles : styles;
      state.editedElements.add(el);
    });
  }

  // ============================================
  // FEATURE 2: GOOGLE FONTS
  // ============================================

  function loadGoogleFont(fontName) {
    if (state.loadedFonts.has(fontName)) return;
    const linkId = 'gf-' + fontName.replace(/\s+/g, '-');
    if (document.getElementById(linkId)) {
      state.loadedFonts.add(fontName);
      return;
    }
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + fontName.replace(/\s+/g, '+') + '&display=swap';
    document.head.appendChild(link);
    state.loadedFonts.add(fontName);
  }

  // ============================================
// FEATURE: ELEMENT SELECTOR + FIND + NAV
// ============================================

  function getSelectorSummary(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? '#' + element.id : '';
    
    // Filter out color-only utility classes, KEEP visual structure classes
    const colorOnlyPrefixes = [
      // Colors only
      'text-ink', 'text-gray', 'text-slate', 'text-zinc', 'text-neutral', 'text-stone',
      'text-red', 'text-orange', 'text-amber', 'text-yellow', 'text-lime', 'text-green',
      'text-emerald', 'text-teal', 'text-cyan', 'text-sky', 'text-blue', 'text-indigo',
      'text-violet', 'text-purple', 'text-fuchsia', 'text-pink', 'text-rose',
      'bg-gray', 'bg-slate', 'bg-zinc', 'bg-neutral', 'bg-stone',
      'bg-red', 'bg-orange', 'bg-amber', 'bg-yellow', 'bg-lime', 'bg-green',
      'bg-emerald', 'bg-teal', 'bg-cyan', 'bg-sky', 'bg-blue', 'bg-indigo',
      'bg-violet', 'bg-purple', 'bg-fuchsia', 'bg-pink', 'bg-rose',
      'bg-', // catch remaining bg colors
      'border-gray', 'border-red', 'border-blue', // border colors
    ];
    
    const visualClasses = element.classList.length
      ? Array.from(element.classList).filter(c => {
          if (c.startsWith('wysiwyg-')) return false;
          // Keep visual structure classes, only filter pure colors
          for (const prefix of colorOnlyPrefixes) {
            if (c.startsWith(prefix)) return false;
          }
          return true;
        })
      : [];
    
    // Build selector from tag + visual classes
    const classes = visualClasses.length ? '.' + visualClasses[0] : '';
    return { tag, id, classes, full: tag + id + (classes || '') };
  }

  function findAllMatches() {
    if (!state.selectedElement) return;
    removeScrollMarkers();

    const { tag, id, classes } = getSelectorSummary(state.selectedElement);

    // Build selector from tag + visual classes (excluding colors)
    let selector;
    if (classes) {
      // Use tag + all visual classes for precise matching
      selector = tag + classes;
    } else {
      // No visual classes — fall back to tag-only
      selector = tag;
    }

    const matches = Array.from(document.querySelectorAll(selector)).filter(el => {
      return el.id !== 'wysiwyg-toolbar' && el.id !== 'wysiwyg-scroll-markers' && !el.closest('#wysiwyg-toolbar');
    });

    state.matchResults = matches;
    state.currentMatchIndex = 0;

    highlightMatches(matches);
    createScrollMarkers(matches);

    const prevBtn = document.getElementById('prevMatchBtn');
    const nextBtn = document.getElementById('nextMatchBtn');
    const counter = document.getElementById('matchCounter');
    if (prevBtn) prevBtn.style.display = matches.length > 1 ? 'inline-block' : 'none';
    if (nextBtn) nextBtn.style.display = matches.length > 1 ? 'inline-block' : 'none';
    if (counter) {
      counter.style.display = matches.length > 0 ? 'inline' : 'none';
      counter.textContent = '1/' + matches.length;
    }

    if (matches.length > 0) focusMatch(0);
  }

  function highlightMatches(elements) {
    elements.forEach(el => {
      el.classList.add('wysiwyg-match');
    });
  }

  function createScrollMarkers(elements) {
    removeScrollMarkers();

    const container = document.createElement('div');
    container.id = 'wysiwyg-scroll-markers';
    container.style.cssText = 'position:fixed;right:2px;top:0;width:6px;height:100%;z-index:2147483647;pointer-events:none;';

    const docHeight = document.documentElement.scrollHeight;

    elements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const marker = document.createElement('div');
      marker.style.cssText = 'position:absolute;width:100%;height:4px;background:#c5b1a0;border-radius:2px;top:' + ((rect.top + window.scrollY) / docHeight * 100) + '%;cursor:pointer;pointer-events:auto;';
      marker.addEventListener('click', () => {
        focusMatch(index);
      });
      container.appendChild(marker);
    });

    document.body.appendChild(container);
  }

  function removeScrollMarkers() {
    const existing = document.getElementById('wysiwyg-scroll-markers');
    if (existing) existing.remove();
    document.querySelectorAll('.wysiwyg-match').forEach(el => {
      el.classList.remove('wysiwyg-match');
    });
    // Hide nav buttons
    const prevBtn = document.getElementById('prevMatchBtn');
    const nextBtn = document.getElementById('nextMatchBtn');
    const counter = document.getElementById('matchCounter');
    if (prevBtn) prevBtn.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';
    if (counter) counter.style.display = 'none';
  }

  function focusMatch(index) {
    if (!state.matchResults || state.matchResults.length === 0) return;
    state.currentMatchIndex = index;
    const el = state.matchResults[index];
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('wysiwyg-selected');
    setTimeout(() => {
      el.classList.remove('wysiwyg-selected');
    }, 800);
    // Update counter
    const counter = document.getElementById('matchCounter');
    if (counter) {
      counter.textContent = (index + 1) + '/' + state.matchResults.length;
    }
  }

  function goToNextMatch() {
    if (!state.matchResults.length) return;
    let nextIndex = state.currentMatchIndex + 1;
    if (nextIndex >= state.matchResults.length) nextIndex = 0;
    focusMatch(nextIndex);
  }

  function goToPrevMatch() {
    if (!state.matchResults.length) return;
    let prevIndex = state.currentMatchIndex - 1;
    if (prevIndex < 0) prevIndex = state.matchResults.length - 1;
    focusMatch(prevIndex);
  }

  // ============================================
  // RESET FUNCTIONALITY
  // ============================================

  function resetElement(element) {
    const original = state.originalContent.get(element);
    if (original) {
      element.innerHTML = original.html;
      element.style.cssText = original.styles || '';
      state.editedElements.delete(element);
    }
  }

  function resetAllChanges() {
    state.editedElements.forEach(element => {
      resetElement(element);
    });
    state.editedElements.clear();
    state.originalContent.clear();
    deselectElement();
  }

  function clearAll() {
    resetAllChanges();
    disableEditMode();
  }

  // ============================================
  // EDIT MODE TOGGLE
  // ============================================

  function enableEditMode() {
    state.editMode = true;
    document.addEventListener('mouseover', handleHover, true);
    document.addEventListener('mouseout', clearHoverState, true);
    document.addEventListener('click', handleClick, false);
    document.body.classList.add('wysiwyg-active');
  }

  function disableEditMode() {
    state.editMode = false;
    deselectElement();
    clearHoverState();
    removeScrollMarkers();
    document.removeEventListener('mouseover', handleHover, true);
    document.removeEventListener('mouseout', clearHoverState, true);
    document.removeEventListener('click', handleClick, false);
    document.body.classList.remove('wysiwyg-active');
  }

  function toggleEditMode(enabled) {
    if (enabled) {
      enableEditMode();
    } else {
      disableEditMode();
    }
    return { editMode: state.editMode };
  }

  // ============================================
  // EXPORT FUNCTIONALITY
  // ============================================

  function exportHtml() {
    const clone = document.documentElement.cloneNode(true);
    const toolbar = clone.querySelector('#wysiwyg-toolbar');
    if (toolbar) toolbar.remove();
    
    const selectedElements = clone.querySelectorAll('.wysiwyg-selected, .wysiwyg-hover, .wysiwyg-content-editable, .wysiwyg-match');
    selectedElements.forEach(el => {
      el.classList.remove('wysiwyg-selected', 'wysiwyg-hover', 'wysiwyg-content-editable', 'wysiwyg-match');
      if (el.isContentEditable) {
        el.removeAttribute('contenteditable');
      }
    });
    
    const bodyContent = document.body.cloneNode(true);
    bodyContent.querySelectorAll('#wysiwyg-toolbar, #wysiwyg-scroll-markers').forEach(el => el.remove());
    bodyContent.querySelectorAll('.wysiwyg-selected, .wysiwyg-hover, .wysiwyg-content-editable, .wysiwyg-match').forEach(el => {
      el.classList.remove('wysiwyg-selected', 'wysiwyg-hover', 'wysiwyg-content-editable', 'wysiwyg-match');
    });

    let fontLinks = '';
    if (state.loadedFonts.size > 0) {
      state.loadedFonts.forEach(fontName => {
        fontLinks += '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=' + fontName.replace(/\s+/g, '+') + '&display=swap">\n';
      });
    }

    if (fontLinks) {
      return '<!-- Google Fonts -->\n' + fontLinks + '\n' + bodyContent.innerHTML;
    }
    return bodyContent.innerHTML;
  }

  function exportJson() {
    const elements = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
          const tagName = node.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'iframe', 'template'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (node.style.display === 'none' || node.style.visibility === 'hidden') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    let node;
    const processedTexts = new Set();
    
    while (node = walker.nextNode()) {
      const tagName = node.tagName.toLowerCase();
      
      if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'li', 'td', 'th', 'blockquote'].includes(tagName)) {
        const text = node.textContent.trim();
        if (text && !processedTexts.has(text)) {
          processedTexts.add(text);
          elements.push({ tag: tagName, text: text, styles: extractStyles(node) });
        }
      }
      
      if (tagName === 'img') {
        const src = node.src;
        const alt = node.alt || '';
        if (src && !src.startsWith('data:')) {
          elements.push({ tag: 'img', src: src, alt: alt });
        }
      }
      
      if (tagName === 'svg') {
        elements.push({ tag: 'svg', content: node.outerHTML });
      }
      
      if (tagName === 'a') {
        const text = node.textContent.trim();
        const href = node.href;
        if (text && href) {
          elements.push({ tag: 'a', text: text, href: href, styles: extractStyles(node) });
        }
      }
      
      if (tagName === 'button') {
        const text = node.textContent.trim();
        if (text) {
          elements.push({ tag: 'button', text: text, styles: extractStyles(node) });
        }
      }
    }
    return { elements };
  }

  function extractStyles(element) {
    const styles = {};
    const computedStyle = window.getComputedStyle(element);
    const color = computedStyle.color;
    if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'rgb(0, 0, 0)') {
      styles.color = rgbToHex(color) || color;
    }
    const bgColor = computedStyle.backgroundColor;
    if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
      styles.backgroundColor = rgbToHex(bgColor) || bgColor;
    }
    const fontSize = computedStyle.fontSize;
    if (fontSize && fontSize !== '16px') {
      styles.fontSize = fontSize;
    }
    const fontWeight = computedStyle.fontWeight;
    if (fontWeight && fontWeight !== '400') {
      styles.fontWeight = fontWeight;
    }
    const textAlign = computedStyle.textAlign;
    if (textAlign && textAlign !== 'start' && textAlign !== 'left') {
      styles.textAlign = textAlign;
    }
    return Object.keys(styles).length > 0 ? styles : undefined;
  }

  // ============================================
  // MESSAGE HANDLING
  // ============================================

  function handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'toggleEditMode':
        const result = toggleEditMode(message.enabled);
        sendResponse(result);
        break;
      case 'getState':
        sendResponse({ editMode: state.editMode });
        break;
      case 'resetChanges':
        resetAllChanges();
        sendResponse({ message: 'All changes reset' });
        break;
      case 'clearAll':
        clearAll();
        sendResponse({ message: 'All cleared' });
        break;
      case 'exportHtml':
        const htmlData = exportHtml();
        sendResponse({ data: htmlData });
        break;
      case 'exportJson':
        const jsonData = exportJson();
        sendResponse({ data: jsonData });
        break;
      default:
        sendResponse({ error: 'Unknown action' });
    }
    return true;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  function initialize() {
    const styles = createStyles();
    document.head.appendChild(styles);
    chrome.runtime.onMessage.addListener(handleMessage);

    // Deselect when clicking outside element and outside toolbar
    document.addEventListener('mousedown', (e) => {
      if (state.editMode && state.selectedElement && toolbar) {
        const clickedSelected = state.selectedElement.contains(e.target) || e.target === state.selectedElement;
        const clickedToolbar = toolbar.contains(e.target);
        if (!clickedSelected && !clickedToolbar) {
          deselectElement();
        }
      }
    });

    // Reposition toolbar on scroll
    let scrollTimeout;
    document.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (state.selectedElement && toolbar && toolbar.style.display === 'flex') {
          showToolbar(state.selectedElement);
        }
      }, 100);
    }, true);
  }

  initialize();
})();