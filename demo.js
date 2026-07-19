/* ============================================================
   Call-Note Drafting Demo — demo.js
   Rule-based portfolio mock (no API, no storage, no logging)
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Sample data (anonymized, illustrative) ---------- */
  var SAMPLES = {
    billing: {
      name: 'Jordan',
      text:
        'Reason for call: The customer, Jordan, is calling to inquire about ' +
        'two charges on their account. Agent actions: Verified identity and ' +
        'looked up invoices. Result: As a result of the agent\'s actions, ' +
        'Jordan received the invoice for the first charge of $274.77 via ' +
        'email. The agent was unable to locate the second charge of ' +
        '$1,025.03 but explained it may be a pre-authorization charge. ' +
        'Jordan was told to follow up if the charge did not resolve by the ' +
        'specified date. Ticket SD-4471 was created.'
    },
    order: {
      name: 'Alex',
      text:
        'Reason for call: The customer, Alex, called to check the status of ' +
        'order SO-882104. Agent actions: Verified the order and email ' +
        'address. Result: Alex was informed the order had not shipped yet ' +
        'and was expected to ship from the supplier that day; tracking would ' +
        'be emailed once available.'
    },
    tracking: {
      name: 'Sam',
      text:
        'Reason for call: The customer, Sam, called because tracking showed ' +
        'no movement for three days. Agent actions: Checked carrier status ' +
        'and the order log. Result: Sam was told the carrier had a scan ' +
        'delay and the package was still in transit; a follow-up was set if ' +
        'no movement by the next business day.'
    },
    cancellation: {
      name: 'Riley',
      text:
        'Reason for call: The customer, Riley, called to cancel order ' +
        'SO-771320 before it shipped. Agent actions: Confirmed the order ' +
        'was unshipped and submitted the cancellation. Result: Riley\'s ' +
        'order was cancelled and a confirmation was emailed. Ticket SD-4472 ' +
        'was created.'
    },
    warranty: {
      name: 'Morgan',
      text:
        'Reason for call: The customer, Morgan, called about a defective ' +
        'item under warranty. Agent actions: Verified the warranty and ' +
        'created a replacement order. Result: Morgan was told a replacement ' +
        'would ship and a return label was emailed for the defective item. ' +
        'Ticket SD-4473 was created.'
    }
  };

  /* Pre-written outputs follow the real prompt design:
     customer first name, result-only v2, ticket carry-through,
     past tense, never "Agent" (use "Janackeh"), strict 2-field output. */
  var OUTPUTS = {
    billing: {
      subject: 'Jordan called about two account charges',
      v1: 'Jordan called to inquire about two charges on the account. Janackeh verified identity and looked up the invoices. Jordan received the $274.77 invoice by email; the $1,025.03 charge could not be located and was explained as a possible pre-authorization. Jordan was advised to follow up if the charge did not resolve by the specified date. Ticket SD-4471 was created.',
      v2: 'Jordan received the $274.77 invoice by email, and the $1,025.03 charge was explained as a possible pre-authorization to follow up on if it did not resolve by the specified date. Ticket SD-4471 was created.'
    },
    order: {
      subject: 'Alex called to check order status',
      v1: 'Alex called to check the status of order SO-882104. Janackeh verified the order and email address. Alex was informed the order had not shipped yet and was expected to ship from the supplier that day, with tracking to be emailed once available.',
      v2: 'Alex was informed order SO-882104 had not shipped yet and was expected to ship from the supplier that day, with tracking to be emailed once available.'
    },
    tracking: {
      subject: 'Sam called about a tracking delay',
      v1: 'Sam called because tracking showed no movement for three days. Janackeh checked the carrier status and the order log. Sam was told the carrier had a scan delay and the package was still in transit, with a follow-up set if no movement by the next business day.',
      v2: 'Sam was told the package was still in transit due to a carrier scan delay, with a follow-up set if no movement by the next business day.'
    },
    cancellation: {
      subject: 'Riley called to cancel an order',
      v1: 'Riley called to cancel order SO-771320 before it shipped. Janackeh confirmed the order was unshipped and submitted the cancellation. Riley\'s order was cancelled and a confirmation was emailed. Ticket SD-4472 was created.',
      v2: 'Riley\'s order SO-771320 was cancelled and a confirmation was emailed. Ticket SD-4472 was created.'
    },
    warranty: {
      subject: 'Morgan called about a warranty replacement',
      v1: 'Morgan called about a defective item under warranty. Janackeh verified the warranty and created a replacement order. Morgan was told a replacement would ship and a return label was emailed for the defective item. Ticket SD-4473 was created.',
      v2: 'Morgan was told a replacement would ship and a return label was emailed for the defective item. Ticket SD-4473 was created.'
    }
  };

  /* ---------- State ---------- */
  var state = {
    mode: 'v1',
    draftCount: 0,
    draftLimit: 10,
    pendingDraft: false,   // true after PII gate opens, waiting to proceed
    originalDraft: null    // {subject, summary} for diff
  };

  /* ---------- Elements ---------- */
  var $ = function (s) { return document.querySelector(s); };
  var scenarioSel = $('#scenario');
  var transcript = $('#transcript');
  var loadSampleBtn = $('#loadSample');
  var draftBtn = $('#draftBtn');
  var draftStatus = $('#draftStatus');
  var piiPanel = $('#piiPanel');
  var piiText = $('#piiText');
  var piiList = $('#piiList');
  var redactBtn = $('#redactBtn');
  var anywayBtn = $('#anywayBtn');
  var outputEmpty = $('#outputEmpty');
  var output = $('#output');
  var subjectOut = $('#subjectOut');
  var summaryOut = $('#summaryOut');
  var diffBtn = $('#diffBtn');
  var diffStatus = $('#diffStatus');
  var diffPanel = $('#diffPanel');
  var diffSubject = $('#diffSubject');
  var diffSummary = $('#diffSummary');

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var toggle = $('[data-theme-toggle]');
  var sunSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var moonSVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var initial = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  root.setAttribute('data-theme', initial);
  setToggle(initial);
  function setToggle(theme) {
    if (!toggle) return;
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    toggle.innerHTML = theme === 'dark' ? sunSVG : moonSVG;
  }
  if (toggle) toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next); setToggle(next);
  });

  /* ---------- Sticky header ---------- */
  var header = $('#header');
  window.addEventListener('scroll', function () {
    if (!header) return;
    if ((window.scrollY || window.pageYOffset) > 8) header.classList.add('demo-header--scrolled');
    else header.classList.remove('demo-header--scrolled');
  }, { passive: true });

  /* ---------- Scroll reveal ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach(function (el, i) { el.style.transitionDelay = Math.min((i % 4) * 60, 240) + 'ms'; io.observe(el); });
  }

  /* ---------- Footer year ---------- */
  var yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mode toggle ---------- */
  var segs = document.querySelectorAll('.seg');
  segs.forEach(function (seg) {
    seg.addEventListener('click', function () {
      segs.forEach(function (s) { s.classList.remove('active'); s.setAttribute('aria-pressed', 'false'); });
      seg.classList.add('active'); seg.setAttribute('aria-pressed', 'true');
      state.mode = seg.getAttribute('data-mode');
      // if a draft is already showing, refresh it for the new mode
      if (!output.hidden) renderOutput(currentScenarioOutput());
    });
  });

  /* ---------- Load sample ---------- */
  loadSampleBtn.addEventListener('click', function () {
    var key = scenarioSel.value;
    transcript.value = SAMPLES[key].text;
    closePiiPanel();
    setStatus(draftStatus, 'Sample loaded — click "Draft note".');
  });

  /* ---------- PII detection ---------- */
  // emails; 10+ digit phone runs; 13-19 digit card runs (allow separators)
  var EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // capture phone-like and card-like digit sequences with optional separators
  var DIGIT_RUN_RE = /(?:\+?\d[\d\s().-]{8,}\d)|(?:\d{10,})/g;

  function findPii(text) {
    var matches = [];
    var m;
    EMAIL_RE.lastIndex = 0;
    while ((m = EMAIL_RE.exec(text)) !== null) {
      matches.push({ type: 'email', value: m[0], index: m.index });
    }
    DIGIT_RUN_RE.lastIndex = 0;
    while ((m = DIGIT_RUN_RE.exec(text)) !== null) {
      var digits = m[0].replace(/\D/g, '');
      if (digits.length >= 10) {
        var type = digits.length >= 13 ? 'card' : 'phone';
        matches.push({ type: type, value: m[0], index: m.index, digits: digits });
      }
      if (m[0].length === 0) DIGIT_RUN_RE.lastIndex++; // avoid zero-length loop
    }
    return matches;
  }

  function maskValue(item) {
    var d = item.digits || item.value;
    if (item.type === 'email') {
      var at = item.value.indexOf('@');
      return '****' + item.value.slice(at);
    }
    // phone or card: keep last 4
    var last4 = d.slice(-4);
    return '****-****-' + last4;
  }

  function redactText(text, items) {
    // replace each matched substring with its mask, right-to-left by index
    var sorted = items.slice().sort(function (a, b) { return b.index - a.index; });
    var out = text;
    sorted.forEach(function (it) {
      out = out.slice(0, it.index) + maskValue(it) + out.slice(it.index + it.value.length);
    });
    return out;
  }

  function openPiiPanel(items) {
    piiList.innerHTML = '';
    items.forEach(function (it) {
      var li = document.createElement('li');
      li.textContent = maskValue(it) + '  (' + it.type + ')';
      piiList.appendChild(li);
    });
    piiText.textContent = 'Found ' + items.length + ' item' + (items.length === 1 ? '' : 's') + ' that look like emails, phone numbers, or card numbers. Redact them before drafting, or confirm you understand this is a mock-only demo.';
    piiPanel.hidden = false;
    state.pendingDraft = true;
  }
  function closePiiPanel() {
    piiPanel.hidden = true;
    state.pendingDraft = false;
  }

  redactBtn.addEventListener('click', function () {
    var items = findPii(transcript.value);
    if (items.length) transcript.value = redactText(transcript.value, items);
    closePiiPanel();
    setStatus(draftStatus, 'Flagged items redacted.');
    runDraft(); // proceed
  });
  anywayBtn.addEventListener('click', function () {
    closePiiPanel();
    setStatus(draftStatus, 'Drafting anyway.');
    runDraft();
  });

  /* ---------- Draft ---------- */
  draftBtn.addEventListener('click', function () {
    if (state.draftCount >= state.draftLimit) {
      setStatus(draftStatus, 'Session limit (' + state.draftLimit + ' drafts) reached. Refresh to start a new session.');
      return;
    }
    var text = transcript.value.trim();
    if (!text) {
      setStatus(draftStatus, 'Paste a summary or click "Load sample" first.');
      return;
    }
    // PII gate
    var items = findPii(text);
    if (items.length) {
      openPiiPanel(items);
      setStatus(draftStatus, 'PII flagged — redact or confirm to continue.');
      return;
    }
    runDraft();
  });

  function currentScenarioOutput() {
    var key = scenarioSel.value;
    var o = OUTPUTS[key];
    return { subject: o.subject, summary: o[state.mode] };
  }

  function ruleBasedDraft(text) {
    // Best-effort extraction for arbitrary (non-sample) input.
    var ticket = (text.match(/\b(?:SD|INC|TKT)[- ]?\d{2,6}\b/i) || [])[0] || '';
    var order = (text.match(/\bSO[- ]?\d{4,8}\b/i) || [])[0] || '';
    var nameMatch = text.match(/customer,?\s+([A-Z][a-z]+)/);
    var name = nameMatch ? nameMatch[1] : 'the customer';
    // grab text after "Result:" if present
    var resultIdx = text.toLowerCase().indexOf('result:');
    var body = resultIdx >= 0 ? text.slice(resultIdx + 7).trim() : text.replace(/^(reason for call:|agent actions:|result:)/gim, '').trim();
    body = body.replace(/the agent/gi, 'Janackeh').replace(/\bagent\b/gi, 'Janackeh');
    var summary = body || 'No result details found in the input.';
    if (ticket) summary += ' Ticket ' + ticket + ' was created.';
    var subject = name + ' called' + (order ? ' about order ' + order : ' about a support issue');
    return { subject: subject, summary: summary };
  }

  function runDraft() {
    var text = transcript.value.trim();
    if (!text) { setStatus(draftStatus, 'Nothing to draft.'); return; }
    state.draftCount++;
    var key = scenarioSel.value;
    var isSample = text.indexOf(SAMPLES[key].text.substring(0, 40)) === 0;
    var out = isSample ? currentScenarioOutput() : ruleBasedDraft(text);
    renderOutput(out);
    state.originalDraft = { subject: out.subject, summary: out.summary };
    diffBtn.disabled = false;
    diffPanel.hidden = true;
    setStatus(draftStatus, 'Draft ' + state.draftCount + '/' + state.draftLimit + ' ready — review and edit.');
  }

  function renderOutput(out) {
    outputEmpty.hidden = true;
    output.hidden = false;
    subjectOut.value = out.subject;          // .value = safe (no HTML)
    summaryOut.value = out.summary;
    diffPanel.hidden = true;
    diffStatus.textContent = '';
  }

  /* ---------- Copy ---------- */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-copy');
      var el = document.getElementById(id);
      if (!el) return;
      var text = el.value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          flashCopied(btn);
        }).catch(function () { fallbackCopy(text, btn); });
      } else {
        fallbackCopy(text, btn);
      }
    });
  });
  function flashCopied(btn) {
    var prev = btn.textContent; btn.textContent = 'Copied'; btn.classList.add('copied');
    setTimeout(function () { btn.textContent = prev; btn.classList.remove('copied'); }, 1400);
  }
  function fallbackCopy(text, btn) {
    var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); flashCopied(btn); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- Diff (word-level LCS, inline) ---------- */
  diffBtn.addEventListener('click', function () {
    if (!state.originalDraft) return;
    var subjDiff = wordDiffHtml(state.originalDraft.subject, subjectOut.value);
    var sumDiff = wordDiffHtml(state.originalDraft.summary, summaryOut.value);
    diffSubject.setAttribute('data-label', 'Subject');
    diffSummary.setAttribute('data-label', 'Call Summary');
    var changed = (subjectOut.value !== state.originalDraft.subject) || (summaryOut.value !== state.originalDraft.summary);
    diffSubject.innerHTML = subjDiff;
    diffSummary.innerHTML = sumDiff;
    diffPanel.hidden = false;
    if (!changed) {
      setStatus(diffStatus, 'No changes — the AI draft was kept as-is.');
    } else {
      setStatus(diffStatus, 'Showing your edits vs. the AI draft.');
    }
  });

  function tokenize(text) {
    // split into words and whitespace tokens, preserving both
    return text.split(/(\s+)/);
  }
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function wordDiffHtml(a, b) {
    var aw = tokenize(a), bw = tokenize(b);
    var n = aw.length, m = bw.length;
    // LCS length table
    var dp = [];
    for (var i = 0; i <= n; i++) { dp[i] = []; for (var j = 0; j <= m; j++) dp[i][j] = 0; }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        dp[i][j] = (aw[i] === bw[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    // build diff
    var out = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (aw[i] === bw[j]) { out.push('<span class="diff-unchanged">' + esc(aw[i]) + '</span>'); i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push('<span class="diff-del">' + esc(aw[i]) + '</span>'); i++; }
      else { out.push('<span class="diff-add">' + esc(bw[j]) + '</span>'); j++; }
    }
    while (i < n) { out.push('<span class="diff-del">' + esc(aw[i]) + '</span>'); i++; }
    while (j < m) { out.push('<span class="diff-add">' + esc(bw[j]) + '</span>'); j++; }
    var html = out.join('');
    if (a === b) html = '<span class="diff-none">No changes.</span>';
    return html;
  }

  /* ---------- Helpers ---------- */
  function setStatus(el, msg) { if (el) el.textContent = msg; }

})();
