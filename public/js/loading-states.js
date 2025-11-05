/**
 * PokerGeek.ai - Loading States Manager
 * Easy button loading states and overlays
 */

// Add loading state to button
window.setButtonLoading = function(button, loading = true) {
  if (typeof button === 'string') {
    button = document.getElementById(button) || document.querySelector(button);
  }
  
  if (!button) return;
  
  if (loading) {
    button.classList.add('btn-loading');
    button.disabled = true;
    button.setAttribute('data-original-text', button.textContent);
  } else {
    button.classList.remove('btn-loading');
    button.disabled = false;
    const originalText = button.getAttribute('data-original-text');
    if (originalText) {
      button.textContent = originalText;
    }
  }
};

// Async wrapper that handles button loading state
window.withButtonLoading = async function(button, asyncFn) {
  window.setButtonLoading(button, true);
  try {
    return await asyncFn();
  } finally {
    window.setButtonLoading(button, false);
  }
};

// Show/hide loading overlay on element
window.showLoadingOverlay = function(element, message = 'Loading...') {
  if (typeof element === 'string') {
    element = document.getElementById(element) || document.querySelector(element);
  }
  
  if (!element) return;
  
  const overlay = document.createElement('div');
  overlay.className = 'loading-overlay';
  overlay.innerHTML = `
    <div style="text-align: center;">
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
    </div>
  `;
  overlay.setAttribute('data-loading-overlay', 'true');
  
  element.style.position = 'relative';
  element.appendChild(overlay);
};

window.hideLoadingOverlay = function(element) {
  if (typeof element === 'string') {
    element = document.getElementById(element) || document.querySelector(element);
  }
  
  if (!element) return;
  
  const overlay = element.querySelector('[data-loading-overlay]');
  if (overlay) {
    overlay.remove();
  }
};

// Show inline loading spinner
window.showInlineLoading = function(element, position = 'after') {
  if (typeof element === 'string') {
    element = document.getElementById(element) || document.querySelector(element);
  }
  
  if (!element) return;
  
  const spinner = document.createElement('span');
  spinner.className = 'inline-loading';
  spinner.setAttribute('data-inline-loading', 'true');
  
  if (position === 'before') {
    element.insertBefore(spinner, element.firstChild);
  } else {
    element.appendChild(spinner);
  }
};

window.hideInlineLoading = function(element) {
  if (typeof element === 'string') {
    element = document.getElementById(element) || document.querySelector(element);
  }
  
  if (!element) return;
  
  const spinner = element.querySelector('[data-inline-loading]');
  if (spinner) {
    spinner.remove();
  }
};

// Create skeleton loaders
window.createSkeletonLoader = function(type = 'card', count = 1) {
  const skeletons = [];
  
  for (let i = 0; i < count; i++) {
    const skeleton = document.createElement('div');
    
    switch (type) {
      case 'text':
        skeleton.className = 'skeleton skeleton-text';
        break;
      case 'title':
        skeleton.className = 'skeleton skeleton-title';
        break;
      case 'avatar':
        skeleton.className = 'skeleton skeleton-avatar';
        break;
      case 'card':
      default:
        skeleton.className = 'skeleton skeleton-card';
    }
    
    skeletons.push(skeleton);
  }
  
  return skeletons;
};

console.log('✅ Loading states manager loaded');

