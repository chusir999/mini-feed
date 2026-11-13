/**
 * 微记 MiniFeed
 * 纯原生实现：localStorage 持久化 + 发布 + 时间线展示
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'minifeed.posts';
  var MAX_LENGTH = 280;
  var MAX_POSTS = 500;

  var form = document.getElementById('post-form');
  var input = document.getElementById('post-input');
  var submitBtn = document.getElementById('submit-btn');
  var counter = document.getElementById('counter');
  var statusEl = document.getElementById('status');
  var listEl = document.getElementById('post-list');
  var emptyEl = document.getElementById('empty-state');
  var countEl = document.getElementById('post-count');
  var template = document.getElementById('post-template');

  var statusTimer = null;

  /* ---------------- Storage 层 ---------------- */

  function isValidPost(item) {
    return (
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.text === 'string' &&
      typeof item.createdAt === 'number' &&
      isFinite(item.createdAt)
    );
  }

  function loadPosts() {
    var raw;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return [];
    }
    if (!raw) return [];

    var parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      return [];
    }
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isValidPost).sort(function (a, b) {
      return b.createdAt - a.createdAt;
    });
  }

  function savePosts(posts) {
    var payload = posts.slice(0, MAX_POSTS);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      return true;
    } catch (err) {
      setStatus('保存失败：浏览器存储不可用或已写满，请检查隐私模式设置。', 'error');
      return false;
    }
  }

  /* ---------------- Service 层 ---------------- */

  function createPost(text) {
    return {
      id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
      text: text,
      createdAt: Date.now()
    };
  }

  /* ---------------- View 层 ---------------- */

  function formatTime(timestamp) {
    var diff = Date.now() - timestamp;
    var minute = 60 * 1000;
    var hour = 60 * minute;
    var day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return Math.floor(diff / minute) + ' 分钟前';
    if (diff < day) return Math.floor(diff / hour) + ' 小时前';
    if (diff < 7 * day) return Math.floor(diff / day) + ' 天前';

    var date = new Date(timestamp);
    var pad = function (n) {
      return n < 10 ? '0' + n : String(n);
    };
    var stamp = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
    return date.getFullYear() === new Date().getFullYear()
      ? stamp.slice(5)
      : stamp;
  }

  function buildPostNode(post, isNew) {
    var node = template.content.firstElementChild.cloneNode(true);
    var timeEl = node.querySelector('.post-time');
    var textEl = node.querySelector('.post-text');

    timeEl.setAttribute('datetime', new Date(post.createdAt).toISOString());
    timeEl.textContent = formatTime(post.createdAt);
    textEl.textContent = post.text;

    if (isNew) node.classList.add('is-new');
    return node;
  }

  function renderTimeline(highlightId) {
    var posts = loadPosts();
    var fragment = document.createDocumentFragment();

    posts.forEach(function (post) {
      fragment.appendChild(buildPostNode(post, post.id === highlightId));
    });

    listEl.textContent = '';
    listEl.appendChild(fragment);

    emptyEl.hidden = posts.length > 0;
    countEl.textContent = posts.length + ' 条记录';
  }

  function setStatus(message, type) {
    if (statusTimer) {
      window.clearTimeout(statusTimer);
      statusTimer = null;
    }
    statusEl.textContent = message || '';
    statusEl.className = 'status' + (type ? ' is-' + type : '');

    if (message) {
      statusTimer = window.setTimeout(function () {
        statusEl.textContent = '';
        statusEl.className = 'status';
      }, 2600);
    }
  }

  function updateComposerState() {
    var length = input.value.length;
    var trimmed = input.value.trim().length;

    counter.textContent = length + '/' + MAX_LENGTH;
    counter.className = 'counter';
    if (length >= MAX_LENGTH) {
      counter.classList.add('is-over');
    } else if (length >= MAX_LENGTH - 40) {
      counter.classList.add('is-warning');
    }

    submitBtn.disabled = trimmed === 0;
  }

  function autoGrow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 260) + 'px';
  }

  /* ---------------- 交互 ---------------- */

  function handleSubmit(event) {
    if (event) event.preventDefault();

    var text = input.value.trim();

    if (!text) {
      setStatus('内容不能为空。', 'error');
      input.focus();
      return;
    }
    if (text.length > MAX_LENGTH) {
      setStatus('内容超出 ' + MAX_LENGTH + ' 字上限。', 'error');
      return;
    }

    var post = createPost(text);
    var posts = loadPosts();
    posts.unshift(post);

    if (!savePosts(posts)) return;

    input.value = '';
    autoGrow();
    updateComposerState();
    renderTimeline(post.id);
    setStatus('发布成功。', 'success');
    input.focus();

    window.requestAnimationFrame(function () {
      var first = listEl.firstElementChild;
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  input.addEventListener('input', function () {
    updateComposerState();
    autoGrow();
  });

  input.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      handleSubmit();
    }
  });

  form.addEventListener('submit', handleSubmit);

  renderTimeline();
  updateComposerState();
  autoGrow();

  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY) renderTimeline();
  });
})();
