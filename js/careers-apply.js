(function () {
  'use strict';

  var supabase = window.supabaseClient;

  /* ── Constants ── */
  var ALLOWED_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  var MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  var ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx';

  /* ── DOM refs ── */
  var form = document.getElementById('crForm');
  var steps = document.querySelectorAll('.cr-form-step');
  var lines = document.querySelectorAll('.cr-form-step-line');
  var contents = document.querySelectorAll('.cr-form-step-content');
  var stepsContainer = document.getElementById('crFormSteps');
  var submitBtn = document.getElementById('crFormSubmit');
  var resumeInput = document.getElementById('crResume');
  var resumeName = document.getElementById('crResumeName');
  var successDiv = document.getElementById('crFormSuccess');

  var currentStep = 1;
  var totalSteps = 3;

  /* ── Step Navigation ── */
  function goToStep(step) {
    if (step < 1 || step > totalSteps) return;
    currentStep = step;

    steps.forEach(function (el, i) {
      var idx = i + 1;
      el.classList.remove('active', 'done');
      if (idx === step) el.classList.add('active');
      else if (idx < step) el.classList.add('done');
    });

    lines.forEach(function (el, i) {
      var idx = i + 1;
      el.classList.toggle('done', idx < step);
    });

    contents.forEach(function (el) {
      el.classList.toggle('active', parseInt(el.getAttribute('data-step-content')) === step);
    });

    if (stepsContainer) stepsContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function bindNavButtons() {
    document.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = parseInt(this.getAttribute('data-next'));
        goToStep(next);
      });
    });

    document.querySelectorAll('[data-prev]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var prev = parseInt(this.getAttribute('data-prev'));
        goToStep(prev);
      });
    });
  }

  /* ── File Input Display ── */
  function bindFileInput() {
    if (!resumeInput || !resumeName) return;
    resumeInput.addEventListener('change', function () {
      resumeName.textContent = this.files && this.files[0] ? this.files[0].name : '';
    });
  }

  /* ── Validation ── */
  function getFormData() {
    return {
      full_name: (document.getElementById('crFullName') && document.getElementById('crFullName').value.trim()) || '',
      email: (document.getElementById('crEmail') && document.getElementById('crEmail').value.trim()) || '',
      phone: (document.getElementById('crPhone') && document.getElementById('crPhone').value.trim()) || '',
      country: (document.getElementById('crCountry') && document.getElementById('crCountry').value) || '',
      position: (document.getElementById('crPosition') && document.getElementById('crPosition').value) || '',
      linkedin_url: (document.getElementById('crLinkedin') && document.getElementById('crLinkedin').value.trim()) || '',
      portfolio_url: (document.getElementById('crPortfolio') && document.getElementById('crPortfolio').value.trim()) || '',
      experience_level: (document.getElementById('crExperience') && document.getElementById('crExperience').value) || '',
      cover_letter: (document.getElementById('crCover') && document.getElementById('crCover').value.trim()) || '',
      additional_notes: (document.getElementById('crNotes') && document.getElementById('crNotes').value.trim()) || '',
      resume_file: (resumeInput && resumeInput.files && resumeInput.files[0]) || null
    };
  }

  function validate(data) {
    var errors = [];

    if (!data.full_name) errors.push('Full name is required.');
    if (!data.email) errors.push('Email is required.');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.push('Please enter a valid email address.');
    if (!data.position) errors.push('Please select a position you are applying for.');
    if (data.resume_file) {
      if (!ALLOWED_TYPES.includes(data.resume_file.type)) errors.push('Invalid file type. Only PDF, DOC, and DOCX files are accepted.');
      if (data.resume_file.size > MAX_SIZE) errors.push('File is too large. Maximum size is 10 MB.');
    }

    return errors;
  }

  /* ── Upload Resume ── */
  function uploadResume(file) {
    if (!file) return Promise.resolve('');

    var fileExt = file.name.split('.').pop();
    var fileName = 'resume_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '.' + fileExt;
    var filePath = 'public/' + fileName;

    return supabase.storage.from('resumes').upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    }).then(function (result) {
      if (result.error) throw result.error;
      var publicUrl = supabase.storage.from('resumes').getPublicUrl(filePath);
      return publicUrl.data.publicUrl;
    });
  }

  /* ── Submit Application to Supabase ── */
  function submitApplication(data) {
    return supabase.from('job_applications').insert({
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      country: data.country,
      position: data.position,
      linkedin_url: data.linkedin_url,
      portfolio_url: data.portfolio_url,
      experience_level: data.experience_level,
      resume_url: data.resume_url,
      cover_letter: data.cover_letter,
      additional_notes: data.additional_notes,
      status: 'pending'
    });
  }

  /* ── Reset Form ── */
  function resetForm() {
    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      if (el.type !== 'file') el.value = '';
    });
    if (resumeInput) resumeInput.value = '';
    if (resumeName) resumeName.textContent = '';
    goToStep(1);
  }

  /* ── Set Button Loading State ── */
  function setButtonLoading(loading) {
    if (!submitBtn) return;
    submitBtn.disabled = loading;
    submitBtn.innerHTML = loading
      ? 'Submitting...'
      : 'Submit Application';
  }

  /* ── Show Success State ── */
  function showSuccessState() {
    if (successDiv) {
      if (stepsContainer) stepsContainer.style.display = 'none';
      if (form) form.style.display = 'none';
      successDiv.style.display = 'block';
      successDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (typeof NAGRIVA_Toast !== 'undefined') {
      NAGRIVA_Toast.success(
        'Application Submitted!',
        'Your application has been successfully submitted. Our team will review it and contact you if there is a match.'
      );
    }
  }

  /* ── Show Error Via Toast ── */
  function showError(message) {
    if (typeof NAGRIVA_Toast !== 'undefined') {
      NAGRIVA_Toast.error('Submission Error', message);
    } else {
      alert('Error: ' + message);
    }
  }

  /* ── Handle Form Submit ── */
  function handleSubmit(e) {
    e.preventDefault();

    var data = getFormData();
    var errors = validate(data);

    if (errors.length > 0) {
      showError(errors.join(' '));
      return;
    }

    setButtonLoading(true);

    /* Step 1: Upload resume */
    uploadResume(data.resume_file).then(function (resumeUrl) {
      data.resume_url = resumeUrl;

      /* Step 2: Insert application */
      return submitApplication(data);
    }).then(function (result) {
      if (result.error) throw result.error;
      showSuccessState();
    }).catch(function (err) {
      console.error('[NAGRIVA] Application submission error:', err);
      var message = 'Something went wrong while submitting your application. Please try again later.';

      if (err && err.message) {
        if (err.message.indexOf('bucket') !== -1 || err.message.indexOf('storage') !== -1) {
          message = 'Failed to upload your resume. Please check the file and try again.';
        } else if (err.message.indexOf('duplicate') !== -1 || err.message.indexOf('violates') !== -1) {
          message = 'A database error occurred. Please try again later.';
        } else if (err.message.indexOf('fetch') !== -1 || err.message.indexOf('network') !== -1) {
          message = 'Network error. Please check your connection and try again.';
        }
      }

      showError(message);
      setButtonLoading(false);
    });
  }

  /* ── Init ── */
  function init() {
    if (!form) return;
    if (!supabase) {
      console.error('[NAGRIVA] Supabase client not found. Make sure supabase-config.js is loaded before careers-apply.js');
      return;
    }

    bindNavButtons();
    bindFileInput();
    form.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
