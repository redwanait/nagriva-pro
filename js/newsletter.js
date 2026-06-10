/* ════════════════════════════════════════════════════════
   NAGRIVA — Newsletter System
   Handles subscription across homepage, newsletter page, and footer
   ════════════════════════════════════════════════════════ */

const NAGRIVA_Newsletter = (() => {
  const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validateEmail(email) {
    return VALID_EMAIL_RE.test(email);
  }

  function getSource(el) {
    const form = el.closest('[data-nl-source]');
    if (form) return form.getAttribute('data-nl-source');
    return 'homepage';
  }

  function setMessage(el, type, text) {
    const form = el.closest('[data-nl-form]') || el.closest('.nl-form-wrap') || el.parentElement;
    const msgEl = form ? form.querySelector('.nl-message') : null;
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.className = 'nl-message ' + type;
    }
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    if (loading) {
      btn.classList.add('loading');
      btn.disabled = true;
    } else {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  }

  function setInputError(input, hasError) {
    if (!input) return;
    if (hasError) {
      input.classList.add('error');
    } else {
      input.classList.remove('error');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const form = e.currentTarget;
    const btn = form.querySelector('.nl-submit');
    const input = form.querySelector('.nl-input');
    const email = input ? input.value.trim() : '';

    setMessage(form, '', '');
    setInputError(input, false);

    if (!email) {
      setMessage(form, 'error', 'Please enter your email address.');
      setInputError(input, true);
      input.focus();
      return;
    }

    if (!validateEmail(email)) {
      setMessage(form, 'error', 'Please enter a valid email address.');
      setInputError(input, true);
      input.focus();
      return;
    }

    const source = getSource(form);

    setLoading(btn, true);

    try {
      const { data: existing, error: lookupError } = await window.supabaseClient
        .from('newsletter_subscribers')
        .select('id, email, status')
        .eq('email', email)
        .maybeSingle();

      if (lookupError) throw lookupError;

      if (existing) {
        if (existing.status === 'unsubscribed') {
          const { error: reSubError } = await window.supabaseClient
            .from('newsletter_subscribers')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', existing.id);

          if (reSubError) throw reSubError;
        } else {
          setMessage(form, 'success', 'You\'re already subscribed!');
          setLoading(btn, false);
          if (input) input.value = '';
          return;
        }
      } else {
        const { error: insertError } = await window.supabaseClient
          .from('newsletter_subscribers')
          .insert({ email, source, status: 'active' });

        if (insertError) throw insertError;
      }

      setMessage(form, 'success', 'Thanks for subscribing! Check your inbox for a welcome email.');
      if (input) input.value = '';

      /* Redirect to thank-you if on newsletter page */
      const isNewsletterPage = window.location.pathname.includes('/newsletter');
      if (isNewsletterPage) {
        setTimeout(() => {
          window.location.href = '/pages/newsletter/thank-you.html';
        }, 800);
      }
    } catch (err) {
      console.error('[Newsletter] Subscribe error:', err);

      if (err.message && err.message.includes('duplicate key')) {
        setMessage(form, 'success', 'You\'re already subscribed!');
      } else if (err.code === '23505') {
        setMessage(form, 'success', 'You\'re already subscribed!');
      } else {
        setMessage(form, 'error', err.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(btn, false);
    }
  }

  function initForm(formEl) {
    if (!formEl) return;
    if (formEl._nlInitialized) return;
    formEl._nlInitialized = true;

    formEl.addEventListener('submit', handleSubmit);

    const input = formEl.querySelector('.nl-input');
    if (input) {
      input.addEventListener('input', () => {
        setInputError(input, false);
        setMessage(formEl, '', '');
      });
    }
  }

  function init() {
    document.querySelectorAll('[data-nl-form]').forEach(initForm);

    /* Also look for standalone forms */
    document.querySelectorAll('.nl-form').forEach((form) => {
      if (form.closest('[data-nl-form]')) return;
      if (!form._nlInitialized) {
        /* Wrap in a synthetic container */
        const wrap = document.createElement('div');
        wrap.setAttribute('data-nl-form', '');
        wrap.setAttribute('data-nl-source', 'homepage');
        form.parentNode.insertBefore(wrap, form);
        wrap.appendChild(form);
        initForm(wrap);
      }
    });
  }

  /* Auto-init on DOMContentLoaded */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* Re-init on dynamic content load (for components loaded via fetch) */
  document.addEventListener('nl:reinit', init);

  return {
    init,
    validateEmail,
    handleSubmit
  };
})();
