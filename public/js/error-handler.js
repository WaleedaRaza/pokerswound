/**
 * PokerGeek.ai - Global Error Handler
 * Provides user-friendly error messages and logging
 */

// Global error handler for fetch requests
window.handleApiError = async function(response, context = 'Operation') {
  let errorMessage = `${context} failed`;
  
  try {
    const data = await response.json();
    errorMessage = data.error || data.message || errorMessage;
  } catch (e) {
    // Response not JSON, use status text
    errorMessage = response.statusText || errorMessage;
  }
  
  // Log for debugging
  console.error(`❌ ${context} failed:`, {
    status: response.status,
    message: errorMessage
  });
  
  // Show user-friendly message
  if (window.showNotification) {
    window.showNotification(errorMessage, 'error');
  } else {
    alert(errorMessage);
  }
  
  return { error: errorMessage, status: response.status };
};

// Safe fetch wrapper with automatic error handling
window.safeFetch = async function(url, options = {}, context = 'Request') {
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      return await window.handleApiError(response, context);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`❌ ${context} error:`, error);
    
    const message = error.message || 'Network error';
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else {
      alert(message);
    }
    
    return { error: message };
  }
};

// Validation helpers
window.validators = {
  required: (value, fieldName) => {
    if (!value || value.trim() === '') {
      throw new Error(`${fieldName} is required`);
    }
    return true;
  },
  
  minLength: (value, min, fieldName) => {
    if (value.length < min) {
      throw new Error(`${fieldName} must be at least ${min} characters`);
    }
    return true;
  },
  
  maxLength: (value, max, fieldName) => {
    if (value.length > max) {
      throw new Error(`${fieldName} must be at most ${max} characters`);
    }
    return true;
  },
  
  numeric: (value, fieldName) => {
    if (isNaN(value) || value === '') {
      throw new Error(`${fieldName} must be a number`);
    }
    return true;
  },
  
  positive: (value, fieldName) => {
    if (Number(value) <= 0) {
      throw new Error(`${fieldName} must be positive`);
    }
    return true;
  },
  
  username: (value) => {
    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(value)) {
      throw new Error('Username must be 3-20 characters (letters, numbers, _, -)');
    }
    return true;
  }
};

// Form validation wrapper
window.validateForm = function(validations) {
  try {
    for (const validation of validations) {
      validation();
    }
    return { valid: true };
  } catch (error) {
    if (window.showNotification) {
      window.showNotification(error.message, 'warning');
    } else {
      alert(error.message);
    }
    return { valid: false, error: error.message };
  }
};

// Global error boundary for async operations
window.withErrorBoundary = async function(fn, context = 'Operation') {
  try {
    return await fn();
  } catch (error) {
    console.error(`❌ ${context} failed:`, error);
    
    const message = error.message || `${context} failed`;
    if (window.showNotification) {
      window.showNotification(message, 'error');
    } else {
      alert(message);
    }
    
    return { error: message };
  }
};

// Setup global error handlers
window.addEventListener('error', (event) => {
  console.error('🔥 Global error:', event.error);
  // Don't show alert for every error, just log it
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔥 Unhandled promise rejection:', event.reason);
  // Don't show alert for every error, just log it
});

console.log('✅ Error handler loaded');

