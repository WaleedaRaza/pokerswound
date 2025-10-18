# Liquid Glass Tile System - Usage Guide

## 🎯 Overview
The Liquid Glass system provides a unified, responsive glassmorphism effect that works across all pages. All tiles respond to the same control panel variables.

---

## 📦 Basic Usage

### Simple Tile
```html
<div class="liquid-glass liquid-glass--md">
  Your content here
</div>
```

### With Color Variant
```html
<div class="liquid-glass liquid-glass--lg liquid-glass--accent">
  Orange-tinted glass tile
</div>
```

---

## 🎨 Size Modifiers

| Class | Padding | Border Radius | Use Case |
|-------|---------|---------------|----------|
| `liquid-glass--sm` | 12px 16px | 8px | Small buttons, chips |
| `liquid-glass--md` | 24px 32px | 12px | Medium cards, panels |
| `liquid-glass--lg` | 32px 40px | 16px | Large feature tiles |
| `liquid-glass--xl` | 40px 48px | 20px | Hero sections, major containers |

---

## 🌈 Color Variants

### Default (White/Neutral)
```html
<div class="liquid-glass liquid-glass--md">
  Standard frosted glass
</div>
```
- **Background**: `rgba(255, 255, 255, 0.02)`
- **Border**: `rgba(255, 255, 255, 0.08)`
- **Effect**: Neutral frosted glass

### Accent (Orange)
```html
<div class="liquid-glass liquid-glass--md liquid-glass--accent">
  Orange glow tile
</div>
```
- **Background**: `rgba(255, 81, 0, 0.08)`
- **Border**: `rgba(255, 81, 0, 0.2)`
- **Hover**: Orange shadow glow
- **Use**: Call-to-action, important features

### Teal
```html
<div class="liquid-glass liquid-glass--md liquid-glass--teal">
  Teal glow tile
</div>
```
- **Background**: `rgba(0, 212, 170, 0.08)`
- **Border**: `rgba(0, 212, 170, 0.2)`
- **Hover**: Teal shadow glow
- **Use**: Success states, positive features

### Dark
```html
<div class="liquid-glass liquid-glass--md liquid-glass--dark">
  Dark glass tile
</div>
```
- **Background**: `rgba(17, 16, 24, 0.95)`
- **Border**: `rgba(255, 255, 255, 0.05)`
- **Use**: Modals, overlays, high-contrast content

---

## ⚡ Special Modifiers

### Disable Hover Effect
```html
<div class="liquid-glass liquid-glass--md liquid-glass--no-hover">
  Static tile (no lift on hover)
</div>
```

---

## 🎛️ Control Variables

All tiles respond to these CSS variables in real-time:

| Variable | Default | Effect |
|----------|---------|--------|
| `--glass-shadow-blur` | 20px | Inner shadow blur radius |
| `--glass-shadow-spread` | -5px | Inner shadow spread |
| `--glass-shadow-color` | rgba(255,255,255,0.7) | Inner shadow color |
| `--glass-tint-opacity` | 0.05 | Glass transparency level |
| `--glass-frost-blur` | 20px | Backdrop blur amount |
| `--glass-distortion-strength` | 77 | Texture distortion intensity |
| `--glass-outer-shadow` | 24px | Outer shadow size |

### Adjust Variables Dynamically
```javascript
document.documentElement.style.setProperty('--glass-frost-blur', '30px');
document.documentElement.style.setProperty('--glass-tint-opacity', '0.08');
```

---

## 🎯 Real-World Examples

### Feature Card (index.html)
```html
<div class="feature-card liquid-glass liquid-glass--lg">
  <div class="feature-icon">🔐</div>
  <h3 class="feature-title">Provably Fair Shuffling</h3>
  <p class="feature-desc">Entropy from real-world sources</p>
</div>
```

### Sidebar Panel (index.html)
```html
<div class="why-pokergeek liquid-glass liquid-glass--lg">
  <h3>Why PokerGeek?</h3>
  <div class="why-story-full">
    <p>Content here...</p>
  </div>
</div>
```

### Call-to-Action Button
```html
<button class="liquid-glass liquid-glass--sm liquid-glass--accent">
  Play Now
</button>
```

### Modal/Dialog
```html
<div class="modal-box liquid-glass liquid-glass--xl liquid-glass--dark">
  <h2>Join Game</h2>
  <form>...</form>
</div>
```

---

## 🔧 Technical Details

### Structure
Each liquid-glass tile has:
1. **Base element**: Main container with backdrop filter
2. **::before**: Inner shadow and tint layer (z-index: 0)
3. **::after**: Distortion filter layer (z-index: -1)
4. **Content**: Your HTML content (z-index: 1)

### Hover Behavior
- **Transform**: `translateY(-2px)` (lifts tile)
- **Shadow**: Increases by 8px
- **Border**: Brightens by 50%
- **Tint**: Increases by 0.03

### Browser Support
- Modern browsers: Full support
- Safari: `-webkit-backdrop-filter` fallback
- Older browsers: Graceful degradation (solid background, no blur)

---

## ✅ Best Practices

### DO:
✅ Combine with size and color modifiers  
✅ Use consistent sizing across similar elements  
✅ Apply to containers with content inside  
✅ Test with different control panel settings  

### DON'T:
❌ Apply to elements with `position: static`  
❌ Nest liquid-glass tiles deeply (performance)  
❌ Use without border-radius (breaks effect)  
❌ Override `::before` or `::after` pseudo-elements  

---

## 🚀 Cross-Page Consistency

Since `style.css` is global, the liquid-glass system works identically across:
- `index.html`
- `play-now.html`
- `ai-solver.html`
- `analysis.html`
- `learning.html`
- `friends.html`
- `forum.html`

**Just add the class, and it works everywhere!**

---

## 🎨 Customization Examples

### Subtle Glass (Less Frosted)
```css
:root {
  --glass-frost-blur: 10px;
  --glass-tint-opacity: 0.02;
}
```

### Heavy Glass (More Frosted)
```css
:root {
  --glass-frost-blur: 40px;
  --glass-tint-opacity: 0.12;
}
```

### Sharp Glass (Less Shadow)
```css
:root {
  --glass-shadow-blur: 10px;
  --glass-shadow-spread: -2px;
}
```

### Intense Distortion
```css
:root {
  --glass-distortion-strength: 150;
}
```

---

## 📋 Quick Reference

```html
<!-- Small white glass -->
<div class="liquid-glass liquid-glass--sm">Small</div>

<!-- Medium orange glass -->
<div class="liquid-glass liquid-glass--md liquid-glass--accent">Medium Accent</div>

<!-- Large teal glass -->
<div class="liquid-glass liquid-glass--lg liquid-glass--teal">Large Teal</div>

<!-- XL dark glass, no hover -->
<div class="liquid-glass liquid-glass--xl liquid-glass--dark liquid-glass--no-hover">
  XL Dark Static
</div>
```

---

**That's it! The system handles all the complexity. Just add the classes and enjoy consistent, beautiful liquid glass effects across your entire app.** 🎉

