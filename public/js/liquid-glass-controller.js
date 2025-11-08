/**
 * LIQUID GLASS CONTROLLER
 * Centralized system for managing liquid glass tile values across all pages
 * Single source of truth for glass effect parameters
 */

class LiquidGlassController {
  constructor() {
    // LOCKED VALUES - Final tuned values for index page
    this.values = {
      shadowBlur: 15,
      tintOpacity: 1,
      frostBlur: 0,
      distortionStrength: 39,
      noiseFrequency: 0.008
    };
    this.isLocked = true; // Always locked with these values
    this.root = document.documentElement;
    
    // Initialize on DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  init() {
    // Set initial CSS variables
    this.updateAllVariables();
    
    // Setup controls if they exist on this page
    this.setupControls();
  }
  
  updateAllVariables() {
    this.root.style.setProperty('--glass-shadow-blur', `${this.values.shadowBlur}px`);
    this.root.style.setProperty('--glass-tint-opacity', this.values.tintOpacity / 100);
    this.root.style.setProperty('--glass-frost-blur', `${this.values.frostBlur}px`);
    this.root.style.setProperty('--glass-distortion-strength', this.values.distortionStrength);
    this.root.style.setProperty('--glass-noise-frequency', this.values.noiseFrequency);
    
    // Update SVG filter if it exists
    this.updateSVGFilter();
  }
  
  updateSVGFilter() {
    const displacementMap = document.querySelector('feDisplacementMap');
    const turbulence = document.querySelector('feTurbulence');
    
    if (displacementMap) {
      displacementMap.setAttribute('scale', this.values.distortionStrength);
    }
    
    if (turbulence) {
      turbulence.setAttribute('baseFrequency', `${this.values.noiseFrequency} ${this.values.noiseFrequency}`);
    }
  }
  
  setupControls() {
    const shadowBlur = document.getElementById('shadow-blur');
    const tintOpacity = document.getElementById('tint-opacity');
    const frostBlur = document.getElementById('frost-blur');
    const distortionStrength = document.getElementById('distortion-strength');
    const lockButton = document.getElementById('lock-values');
    
    if (!shadowBlur || !tintOpacity || !frostBlur || !distortionStrength) {
      return; // Controls don't exist on this page
    }
    
    // Set initial slider values
    shadowBlur.value = this.values.shadowBlur;
    tintOpacity.value = this.values.tintOpacity;
    frostBlur.value = this.values.frostBlur;
    distortionStrength.value = this.values.distortionStrength;
    
    // Add event listeners
    shadowBlur.addEventListener('input', (e) => {
      if (this.isLocked) return;
      this.values.shadowBlur = parseInt(e.target.value);
      this.root.style.setProperty('--glass-shadow-blur', `${this.values.shadowBlur}px`);
    });
    
    tintOpacity.addEventListener('input', (e) => {
      if (this.isLocked) return;
      this.values.tintOpacity = parseInt(e.target.value);
      this.root.style.setProperty('--glass-tint-opacity', this.values.tintOpacity / 100);
    });
    
    frostBlur.addEventListener('input', (e) => {
      if (this.isLocked) return;
      this.values.frostBlur = parseInt(e.target.value);
      this.root.style.setProperty('--glass-frost-blur', `${this.values.frostBlur}px`);
      this.updateSVGFilter();
    });
    
    distortionStrength.addEventListener('input', (e) => {
      if (this.isLocked) return;
      this.values.distortionStrength = parseInt(e.target.value);
      this.root.style.setProperty('--glass-distortion-strength', this.values.distortionStrength);
      this.updateSVGFilter();
    });
    
    // Lock button
    if (lockButton) {
      lockButton.addEventListener('click', () => this.toggleLock());
    }
  }
  
  toggleLock() {
    this.isLocked = !this.isLocked;
    const lockButton = document.getElementById('lock-values');
    const shadowBlur = document.getElementById('shadow-blur');
    const tintOpacity = document.getElementById('tint-opacity');
    const frostBlur = document.getElementById('frost-blur');
    const distortionStrength = document.getElementById('distortion-strength');
    
    if (lockButton) {
      lockButton.textContent = this.isLocked ? 'Unlock' : 'Lock';
      lockButton.style.background = this.isLocked ? 'var(--warning)' : 'var(--teal)';
    }
    
    // Disable/enable sliders
    [shadowBlur, tintOpacity, frostBlur, distortionStrength].forEach(slider => {
      if (slider) {
        slider.disabled = this.isLocked;
        slider.style.opacity = this.isLocked ? '0.5' : '1';
      }
    });
    
    // Log values when locking
    if (this.isLocked) {
      this.logValues();
    }
  }
  
  logValues() {
    const cssVars = {
      '--glass-shadow-blur': getComputedStyle(this.root).getPropertyValue('--glass-shadow-blur').trim(),
      '--glass-tint-opacity': getComputedStyle(this.root).getPropertyValue('--glass-tint-opacity').trim(),
      '--glass-frost-blur': getComputedStyle(this.root).getPropertyValue('--glass-frost-blur').trim(),
      '--glass-distortion-strength': getComputedStyle(this.root).getPropertyValue('--glass-distortion-strength').trim(),
      '--glass-noise-frequency': getComputedStyle(this.root).getPropertyValue('--glass-noise-frequency').trim()
    };
    
    console.log('🔒 Liquid Glass Values Locked:', {
      sliderValues: {
        shadowBlur: `${this.values.shadowBlur}px`,
        tintOpacity: `${this.values.tintOpacity}% (${this.values.tintOpacity / 100})`,
        frostBlur: `${this.values.frostBlur}px`,
        distortionStrength: this.values.distortionStrength,
        noiseFrequency: this.values.noiseFrequency
      },
      cssVariables: cssVars,
      rawValues: this.values
    });
  }
  
  toggleControls() {
    const controls = document.querySelector('.glass-controls');
    const button = controls?.querySelector('button[onclick*="toggleControls"]');
    
    if (!controls) return;
    
    if (controls.style.display === 'none') {
      controls.style.display = 'block';
      if (button) button.textContent = 'Hide';
    } else {
      controls.style.display = 'none';
      if (button) button.textContent = 'Show';
    }
  }
}

// Initialize global controller
window.liquidGlassController = new LiquidGlassController();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LiquidGlassController;
}

