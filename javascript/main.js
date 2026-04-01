'use strict';

const PORTFOLIO_CONFIG = {
  username: '20040608',
  limit: 6,
  cacheTtlMs: 600000,
};

const CACHE_KEY = `portfolio:${PORTFOLIO_CONFIG.username}:repos:v1`;
const PROFILE_CACHE_KEY = `portfolio:${PORTFOLIO_CONFIG.username}:profile:v1`;
const TASHKENT_TIMEZONE = 'Asia/Tashkent';
const MOBILE_SIDEBAR_QUERY = '(max-width: 1023px)';

const RESUME_DATA = {
  name: 'Sherkhon Isaev',
  role: 'Frontend Developer',
  contacts: {
    email: 'isayevsh04@gmail.com',
    phone: '+998 93 129 3548',
    location: 'Chilanzar, Tashkent, Uzbekistan',
    github: 'github.com/20040608',
    githubUrl: 'https://github.com/20040608',
  },
  summary:
    'Frontend Developer with practical experience building responsive interfaces and interaction-focused web pages. Strong foundation in HTML, CSS, JavaScript, and basic TypeScript with emphasis on maintainable structure and clear UX behavior.',
  achievements: [
    'Maintained an active GitHub portfolio with 60+ public repositories demonstrating steady frontend practice.',
    'Implemented a recruiter-focused personal site with live GitHub project integration and reusable UI sections.',
    'Built mobile-first layouts with consistent spacing systems and predictable navigation behavior.',
  ],
  techStack: ['HTML5', 'CSS3', 'JavaScript', 'TypeScript', 'SCSS', 'Responsive Design', 'Git & GitHub'],
  projectImpact: [
    'CRM-Sherkhon (JavaScript): Implemented structured UI screens and reusable frontend patterns for CRM-style workflows.',
    'DriverTestMaster (TypeScript): Built typed interface logic with responsive layout behavior for test-oriented interactions.',
    'Sherkhon_Isaev Portfolio (CSS/JavaScript): Designed and iterated a recruiter-oriented portfolio with dynamic GitHub data.',
  ],
  education: [
    'Tashkent University of Information Technologies (2022 - 2026)',
    'Secondary Education School (2011 - 2022)',
  ],
};

const state = {
  repos: [],
  currentFilter: 'all',
  profile: null,
};

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const normalizeBaseUrl = (value) => String(value || '').trim().replace(/\/+$/, '');

const API_BASE_URL = (() => {
  const datasetBase = normalizeBaseUrl(document.documentElement.dataset.apiBase);

  if (datasetBase) {
    return datasetBase;
  }

  if (window.location.protocol === 'file:') {
    return 'http://localhost:3000';
  }

  return '';
})();

const getApiUrl = (path) => {
  const cleanPath = String(path || '').startsWith('/') ? String(path) : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${cleanPath}` : cleanPath;
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[char] || char;
  });

const sanitizeUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch (_error) {
    // Return safe fallback.
  }

  return '#';
};

const formatCompactNumber = (value) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatDate = (dateString) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const applyStaggerDelays = (elements, stepMs = 70) => {
  elements.forEach((element, index) => {
    const delay = prefersReducedMotion ? 0 : index * stepMs;
    element.style.transitionDelay = `${delay}ms`;
  });
};

const animateNumber = (element, target, duration = 800, delay = 0) => {
  if (prefersReducedMotion) {
    element.textContent = `${target}%`;
    return;
  }

  const startAt = performance.now() + delay;

  const tick = (now) => {
    if (now < startAt) {
      requestAnimationFrame(tick);
      return;
    }

    const progress = Math.min((now - startAt) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    element.textContent = `${Math.round(target * eased)}%`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const animateCoreSkills = () => {
  const skillSection = qs('.skill');
  if (!skillSection) {
    return;
  }

  const fills = qsa('[data-skill-fill]', skillSection);
  const values = qsa('[data-skill-value]', skillSection);

  fills.forEach((fill) => {
    const level = Math.max(0, Math.min(Number(fill.dataset.level) || 0, 100));
    fill.style.setProperty('--skill-scale', String(level / 100));

    if (prefersReducedMotion) {
      fill.style.transform = `scaleX(${level / 100})`;
    } else {
      fill.style.removeProperty('transform');
    }
  });

  if (!prefersReducedMotion) {
    skillSection.classList.remove('skills-animate');
    // Force reflow for deterministic replay on each Resume tab activation.
    void skillSection.offsetWidth;
    skillSection.classList.add('skills-animate');
  }

  values.forEach((valueEl, index) => {
    const level = Math.max(0, Math.min(Number(valueEl.value) || 0, 100));

    if (prefersReducedMotion) {
      valueEl.textContent = `${level}%`;
      return;
    }

    valueEl.textContent = '0%';
    animateNumber(valueEl, level, 760, index * 90);
  });
};

const setPdfStatus = (message = '', type = '') => {
  const status = qs('[data-pdf-status]');
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.remove('is-success', 'is-error');

  if (type === 'success') {
    status.classList.add('is-success');
  }

  if (type === 'error') {
    status.classList.add('is-error');
  }
};

const setFormStatus = (message = '', type = '') => {
  const status = qs('[data-form-status]');
  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.remove('is-success', 'is-error');

  if (type === 'success') {
    status.classList.add('is-success');
  }

  if (type === 'error') {
    status.classList.add('is-error');
  }
};

const setRuntimeHints = () => {
  if (window.location.protocol !== 'file:') {
    return;
  }

  setFormStatus('Local file mode detected. Run `npm run local` (or open start-local.bat), then open http://localhost:3000.', 'error');
};

const setSidebarToggle = () => {
  const sidebar = qs('[data-sidebar]');
  const toggleArea = qs('[data-sidebar-toggle]');
  const toggleBtn = qs('[data-sidebar-btn]');
  const mobileSidebar = window.matchMedia(MOBILE_SIDEBAR_QUERY);

  if (!sidebar || !toggleArea || !toggleBtn) {
    return;
  }

  const setExpandedState = (isExpanded) => {
    toggleBtn.setAttribute('aria-expanded', String(isExpanded));
    toggleArea.setAttribute('aria-expanded', String(isExpanded));
  };

  const syncToggleState = () => {
    if (mobileSidebar.matches) {
      toggleArea.classList.add('is-collapsible');
      toggleArea.setAttribute('role', 'button');
      toggleArea.setAttribute('tabindex', '0');
      setExpandedState(sidebar.classList.contains('active'));
      return;
    }

    sidebar.classList.remove('active');
    toggleArea.classList.remove('is-collapsible');
    toggleArea.removeAttribute('role');
    toggleArea.removeAttribute('tabindex');
    toggleArea.removeAttribute('aria-expanded');
    toggleBtn.setAttribute('aria-expanded', 'true');
  };

  const toggleSidebar = () => {
    if (!mobileSidebar.matches) {
      return;
    }

    const isActive = sidebar.classList.toggle('active');
    setExpandedState(isActive);
  };

  toggleArea.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      return;
    }

    toggleSidebar();
  });

  toggleArea.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    toggleSidebar();
  });

  toggleBtn.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleSidebar();
  });

  syncToggleState();
  mobileSidebar.addEventListener('change', syncToggleState);
};

const setPageNavigation = () => {
  const navLinks = qsa('[data-nav-link]');
  const pages = qsa('[data-page]');

  if (!navLinks.length || !pages.length) {
    return;
  }

  const activatePage = (targetPage) => {
    let found = false;

    pages.forEach((page) => {
      const isActive = page.dataset.page === targetPage;
      page.classList.toggle('active', isActive);
      if (isActive) {
        found = true;
      }
    });

    navLinks.forEach((link) => {
      link.classList.toggle('active', link.dataset.target === targetPage);
    });

    if (found) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      triggerRevealInActivePage();
    }
  };

  navLinks.forEach((link) => {
    link.addEventListener('click', () => {
      const target = link.dataset.target;
      if (target) {
        activatePage(target);
      }
    });
  });

  qsa('[data-nav-jump]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.navJump;
      if (target) {
        activatePage(target);
      }
    });
  });
};

const setFormValidation = () => {
  const form = qs('[data-form]');
  const inputs = qsa('[data-form-input]');
  const submitBtn = qs('[data-form-btn]');

  if (!form || !inputs.length || !submitBtn) {
    return;
  }

  const toggleState = () => {
    submitBtn.disabled = !form.checkValidity();
  };

  inputs.forEach((input) => input.addEventListener('input', toggleState));

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  toggleState();
};

const setContactDelivery = () => {
  const form = qs('[data-form]');
  const submitBtn = qs('[data-form-btn]');
  if (!form || !submitBtn) {
    return;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      return;
    }

    const formData = new FormData(form);
    const fullName = String(formData.get('fullname') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const message = String(formData.get('message') || '').trim();

    if (!fullName || !email || !message) {
      return;
    }

    submitBtn.disabled = true;
    setFormStatus('Sending your message...');

    try {
      const response = await fetch(getApiUrl('/api/contact'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname: fullName,
          email,
          message,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      const isSuccess = response.ok && payload && payload.success === true;

      if (!isSuccess) {
        const errorMessage = payload && typeof payload.message === 'string'
          ? payload.message
          : 'Message could not be sent right now.';
        throw new Error(errorMessage);
      }

      form.reset();
      submitBtn.disabled = true;
      setFormStatus('Message sent successfully. I will reply to your email soon.', 'success');
      return;
    } catch (error) {
      let fallbackMessage = 'Message could not be sent.';

      if (error instanceof TypeError) {
        fallbackMessage = 'Contact API is unreachable. Run `npm run local` (or start-local.bat), then open http://localhost:3000.';
      } else if (error instanceof Error && /Missing:\s*SMTP_PASS/i.test(error.message)) {
        fallbackMessage = 'Email sending is not configured yet. Set SMTP_PASS in .env (Gmail App Password), restart server, and try again.';
      } else if (error instanceof Error && error.message) {
        fallbackMessage = error.message;
      }

      setFormStatus(fallbackMessage, 'error');
    } finally {
      if (form.checkValidity()) {
        submitBtn.disabled = false;
      }
    }
  });
};

const getCachedValue = (cacheKey) => {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.timestamp !== 'number') {
      return null;
    }

    if (Date.now() - parsed.timestamp > PORTFOLIO_CONFIG.cacheTtlMs) {
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    return parsed.data;
  } catch (_error) {
    return null;
  }
};

const setCachedValue = (cacheKey, data) => {
  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      }),
    );
  } catch (_error) {
    // Cache failure is non-blocking.
  }
};

const applyGitHubAvatar = (avatarUrl) => {
  if (!avatarUrl) {
    return;
  }

  qsa('[data-github-avatar]').forEach((element) => {
    if (!(element instanceof HTMLImageElement)) {
      return;
    }

    const fallbackSrc = element.dataset.fallbackSrc || element.src;

    if (element.dataset.avatarBound !== 'true') {
      element.dataset.avatarBound = 'true';
      element.addEventListener('error', () => {
        element.src = fallbackSrc;
      });
    }

    element.src = avatarUrl;
  });
};

const setDynamicFavicon = (iconUrl) => {
  if (!iconUrl) {
    return;
  }

  const favicon = qs('[data-site-favicon]');
  if (!favicon) {
    return;
  }

  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.referrerPolicy = 'no-referrer';

  image.onload = () => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) {
      favicon.setAttribute('href', iconUrl);
      return;
    }

    context.clearRect(0, 0, size, size);
    context.save();
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.closePath();
    context.clip();
    context.drawImage(image, 0, 0, size, size);
    context.restore();

    try {
      const roundedDataUrl = canvas.toDataURL('image/png');
      favicon.setAttribute('href', roundedDataUrl);
      favicon.setAttribute('type', 'image/png');
    } catch (_error) {
      favicon.setAttribute('href', iconUrl);
    }
  };

  image.onerror = () => {
    favicon.setAttribute('href', iconUrl);
  };

  image.src = iconUrl;
};

const setLocalTime = () => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: TASHKENT_TIMEZONE,
  });

  const value = formatter.format(new Date());
  qsa('[data-local-time]').forEach((node) => {
    node.textContent = value;
  });
};

const fetchGitHubProfile = async () => {
  const endpoint = `https://api.github.com/users/${encodeURIComponent(PORTFOLIO_CONFIG.username)}`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub profile request failed with status ${response.status}`);
  }

  return response.json();
};

const renderProfileSignals = (profile) => {
  if (!profile || typeof profile !== 'object') {
    return;
  }

  state.profile = profile;
  applyGitHubAvatar(profile.avatar_url);
  setDynamicFavicon(profile.avatar_url);

  const repoCount = Number(profile.public_repos) || 0;
  const followerCount = Number(profile.followers) || 0;
  const followingCount = Number(profile.following) || 0;

  const reposNode = qs('[data-profile-repos]');
  const followersNode = qs('[data-profile-followers]');
  const followingNode = qs('[data-profile-following]');
  const bioNode = qs('[data-profile-bio]');

  if (reposNode) {
    reposNode.textContent = formatCompactNumber(repoCount);
  }

  if (followersNode) {
    followersNode.textContent = formatCompactNumber(followerCount);
  }

  if (followingNode) {
    followingNode.textContent = formatCompactNumber(followingCount);
  }

  if (bioNode && profile.bio) {
    bioNode.textContent = profile.bio;
  }
};

const loadGitHubProfileSignals = async () => {
  try {
    const cached = getCachedValue(PROFILE_CACHE_KEY);
    const profile = cached || (await fetchGitHubProfile());

    if (!cached) {
      setCachedValue(PROFILE_CACHE_KEY, profile);
    }

    renderProfileSignals(profile);
  } catch (_error) {
    // Keep default static content on failure.
  }
};

const mapRepo = (repo) => ({
  name: repo.name,
  description: repo.description || 'No description provided.',
  language: repo.language || 'Unknown',
  stars: Number(repo.stargazers_count) || 0,
  updatedAt: repo.updated_at,
  repoUrl: repo.html_url,
});

const fetchRepos = async () => {
  const endpoint = `https://api.github.com/users/${encodeURIComponent(PORTFOLIO_CONFIG.username)}/repos?per_page=100&sort=updated&type=owner`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API request failed with status ${response.status}`);
  }

  const repos = await response.json();
  if (!Array.isArray(repos)) {
    throw new Error('GitHub API response was not an array');
  }

  return repos
    .filter((repo) => !repo.fork)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, PORTFOLIO_CONFIG.limit)
    .map(mapRepo);
};

const setPortfolioState = (mode) => {
  const loadingState = qs('[data-portfolio-loading]');
  const emptyState = qs('[data-portfolio-empty]');
  const errorState = qs('[data-portfolio-error]');
  const grid = qs('[data-portfolio-grid]');

  if (!loadingState || !emptyState || !errorState || !grid) {
    return;
  }

  loadingState.hidden = mode !== 'loading';
  emptyState.hidden = mode !== 'empty';
  errorState.hidden = mode !== 'error';
  grid.hidden = mode !== 'ready';
};

const setActiveFilterChip = (filter) => {
  qsa('[data-filter-controls] [data-filter]').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.filter === filter);
  });
};

const buildFilterChips = (repos) => {
  const controls = qs('[data-filter-controls]');
  if (!controls) {
    return;
  }

  controls.innerHTML = '';

  const languages = Array.from(new Set(repos.map((repo) => repo.language).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );

  const filters = ['all', ...languages];

  filters.forEach((filter) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-chip';
    button.dataset.filter = filter;
    button.textContent = filter === 'all' ? 'All' : filter;
    controls.appendChild(button);
  });

  setActiveFilterChip(state.currentFilter);
};

const buildImpactEntriesFromRepos = (repos) =>
  repos.slice(0, 3).map((repo) => ({
    name: repo.name,
    language: repo.language,
    updatedAt: repo.updatedAt,
    url: repo.repoUrl,
    summary: `Implemented and refined frontend structures with responsive layout decisions and reusable styling patterns.`,
  }));

const renderProjectImpact = (entries) => {
  const target = qs('[data-project-impact-list]');
  if (!target) {
    return;
  }

  if (!entries.length) {
    target.innerHTML = '<li class="impact-item">Project impact summary is unavailable at the moment.</li>';
    return;
  }

  target.innerHTML = entries
    .map((entry) => {
      const safeName = escapeHtml(entry.name);
      const safeLang = escapeHtml(entry.language || 'Unknown');
      const safeDate = escapeHtml(formatDate(entry.updatedAt));
      const safeSummary = escapeHtml(entry.summary);
      const safeUrl = sanitizeUrl(entry.url || RESUME_DATA.contacts.githubUrl);

      return `<li class="impact-item"><a class="impact-link" href="${safeUrl}" target="_blank" rel="noreferrer">${safeName}</a> (${safeLang}, updated ${safeDate}) - ${safeSummary}</li>`;
    })
    .join('');
};

const renderPortfolio = () => {
  const grid = qs('[data-portfolio-grid]');
  if (!grid) {
    return;
  }

  const filtered = state.currentFilter === 'all'
    ? state.repos
    : state.repos.filter((repo) => repo.language === state.currentFilter);

  if (!filtered.length) {
    grid.innerHTML = '';
    setPortfolioState('empty');
    return;
  }

  grid.innerHTML = filtered
    .map((repo) => {
      const safeName = escapeHtml(repo.name);
      const safeDescription = escapeHtml(repo.description);
      const safeLanguage = escapeHtml(repo.language);
      const safeStars = escapeHtml(repo.stars);
      const safeDate = escapeHtml(formatDate(repo.updatedAt));
      const safeUrl = sanitizeUrl(repo.repoUrl);

      return `
        <li class="portfolio-card" data-reveal>
          <a class="project-link" href="${safeUrl}" target="_blank" rel="noreferrer">
            <div class="project-head">
              <h3 class="project-name">${safeName}</h3>
              <ion-icon class="repo-icon" name="open-outline"></ion-icon>
            </div>
            <p class="project-desc">${safeDescription}</p>
            <div class="project-meta">
              <span class="meta-pill"><ion-icon name="code-slash-outline"></ion-icon>${safeLanguage}</span>
              <span class="meta-pill"><ion-icon name="star-outline"></ion-icon>${safeStars}</span>
              <span class="meta-pill"><ion-icon name="time-outline"></ion-icon>${safeDate}</span>
            </div>
          </a>
        </li>
      `;
    })
    .join('');

  setPortfolioState('ready');

  const revealItems = qsa('[data-portfolio-grid] [data-reveal]');
  applyStaggerDelays(revealItems, 70);
  observeRevealElements(revealItems);
};

const loadPortfolio = async ({ forceRefresh = false } = {}) => {
  if (forceRefresh) {
    sessionStorage.removeItem(CACHE_KEY);
  }

  setPortfolioState('loading');

  try {
    const cached = !forceRefresh ? getCachedValue(CACHE_KEY) : null;
    const repos = cached || (await fetchRepos());

    if (!cached) {
      setCachedValue(CACHE_KEY, repos);
    }

    state.repos = repos;
    state.currentFilter = 'all';

    buildFilterChips(repos);
    renderPortfolio();
    renderProjectImpact(buildImpactEntriesFromRepos(repos));

    if (!repos.length) {
      setPortfolioState('empty');
    }
  } catch (_error) {
    setPortfolioState('error');
  }
};

const setPortfolioInteractions = () => {
  const controls = qs('[data-filter-controls]');
  const retryButton = qs('[data-portfolio-retry]');

  if (controls) {
    controls.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const filter = target.dataset.filter;
      if (!filter) {
        return;
      }

      state.currentFilter = filter;
      setActiveFilterChip(filter);
      renderPortfolio();
    });
  }

  if (retryButton) {
    retryButton.addEventListener('click', () => {
      loadPortfolio({ forceRefresh: true });
    });
  }
};

const renderResumeContent = () => {
  const summaryNode = qs('[data-resume-summary]');
  const achievementsNode = qs('[data-achievements-list]');
  const stackNode = qs('[data-tech-stack]');

  if (summaryNode) {
    summaryNode.textContent = RESUME_DATA.summary;
  }

  if (achievementsNode) {
    achievementsNode.innerHTML = RESUME_DATA.achievements.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  }

  if (stackNode) {
    stackNode.innerHTML = RESUME_DATA.techStack
      .map((item) => `<span class="stack-chip">${escapeHtml(item)}</span>`)
      .join('');
  }

  if (!state.repos.length) {
    const fallbackImpact = RESUME_DATA.projectImpact.map((item) => ({
      name: item.split(':')[0],
      language: 'Frontend',
      updatedAt: new Date().toISOString(),
      url: RESUME_DATA.contacts.githubUrl,
      summary: item.includes(':') ? item.split(':').slice(1).join(':').trim() : item,
    }));

    renderProjectImpact(fallbackImpact.slice(0, 3));
  }
};

const getProjectImpactForPdf = () => {
  if (state.repos.length) {
    return buildImpactEntriesFromRepos(state.repos).map(
      (entry) => `${entry.name} (${entry.language || 'Unknown'}): ${entry.summary}`,
    );
  }

  return RESUME_DATA.projectImpact;
};

const generateResumePdf = (data) => {
  const jsPdfCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPdfCtor) {
    throw new Error('PDF library is not available.');
  }

  const doc = new jsPdfCtor({
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const maxWidth = pageWidth - margin * 2;
  const pageBottom = pageHeight - 36;

  let y = margin;

  const ensureRoom = (requiredHeight) => {
    if (y + requiredHeight <= pageBottom) {
      return true;
    }

    return false;
  };

  const writeLine = (text, options = {}) => {
    const {
      fontSize = 11,
      isBold = false,
      spacing = 14,
      indent = 0,
      prefix = '',
    } = options;

    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);

    const rawText = `${prefix}${text}`;
    const lines = doc.splitTextToSize(rawText, maxWidth - indent);
    const requiredHeight = lines.length * spacing + 2;

    if (!ensureRoom(requiredHeight)) {
      return false;
    }

    doc.text(lines, margin + indent, y);
    y += requiredHeight;
    return true;
  };

  const writeSectionTitle = (title) => writeLine(title, { fontSize: 12, isBold: true, spacing: 16 });

  writeLine(data.name, { fontSize: 20, isBold: true, spacing: 22 });
  writeLine(data.role, { fontSize: 12, spacing: 16 });

  const contactLine = `${data.contacts.email} | ${data.contacts.phone} | ${data.contacts.location} | ${data.contacts.github}`;
  writeLine(contactLine, { fontSize: 9.5, spacing: 13 });

  writeSectionTitle('Professional Summary');
  writeLine(data.summary, { fontSize: 10, spacing: 13 });

  writeSectionTitle('Key Achievements');
  data.achievements.slice(0, 3).forEach((item) => {
    writeLine(item, { fontSize: 10, spacing: 13, prefix: '- ' });
  });

  writeSectionTitle('Tech Stack');
  writeLine(data.techStack.join(', '), { fontSize: 10, spacing: 13 });

  writeSectionTitle('Projects Impact');
  getProjectImpactForPdf().slice(0, 3).forEach((item) => {
    writeLine(item, { fontSize: 10, spacing: 13, prefix: '- ' });
  });

  writeSectionTitle('Education');
  data.education.forEach((item) => {
    writeLine(item, { fontSize: 10, spacing: 13, prefix: '- ' });
  });

  if (ensureRoom(18)) {
    y += 8;
    const generatedAt = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    writeLine(`Generated from portfolio on ${generatedAt}`, {
      fontSize: 9,
      spacing: 12,
    });
  }

  doc.save('Sherkhon_Isaev_Resume.pdf');
};

const setResumeDownload = () => {
  const button = qs('[data-download-resume]');
  if (!button) {
    return;
  }

  button.addEventListener('click', () => {
    setPdfStatus('Preparing PDF resume...');

    try {
      generateResumePdf(RESUME_DATA);
      setPdfStatus('Resume PDF downloaded successfully.', 'success');
    } catch (_error) {
      setPdfStatus('PDF generation is unavailable right now. Please refresh and try again.', 'error');
    }
  });
};

let revealObserver = null;

const observeRevealElements = (elements) => {
  if (!elements.length) {
    return;
  }

  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
  }

  elements.forEach((element) => {
    if (!element.classList.contains('is-visible')) {
      revealObserver.observe(element);
    }
  });
};

const triggerRevealInActivePage = () => {
  const activePage = qs('article.active');
  if (!activePage) {
    return;
  }

  const revealElements = qsa('[data-reveal]', activePage);
  applyStaggerDelays(revealElements, 70);
  observeRevealElements(revealElements);

  if (activePage.dataset.page === 'resume') {
    animateCoreSkills();
  }
};

const init = () => {
  renderResumeContent();
  setRuntimeHints();
  setSidebarToggle();
  setPageNavigation();
  setFormValidation();
  setContactDelivery();
  setPortfolioInteractions();
  setResumeDownload();

  setLocalTime();
  window.setInterval(setLocalTime, 60000);

  loadGitHubProfileSignals();
  triggerRevealInActivePage();
  loadPortfolio();
};

init();
