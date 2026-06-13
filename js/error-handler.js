window.NAGRIVA_ErrorHandler = (function () {
  'use strict';

  var ERROR_TYPES = {
    INVALID_URL: 'INVALID_URL',
    WEBSITE_UNREACHABLE: 'WEBSITE_UNREACHABLE',
    API_TIMEOUT: 'API_TIMEOUT',
    API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
    API_UNAVAILABLE: 'API_UNAVAILABLE',
    API_KEY_MISSING: 'API_KEY_MISSING',
    API_REQUEST_FAILED: 'API_REQUEST_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    AUDIT_FAILED: 'AUDIT_FAILED',
    AUDIT_MISSING_DATA: 'AUDIT_MISSING_DATA',
    AUDIT_INCOMPLETE: 'AUDIT_INCOMPLETE',
    SCORE_FAILED: 'SCORE_FAILED',
    PDF_FAILED: 'PDF_FAILED',
    PDF_HTML2CANVAS: 'PDF_HTML2CANVAS',
    PDF_MEMORY: 'PDF_MEMORY',
    SUPABASE_UPLOAD: 'SUPABASE_UPLOAD',
    SUPABASE_DB: 'SUPABASE_DB',
    SUPABASE_PERMISSION: 'SUPABASE_PERMISSION',
    SUPABASE_MISSING: 'SUPABASE_MISSING',
    SHARE_FAILED: 'SHARE_FAILED',
    SHARE_UNAVAILABLE: 'SHARE_UNAVAILABLE',
    COMPETITOR_INVALID_URL: 'COMPETITOR_INVALID_URL',
    COMPETITOR_MISSING_DATA: 'COMPETITOR_MISSING_DATA',
    COMPETITOR_API_FAILURE: 'COMPETITOR_API_FAILURE',
    AI_INSIGHTS_MISSING: 'AI_INSIGHTS_MISSING',
    AI_INSIGHTS_FAILED: 'AI_INSIGHTS_FAILED',
    UNKNOWN: 'UNKNOWN'
  };

  var USER_MESSAGES = {};
  USER_MESSAGES[ERROR_TYPES.INVALID_URL] = { title: 'Invalid URL', message: 'Please enter a valid website URL starting with http:// or https://', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.WEBSITE_UNREACHABLE] = { title: 'Website Unreachable', message: "We couldn't connect to this website. Please check the URL and try again.", type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.API_TIMEOUT] = { title: 'Request Timed Out', message: 'The analysis took too long. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.API_QUOTA_EXCEEDED] = { title: 'API Limit Reached', message: 'Daily analysis limit reached. Please try again tomorrow.', type: 'warning', icon: 'warning' };
  USER_MESSAGES[ERROR_TYPES.API_UNAVAILABLE] = { title: 'API Busy', message: 'Google PageSpeed is temporarily unavailable. Please try again later.', type: 'warning', icon: 'warning' };
  USER_MESSAGES[ERROR_TYPES.API_KEY_MISSING] = { title: 'Server Configuration Error', message: 'The audit service is not properly configured. Please contact support.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.API_REQUEST_FAILED] = { title: 'Audit Service Error', message: 'The audit request could not be completed. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.NETWORK_ERROR] = { title: 'Network Error', message: 'You appear to be offline. Please check your internet connection.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.AUDIT_FAILED] = { title: 'Audit Failed', message: 'Unable to complete the audit. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.AUDIT_MISSING_DATA] = { title: 'Incomplete Audit', message: 'Unable to complete the audit. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.AUDIT_INCOMPLETE] = { title: 'Incomplete Results', message: 'We received partial results. Some data may be missing.', type: 'warning', icon: 'warning' };
  USER_MESSAGES[ERROR_TYPES.SCORE_FAILED] = { title: 'Score Calculation Failed', message: 'Unable to calculate audit scores. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.PDF_FAILED] = { title: 'PDF Generation Failed', message: 'Unable to generate the PDF report. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.PDF_HTML2CANVAS] = { title: 'PDF Generation Failed', message: 'Unable to render the report. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.PDF_MEMORY] = { title: 'PDF Generation Failed', message: 'Not enough memory to generate the PDF report. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.SUPABASE_UPLOAD] = { title: 'Upload Failed', message: 'Failed to save report. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.SUPABASE_DB] = { title: 'Database Error', message: 'Failed to save report. Please try again or contact support.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.SUPABASE_PERMISSION] = { title: 'Permission Denied', message: 'Failed to save report. Please contact support.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.SUPABASE_MISSING] = { title: 'Report Not Found', message: 'The requested report could not be found.', type: 'warning', icon: 'warning' };
  USER_MESSAGES[ERROR_TYPES.SHARE_FAILED] = { title: 'Share Failed', message: 'Unable to create share link. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.SHARE_UNAVAILABLE] = { title: 'Share Unavailable', message: 'Share service is temporarily unavailable. Please try again later.', type: 'warning', icon: 'warning' };
  USER_MESSAGES[ERROR_TYPES.COMPETITOR_INVALID_URL] = { title: 'Invalid URL', message: 'Please enter valid competitor website URLs.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.COMPETITOR_MISSING_DATA] = { title: 'Missing Data', message: 'Unable to compare competitor websites. Some data is missing.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.COMPETITOR_API_FAILURE] = { title: 'Comparison Failed', message: 'Unable to compare competitor websites. Please try again.', type: 'error', icon: 'error' };
  USER_MESSAGES[ERROR_TYPES.AI_INSIGHTS_MISSING] = { title: 'Insights Unavailable', message: 'Displaying audit results without AI insights.', type: 'info', icon: 'info' };
  USER_MESSAGES[ERROR_TYPES.AI_INSIGHTS_FAILED] = { title: 'Insights Failed', message: 'Displaying audit results without AI insights.', type: 'info', icon: 'info' };
  USER_MESSAGES[ERROR_TYPES.UNKNOWN] = { title: 'Something Went Wrong', message: 'Please try again. If the problem persists, contact support.', type: 'error', icon: 'error' };

  var LOG_KEY = 'nagriva_error_logs';
  var MAX_LOG_ENTRIES = 200;
  var RECENT_ERRORS = {};
  var DEDUP_MS = 4000;

  function getTimestamp() {
    return new Date().toISOString();
  }

  function getLogs() {
    try {
      var raw = localStorage.getItem(LOG_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function persistLogs(logs) {
    try {
      if (logs.length > MAX_LOG_ENTRIES) {
        logs = logs.slice(logs.length - MAX_LOG_ENTRIES);
      }
      localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch (e) {}
  }

  function logError(errorType, error, userAction) {
    var message = error && error.message ? error.message : (error || '');
    var stack = error && error.stack ? error.stack : '';
    var entry = {
      type: errorType || ERROR_TYPES.UNKNOWN,
      message: message,
      stack: stack,
      timestamp: getTimestamp(),
      userAction: userAction || '',
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    if (window.NAGRIVA_Logger && window.NAGRIVA_Logger.log) {
      try { window.NAGRIVA_Logger.log('error', entry.type + ': ' + entry.message, entry); } catch (e) {}
    }
    var logs = getLogs();
    logs.push(entry);
    persistLogs(logs);
    try {
      if (window.console && console.error) {
        console.error('[Nagriva Error]', entry.type, entry.message, entry.userAction);
      }
    } catch (e) {}
    return entry;
  }

  function getMessage(errorType) {
    var msg = USER_MESSAGES[errorType] || USER_MESSAGES[ERROR_TYPES.UNKNOWN];
    return { title: msg.title, message: msg.message, type: msg.type, icon: msg.icon };
  }

  function isDuplicateError(errorType, message) {
    var key = errorType + '::' + (message || '');
    var now = Date.now();
    if (RECENT_ERRORS[key] && now - RECENT_ERRORS[key] < DEDUP_MS) {
      return true;
    }
    RECENT_ERRORS[key] = now;
    for (var k in RECENT_ERRORS) {
      if (now - RECENT_ERRORS[k] > DEDUP_MS) delete RECENT_ERRORS[k];
    }
    return false;
  }

  function generateDebugReport(errorType, error, stepName, responseStatus, responsePayload) {
    var report = {
      timestamp: getTimestamp(),
      failedStep: stepName || 'unknown',
      errorType: errorType || ERROR_TYPES.UNKNOWN,
      errorMessage: error && error.message ? error.message : (typeof error === 'string' ? error : ''),
      stackTrace: error && error.stack ? error.stack : '',
      requestStatusCode: responseStatus || null,
      responsePayload: responsePayload || null,
      url: window.location.href,
      userAgent: navigator.userAgent
    };
    console.error('%c[Nagriva Debug Report]', 'font-size:14px;font-weight:bold;color:#ef4444;');
    console.error('  Failed Function:', stepName || 'unknown');
    console.error('  Error Type:', report.errorType);
    console.error('  Error Message:', report.errorMessage);
    console.error('  Stack Trace:', report.stackTrace || '(none)');
    console.error('  Request Status Code:', report.requestStatusCode);
    console.error('  Response Payload:', report.responsePayload);
    console.error('  Timestamp:', report.timestamp);
    console.error('  URL:', report.url);
    console.error('  User Agent:', report.userAgent);
    console.error('  Full error object:', error);
    return report;
  }

  function handleError(errorType, error, userAction, retryFn, debugInfo) {
    var errMsg = error && error.message ? error.message : (typeof error === 'string' ? error : '');
    if (isDuplicateError(errorType, errMsg)) {
      console.warn('[Nagriva Error] Suppressed duplicate error:', errorType, errMsg);
      return null;
    }
    var logEntry = logError(errorType, error, userAction);

    generateDebugReport(
      errorType,
      error,
      (debugInfo && debugInfo.step) || userAction || 'unknown',
      debugInfo && debugInfo.statusCode ? debugInfo.statusCode : null,
      debugInfo && debugInfo.payload ? debugInfo.payload : null
    );

    var msg = getMessage(errorType);
    if (window.NAGRIVA_Alerts) {
      window.NAGRIVA_Alerts.show(msg.type, msg.title, msg.message, { retry: retryFn, action: userAction });
    } else {
      if (window.NAGRIVA_Toast) {
        window.NAGRIVA_Toast[msg.type](msg.title, msg.message);
      }
    }
    return logEntry;
  }

  function detectOffline() {
    if (!navigator.onLine) {
      handleError(ERROR_TYPES.NETWORK_ERROR, null, 'offline_detection', function () {
        window.location.reload();
      });
      return true;
    }
    return false;
  }

  function wrapAsync(fn, errorType, userAction, retryFn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      if (detectOffline()) return Promise.reject(new Error('offline'));
      var result;
      try {
        result = fn.apply(this, args);
      } catch (e) {
        handleError(errorType || ERROR_TYPES.UNKNOWN, e, userAction, retryFn);
        return Promise.reject(e);
      }
      if (result && typeof result.then === 'function') {
        return result.catch(function (err) {
          handleError(errorType || ERROR_TYPES.UNKNOWN, err, userAction, retryFn);
          throw err;
        });
      }
      return result;
    };
  }

  function classifyError(err) {
    if (!err) return ERROR_TYPES.UNKNOWN;
    var msg = (err.message || err || '').toLowerCase();

    if (msg.indexOf('api key missing') !== -1 || msg.indexOf('api_key_missing') !== -1) {
      return ERROR_TYPES.API_KEY_MISSING;
    }
    if (msg.indexOf('quota') !== -1 || msg.indexOf('limit') !== -1 || msg.indexOf('exceeded') !== -1) {
      return ERROR_TYPES.API_QUOTA_EXCEEDED;
    }
    if (msg.indexOf('fetch') !== -1 || msg.indexOf('network') !== -1 || msg.indexOf('offline') !== -1) {
      return ERROR_TYPES.NETWORK_ERROR;
    }
    if (msg.indexOf('timeout') !== -1 || msg.indexOf('timed out') !== -1) {
      return ERROR_TYPES.API_TIMEOUT;
    }
    if (msg.indexOf('unreachable') !== -1 || msg.indexOf('dns') !== -1 || msg.indexOf('enotfound') !== -1) {
      return ERROR_TYPES.WEBSITE_UNREACHABLE;
    }
    if (msg.indexOf('invalid url') !== -1 || msg.indexOf('url') !== -1 && msg.indexOf('invalid') !== -1) {
      return ERROR_TYPES.INVALID_URL;
    }
    if (msg.indexOf('pagespeed api request failed') !== -1 || msg.indexOf('api request failed') !== -1) {
      return ERROR_TYPES.API_REQUEST_FAILED;
    }
    if (msg.indexOf('pagespeed api quota') !== -1) {
      return ERROR_TYPES.API_QUOTA_EXCEEDED;
    }
    if (msg.indexOf('invalid pagespeed api response') !== -1 || msg.indexOf('invalid response from pagespeed') !== -1) {
      return ERROR_TYPES.API_UNAVAILABLE;
    }
    if (msg.indexOf('server configuration error') !== -1) {
      return ERROR_TYPES.API_KEY_MISSING;
    }
    if (msg.indexOf('pdf') !== -1 && (msg.indexOf('memory') !== -1 || msg.indexOf('size') !== -1)) {
      return ERROR_TYPES.PDF_MEMORY;
    }
    if (msg.indexOf('pdf') !== -1) {
      return ERROR_TYPES.PDF_FAILED;
    }
    if (msg.indexOf('jspdf') !== -1 || msg.indexOf('html2canvas') !== -1) {
      return ERROR_TYPES.PDF_HTML2CANVAS;
    }
    if (msg.indexOf('supabase') !== -1 || msg.indexOf('storage') !== -1) {
      if (msg.indexOf('permission') !== -1 || msg.indexOf('unauthorized') !== -1 || msg.indexOf('403') !== -1) {
        return ERROR_TYPES.SUPABASE_PERMISSION;
      }
      if (msg.indexOf('not found') !== -1 || msg.indexOf('404') !== -1) {
        return ERROR_TYPES.SUPABASE_MISSING;
      }
      if (msg.indexOf('upload') !== -1) {
        return ERROR_TYPES.SUPABASE_UPLOAD;
      }
      return ERROR_TYPES.SUPABASE_DB;
    }
    if (msg.indexOf('share') !== -1) {
      return ERROR_TYPES.SHARE_FAILED;
    }
    if (msg.indexOf('insight') !== -1 || msg.indexOf('ai') !== -1) {
      return ERROR_TYPES.AI_INSIGHTS_FAILED;
    }
    if (msg.indexOf('audit') !== -1) {
      return ERROR_TYPES.AUDIT_FAILED;
    }
    return ERROR_TYPES.UNKNOWN;
  }

  function init() {
    window.addEventListener('online', function () {
      if (window.NAGRIVA_Toast) {
        window.NAGRIVA_Toast.success('Back Online', 'Your internet connection has been restored.');
      }
    });
    window.addEventListener('offline', function () {
      handleError(ERROR_TYPES.NETWORK_ERROR, new Error('Browser offline event'), 'offline_detected', function () {
        window.location.reload();
      });
    });
    window.addEventListener('unhandledrejection', function (e) {
      logError(ERROR_TYPES.UNKNOWN, e.reason || e, 'unhandled_promise_rejection');
    });
    window.addEventListener('error', function (e) {
      logError(ERROR_TYPES.UNKNOWN, e.error || e, 'uncaught_error');
    });
  }

  function clearLogs() {
    try { localStorage.removeItem(LOG_KEY); } catch (e) {}
  }

  function getErrorLogs() {
    return getLogs();
  }

  return {
    ERROR_TYPES: ERROR_TYPES,
    USER_MESSAGES: USER_MESSAGES,
    getMessage: getMessage,
    logError: logError,
    handleError: handleError,
    detectOffline: detectOffline,
    wrapAsync: wrapAsync,
    classifyError: classifyError,
    generateDebugReport: generateDebugReport,
    clearLogs: clearLogs,
    getErrorLogs: getErrorLogs,
    init: init
  };
})();
