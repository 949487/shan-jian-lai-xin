(function () {
  "use strict";

  var root = document.documentElement;
  var POSTS = (window.POSTS || []).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(d) { return String(d).replace(/-/g, "."); }

  function yearOf(d) { return String(d).slice(0, 4); }

  function seasonOf(d) {
    var m = Number(String(d).slice(5, 7));
    return (m === 12 || m <= 2) ? "冬" : m <= 5 ? "春" : m <= 8 ? "夏" : "秋";
  }

  function plainText(html) { return String(html || "").replace(/<[^>]*>/g, " "); }

  function readingTime(post) {
    var text = plainText(post.content || "");
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = text.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round((cjk + words * 1.6) / 340));
  }

  var SITE_BASE = "https://949487.github.io/shan-jian-lai-xin/";
  var SITE_NAME = "山间来信";

  var ICON = {
    check: '<svg class="check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
  };

  /* ---------------- 主题 ---------------- */
  var metaTheme = $('meta[name="theme-color"]');

  function applyTheme(theme, persist) {
    root.dataset.theme = theme;
    if (persist) {
      try { localStorage.setItem("theme", theme); } catch (e) {}
    }
    if (metaTheme) metaTheme.setAttribute("content", theme === "dark" ? "#0f120f" : "#faf6ec");
    $$("[data-theme-toggle]").forEach(function (btn) {
      btn.setAttribute("aria-label", theme === "dark" ? "切换浅色模式" : "切换深色模式");
    });
  }

  applyTheme(root.dataset.theme || "light", false);

  var themeBusy = false;

  $$("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      if (themeBusy) return;
      var next = root.dataset.theme === "dark" ? "light" : "dark";

      if (reduceMotion || !document.startViewTransition) {
        applyTheme(next, true);
        return;
      }

      var rect = btn.getBoundingClientRect();
      root.style.setProperty("--vt-x", (rect.left + rect.width / 2) + "px");
      root.style.setProperty("--vt-y", (rect.top + rect.height / 2) + "px");

      themeBusy = true;
      var transition = document.startViewTransition(function () { applyTheme(next, true); });
      transition.finished.then(function () { themeBusy = false; }, function () { themeBusy = false; });
    });
  });

  /* ---------------- 顶栏 / 进度 / 回到顶部 ---------------- */
  var header = $("#site-header");
  var progress = $("#read-progress");
  var toTop = $("#to-top");
  var copyFab = $("#copy-fab");
  var tocHeads = [];
  var tocLinks = [];
  var tocLocked = false;
  var tocLockTimer = null;
  var lastY = 0;
  var mobileQuery = window.matchMedia("(max-width: 680px)");

  // 与 CSS 的 scroll-padding-top 保持一致，锚点跳转和目录高亮才不会错位
  function readScrollPad() {
    var v = parseFloat(window.getComputedStyle(root).scrollPaddingTop);
    return isNaN(v) ? 96 : v;
  }
  var scrollPad = readScrollPad();
  window.addEventListener("resize", function () { scrollPad = readScrollPad(); }, { passive: true });

  function highlightToc(active) {
    tocLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + active.id);
    });
  }

  function updateScrollUI() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle("is-scrolled", y > 20);
    // 移动端向下阅读时收起浮动按钮，避免遮住正文；向上滑或接近页尾时再出现
    var nearEnd = y + window.innerHeight >= document.documentElement.scrollHeight - 60;
    if (toTop) {
      var showFab = y > 420 && (!mobileQuery.matches || y < lastY - 2 || nearEnd);
      toTop.classList.toggle("is-show", showFab);
    }
    if (copyFab) copyFab.classList.toggle("is-show", y > 420);
    lastY = y;

    if (progress) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
      progress.style.transform = "scaleX(" + ratio + ")";
    }

    if (tocHeads.length && !tocLocked) {
      // 标题滚到顶栏下方留白处即视为当前小节
      var offset = scrollPad + 8;
      var active = tocHeads[0];
      for (var i = 0; i < tocHeads.length; i++) {
        if (tocHeads[i].getBoundingClientRect().top <= offset) active = tocHeads[i];
      }
      // 页面到底时，最后一节可能无法滚到顶部，直接高亮最后一项
      if (y + window.innerHeight >= document.documentElement.scrollHeight - 4) {
        active = tocHeads[tocHeads.length - 1];
      }
      highlightToc(active);
    }
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      updateScrollUI();
      ticking = false;
    });
  }, { passive: true });

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------- Ripple ---------------- */
  document.addEventListener("pointerdown", function (e) {
    if (reduceMotion) return;
    var el = e.target.closest ? e.target.closest(".ripple") : null;
    if (!el) return;

    var rect = el.getBoundingClientRect();
    var size = Math.max(rect.width, rect.height) * 2.2;
    var wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.width = wave.style.height = size + "px";
    wave.style.left = (e.clientX - rect.left - size / 2) + "px";
    wave.style.top = (e.clientY - rect.top - size / 2) + "px";
    el.appendChild(wave);
    window.setTimeout(function () { wave.remove(); }, 720);
  });

  /* ---------------- Reveal ---------------- */
  var revealObserver = null;

  if (!reduceMotion && "IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  }

  function observeReveals(scope) {
    $$(".reveal", scope || document).forEach(function (el) {
      if (el.classList.contains("is-in")) return;
      if (!revealObserver) { el.classList.add("is-in"); return; }
      revealObserver.observe(el);
    });
  }

  /* ---------------- Toast ---------------- */
  var toastEl = null;
  var toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    toastEl.classList.add("is-show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toastEl.classList.remove("is-show"); }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy") ? resolve() : reject();
      } catch (e) {
        reject(e);
      } finally {
        area.remove();
      }
    });
  }

  /* ---------------- 首页 ---------------- */
  var grid = $("#post-list");

  if (grid) {
    var filtersEl = $("#filters");
    var searchEl = $("#search");
    var searchField = $("#search-field");
    var searchClear = $("#search-clear");
    var latestSection = $("#latest");
    var featuredEl = $("#featured");
    var featuredMeta = $("#featured-meta");
    var resultMeta = $("#result-meta");
    var statCount = $("#stat-count");
    var state = { tag: "全部", query: "" };

    var tags = ["全部"];
    POSTS.forEach(function (p) {
      (p.tags || []).forEach(function (t) {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    });

    function tagCount(tag) {
      if (tag === "全部") return POSTS.length;
      return POSTS.filter(function (p) { return (p.tags || []).indexOf(tag) > -1; }).length;
    }

    function renderFilters() {
      if (!filtersEl) return;
      filtersEl.innerHTML = tags.map(function (t) {
        return '<button class="chip ripple' + (t === state.tag ? " is-active" : "") + '" type="button" data-tag="' +
          esc(t) + '" aria-pressed="' + (t === state.tag) + '">' + ICON.check + '<span>' + esc(t) +
          '</span><span class="chip-count">' + tagCount(t) + "</span></button>";
      }).join("");
    }

    function featureCard(post) {
      var cover = post.cover
        ? '<img src="' + esc(post.cover) + '" alt="" loading="eager" decoding="async">'
        : "";
      return '<a class="feature-card paper reveal" href="post.html?slug=' + encodeURIComponent(post.slug) + '">' +
        '<div class="feature-media">' + cover + '<span class="feature-badge">最新一封</span></div>' +
        '<div class="feature-content">' +
        '<div class="paper-mark" aria-hidden="true">' +
        '<span class="paper-stamp">山</span>' +
        '<span class="paper-postmark"><b>' + yearOf(post.date) + '</b><span>' + seasonOf(post.date) +
        '</span><em>SHAN JIAN</em></span>' +
        "</div>" +
        '<span class="post-kicker">' + esc((post.tags || [])[0] || "随笔") + "</span>" +
        "<h2>" + esc(post.title) + "</h2>" +
        "<p>" + esc(post.excerpt) + "</p>" +
        '<div class="feature-foot"><span>' + fmtDate(post.date) + " · " + readingTime(post) + " 分钟</span>" +
        '<span class="feature-cta">阅读全文' + ICON.arrow + "</span></div>" +
        "</div></a>";
    }

    function postCard(post, i) {
      var cover = post.cover
        ? '<div class="post-cover"><img src="' + esc(post.cover) + '" alt="" loading="lazy" decoding="async">' +
          '<span class="card-stamp" aria-hidden="true">山</span>' +
          '<span class="cover-tag">' + esc((post.tags || [])[0] || "随笔") + "</span></div>"
        : '<div class="post-cover"></div>';
      var tagLine = (post.tags || []).slice(0, 2).map(function (t) {
        return "<span>#" + esc(t) + "</span>";
      }).join("");
      return '<a class="post-card paper reveal" style="--i:' + (i % 6) + '" href="post.html?slug=' +
        encodeURIComponent(post.slug) + '">' + cover +
        '<div class="post-card-body">' +
        '<div class="post-meta"><span>' + fmtDate(post.date) + '</span><span class="dot">·</span><span>' +
        readingTime(post) + " 分钟</span></div>" +
        "<h3>" + esc(post.title) + "</h3>" +
        "<p>" + esc(post.excerpt) + "</p>" +
        '<div class="card-foot"><div class="card-tags">' + tagLine + "</div>" +
        '<span class="read-more">阅读' + ICON.arrow + "</span></div>" +
        "</div></a>";
    }

    function match(post) {
      var byTag = state.tag === "全部" || (post.tags || []).indexOf(state.tag) > -1;
      if (!byTag) return false;
      if (!state.query) return true;
      var hay = (post.title + " " + post.excerpt + " " + (post.tags || []).join(" ") + " " +
        plainText(post.content)).toLowerCase();
      return hay.indexOf(state.query.toLowerCase()) > -1;
    }

    function updateResultMeta() {
      var filtering = state.tag !== "全部" || state.query !== "";
      if (!resultMeta) return;
      if (!filtering) {
        resultMeta.textContent = "共 " + POSTS.length + " 篇";
        return;
      }
      var bits = [];
      if (state.tag !== "全部") bits.push("标签「" + state.tag + "」");
      if (state.query) bits.push("关键词「" + state.query + "」");
      var count = POSTS.filter(match).length;
      resultMeta.textContent = bits.join(" · ") + " · " + count + " 篇";
    }

    function renderList() {
      var filtering = state.tag !== "全部" || state.query !== "";
      var list = POSTS.filter(match);

      if (!filtering) {
        if (latestSection && POSTS[0]) {
          latestSection.hidden = false;
          featuredEl.innerHTML = featureCard(POSTS[0]);
          if (featuredMeta) featuredMeta.textContent = "更新于 " + fmtDate(POSTS[0].date);
          observeReveals(featuredEl);
        }
        list = list.slice(1);
      } else if (latestSection) {
        latestSection.hidden = true;
      }

      updateResultMeta();

      if (!list.length) {
        grid.innerHTML = '<div class="empty glass"><span class="empty-glyph">空</span>' +
          "<b>没有找到相关的来信</b><p>换个词，或者看看全部来信。</p>" +
          '<button class="btn btn--tonal ripple" type="button" data-reset>查看全部来信</button></div>';
        return;
      }

      grid.innerHTML = list.map(postCard).join("");

      $$(".post-cover img", grid).forEach(function (img) {
        img.addEventListener("error", function () { img.style.display = "none"; });
      });

      observeReveals(grid);
    }

    if (filtersEl) {
      filtersEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".chip");
        if (!btn) return;
        state.tag = btn.dataset.tag;
        renderFilters();
        renderList();
      });
    }

    // 空结果里的一键重置
    grid.addEventListener("click", function (e) {
      if (!e.target.closest("[data-reset]")) return;
      state.tag = "全部";
      state.query = "";
      if (searchEl) searchEl.value = "";
      if (searchField) searchField.classList.remove("has-value");
      renderFilters();
      renderList();
    });

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        state.query = searchEl.value.trim();
        if (searchField) searchField.classList.toggle("has-value", searchEl.value.length > 0);
        renderList();
      });

      searchEl.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          searchEl.value = "";
          state.query = "";
          if (searchField) searchField.classList.remove("has-value");
          renderList();
          searchEl.blur();
        }
      });
    }

    if (searchClear) {
      searchClear.addEventListener("click", function () {
        if (!searchEl) return;
        searchEl.value = "";
        state.query = "";
        if (searchField) searchField.classList.remove("has-value");
        renderList();
        searchEl.focus();
      });
    }

    document.addEventListener("keydown", function (e) {
      var tag = (document.activeElement && document.activeElement.tagName) || "";
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        if (searchEl) searchEl.focus();
      }
    });

    if (statCount) statCount.textContent = POSTS.length;
    renderFilters();
    renderList();
    observeReveals(document);
  } else {
    observeReveals(document);
  }

  /* ---------------- 每日一文 / 今日诗句 ---------------- */
  function cstNow() { return new Date(Date.now() + 8 * 3600 * 1000); }

  function pad2(n) { return n < 10 ? "0" + n : String(n); }

  function dayKey() {
    var d = cstNow();
    return d.getUTCFullYear() + "-" + pad2(d.getUTCMonth() + 1) + "-" + pad2(d.getUTCDate());
  }

  function renderDaily() {
    var list = window.DAILY_TEXTS || [];
    var card = $("#daily-card");
    if (!list.length || !card) return;

    // 以北京时间计算天数；步长 5 与 12 互质，保证每天不同、12 天走完一轮
    var d = cstNow();
    var days = Math.floor(d.getTime() / 86400000);
    var idx = ((days * 5) % list.length + list.length) % list.length;
    var item = list[idx];

    $("#daily-date").textContent = d.getUTCFullYear() + "." + pad2(d.getUTCMonth() + 1) + "." +
      pad2(d.getUTCDate()) + " · 周" + "日一二三四五六".charAt(d.getUTCDay());
    $("#daily-era").textContent = item.era + " · 古文";
    $("#daily-title-text").textContent = item.title;
    $("#daily-author").textContent = item.author;
    $("#daily-body").innerHTML = item.content;
    $("#daily-source").textContent = "公有领域 · " + item.source;
    $("#daily-count").textContent = "第 " + (idx + 1) + " / " + list.length + " 篇";
  }

  /* ---------------- 每日一文 / 随机一文（qhsou 接口） ---------------- */
  var ONE_API = "https://api.qhsou.com/api/one.php";
  var oneItem = null;
  var oneExpanded = false;
  var oneRandom = false;

  function oneParagraphs(text) {
    return String(text || "").replace(/\r/g, "").split(/\n+/).map(function (s) {
      return s.replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
    }).filter(Boolean);
  }

  function oneCacheKey() { return "one:" + dayKey(); }

  function fetchOne() {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, 8000) : null;

    return fetch(ONE_API + "?t=" + Date.now(), ctrl
      ? { signal: ctrl.signal, cache: "no-store" }
      : { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("one " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.title || !data.content) throw new Error("one empty");
        return {
          title: String(data.title),
          author: String(data.author || "佚名"),
          content: String(data.content)
        };
      })
      .then(function (item) {
        if (timer) window.clearTimeout(timer);
        return item;
      }, function (err) {
        if (timer) window.clearTimeout(timer);
        throw err;
      });
  }

  function renderOne(item, opts) {
    opts = opts || {};
    oneItem = item;
    oneExpanded = !!opts.expanded;
    oneRandom = !!opts.random;

    var paras = oneParagraphs(item.content);
    var total = paras.join("").length;
    var shown = [];
    var sum = 0;

    // 首屏只放约 900 字，剩下的交给「展开全文」，避免长篇小说把首页撑得太长
    for (var i = 0; i < paras.length; i++) {
      shown.push(paras[i]);
      sum += paras[i].length;
      if (!oneExpanded && sum >= 880) break;
    }
    var truncated = shown.length < paras.length;

    $("#daily-era").textContent = oneRandom ? "随机一文 · 短篇" : "每日一文 · 选读";
    $("#daily-title-text").textContent = item.title;
    $("#daily-author").textContent = item.author;
    $("#daily-body").innerHTML = shown.map(function (p) {
      return "<p>" + esc(p) + "</p>";
    }).join("");
    $("#daily-source").textContent = "来源 · 每日一文 qhsou.com";
    $("#daily-count").textContent = "共约 " + Math.max(1, Math.round(total / 100)) * 100 + " 字";

    var btn = $("#daily-expand");
    if (btn) {
      btn.hidden = !truncated && !oneExpanded;
      btn.textContent = oneExpanded ? "收起" : "展开全文";
    }

    var dateEl = $("#daily-date");
    if (dateEl) {
      if (oneRandom) {
        dateEl.textContent = "随机抽读 · 再点一次换一篇";
      } else {
        var d = cstNow();
        dateEl.textContent = d.getUTCFullYear() + "." + pad2(d.getUTCMonth() + 1) + "." +
          pad2(d.getUTCDate()) + " · 周" + "日一二三四五六".charAt(d.getUTCDay());
      }
    }
  }

  function readOneCache() {
    try {
      var raw = localStorage.getItem(oneCacheKey());
      var data = raw ? JSON.parse(raw) : null;
      if (data && data.title && data.content) return data;
    } catch (e) {}
    return null;
  }

  function initOne() {
    var card = $("#daily-card");
    if (!card || !window.fetch) return;

    var cached = readOneCache();
    if (cached) { renderOne(cached, {}); return; }

    // 每天第一次打开时取一篇并缓存，今天之内保持同一篇
    fetchOne().then(function (item) {
      try { localStorage.setItem(oneCacheKey(), JSON.stringify(item)); } catch (e) {}
      renderOne(item, {});
    }).catch(function () {
      // 接口不可用时保留本地公版古文，页面不会空着
    });
  }

  function initDailyActions() {
    var card = $("#daily-card");
    if (!card) return;

    var shuffle = $("#daily-shuffle");
    if (shuffle) {
      shuffle.addEventListener("click", function () {
        if (shuffle.getAttribute("aria-busy") === "true") return;
        shuffle.setAttribute("aria-busy", "true");
        card.classList.add("is-switching");

        fetchOne().then(function (item) {
          renderOne(item, { random: true });
        }).catch(function () {
          toast("随机一文没取到，稍后再试");
        }).then(function () {
          card.classList.remove("is-switching");
          shuffle.removeAttribute("aria-busy");
        });
      });
    }

    var expand = $("#daily-expand");
    if (expand) {
      expand.addEventListener("click", function () {
        if (!oneItem) return;
        renderOne(oneItem, { random: oneRandom, expanded: !oneExpanded });
      });
    }
  }

  function initHeroQuote() {
    var el = $("#hero-quote");
    if (!el) return;

    var key = "hitokoto:" + dayKey();

    function apply(text, author) {
      el.textContent = "「" + text + "」";
      if (author) {
        var span = document.createElement("span");
        span.className = "quote-author";
        span.textContent = " · " + author;
        el.appendChild(span);
      }
    }

    function readCache() {
      try {
        var raw = localStorage.getItem(key);
        var data = raw ? JSON.parse(raw) : null;
        if (data && data.text) {
          apply(data.text, data.author);
          return true;
        }
      } catch (e) {}
      return false;
    }

    if (readCache() || !window.fetch) return;

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl ? window.setTimeout(function () { ctrl.abort(); }, 6000) : null;

    fetch("https://v1.hitokoto.cn/?c=i&encode=json&charset=utf-8", ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (res) {
        if (!res.ok) throw new Error("hitokoto " + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.hitokoto) return;
        var author = data.from_who || data.from || "";
        apply(data.hitokoto, author);
        try {
          localStorage.setItem(key, JSON.stringify({ text: data.hitokoto, author: author }));
        } catch (e) {}
      })
      .catch(function () {})
      .then(function () { if (timer) window.clearTimeout(timer); });
  }

  renderDaily();
  initOne();
  initDailyActions();
  initHeroQuote();

  /* ---------------- 文章页 ---------------- */
  var article = $("#post-content");

  if (article) {
    var slug = new URLSearchParams(window.location.search).get("slug");
    var post = POSTS.filter(function (p) { return p.slug === slug; })[0];
    var idx = POSTS.indexOf(post);

    if (!post) {
      document.title = "文章不存在 | 山间来信";
      var head = $(".post-head");
      if (head) {
        head.innerHTML = '<div class="post-kicker">404</div><h1>这篇文章不见了</h1>' +
          '<p style="color:var(--on-surface-variant);margin-top:18px">它可能被时间带走了。' +
          '<a href="index.html" style="color:var(--primary)">回到首页 →</a></p>';
      }
      article.innerHTML = "";
      var heroEl = $("#post-hero");
      if (heroEl) heroEl.hidden = true;
      var tocEl = $("#toc");
      var tocMobileEl = $("#toc-mobile");
      if (tocEl) tocEl.hidden = true;
      if (tocMobileEl) tocMobileEl.hidden = true;
      var endEl = $(".post-end");
      if (endEl) endEl.hidden = true;
      updateScrollUI();
    } else {
      document.title = post.title + " | 山间来信";
      var desc = $('meta[name="description"]');
      if (desc) desc.setAttribute("content", post.excerpt);

      // 文章页的分享信息与结构化数据在运行时补齐
      var pageUrl = SITE_BASE + "post.html?slug=" + encodeURIComponent(post.slug);
      var coverUrl = post.cover ? SITE_BASE + post.cover : SITE_BASE + "assets/img/letter.jpg";

      function setMeta(sel, value) {
        var el = $(sel);
        if (el) el.setAttribute("content", value);
      }

      var canonical = $("#canonical-link");
      if (canonical) canonical.setAttribute("href", pageUrl);
      setMeta("#og-title", post.title + " | " + SITE_NAME);
      setMeta("#og-description", post.excerpt);
      setMeta("#og-url", pageUrl);
      setMeta("#og-image", coverUrl);

      if (!document.getElementById("post-jsonld")) {
        var ld = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.date,
          author: { "@type": "Person", name: SITE_NAME },
          publisher: { "@type": "Person", name: SITE_NAME },
          mainEntityOfPage: pageUrl,
          url: pageUrl,
          image: coverUrl
        };
        var ldEl = document.createElement("script");
        ldEl.type = "application/ld+json";
        ldEl.id = "post-jsonld";
        ldEl.textContent = JSON.stringify(ld);
        document.head.appendChild(ldEl);
      }

      var kicker = $("#post-kicker");
      if (kicker) kicker.textContent = (post.tags || [])[0] || "随笔";

      var title = $("#post-title");
      if (title) title.textContent = post.title;

      var dateEl = $("#post-date");
      if (dateEl) dateEl.textContent = fmtDate(post.date);

      var readEl = $("#post-read");
      if (readEl) readEl.textContent = readingTime(post) + " 分钟阅读";

      var tagEl = $("#post-tag");
      if (tagEl) {
        tagEl.textContent = (post.tags || []).length
          ? (post.tags || []).map(function (t) { return "#" + t; }).join("  ")
          : "";
      }

      var coverEl = $("#post-hero");
      if (coverEl) {
        if (post.cover) {
          coverEl.innerHTML = '<img src="' + esc(post.cover) + '" alt="' + esc(post.title) + '" decoding="async">';
          var coverImg = coverEl.querySelector("img");
          if (coverImg) {
            coverImg.addEventListener("error", function () { coverEl.hidden = true; });
          }
        } else {
          coverEl.hidden = true;
        }
      }

      article.innerHTML = post.content || "";

      var tagsEl = $("#post-tags");
      if (tagsEl) {
        tagsEl.innerHTML = (post.tags || []).map(function (t) {
          return "<span>#" + esc(t) + "</span>";
        }).join("");
      }

      var navEl = $("#post-nav");
      if (navEl) {
        var newer = idx > 0 ? POSTS[idx - 1] : null;
        var older = idx < POSTS.length - 1 ? POSTS[idx + 1] : null;

        navEl.innerHTML =
          (newer
            ? '<a href="post.html?slug=' + encodeURIComponent(newer.slug) + '"><small>' + ICON.left + " 上一篇</small><span>" +
              esc(newer.title) + "</span></a>"
            : '<span class="nav-empty">这是最新的一封</span>') +
          (older
            ? '<a class="next" href="post.html?slug=' + encodeURIComponent(older.slug) + '"><small>下一篇 ' + ICON.arrow +
              "</small><span>" + esc(older.title) + "</span></a>"
            : '<span class="nav-empty">已经是最后一封了</span>');
      }

      // 相关文章：优先取共享标签的其他来信
      var relatedEl = $("#related");
      if (relatedEl) {
        var related = POSTS.filter(function (p) {
          if (p.slug === post.slug) return false;
          return (p.tags || []).some(function (t) {
            return (post.tags || []).indexOf(t) > -1;
          });
        }).slice(0, 2);

        if (!related.length) {
          relatedEl.hidden = true;
        } else {
          relatedEl.hidden = false;
          relatedEl.innerHTML = '<h2 class="related-title">也许你还想读<span>Related</span></h2>' +
            '<div class="related-grid">' + related.map(function (p) {
              return '<a class="related-card paper" href="post.html?slug=' + encodeURIComponent(p.slug) + '">' +
                "<small>" + fmtDate(p.date) + " · " + readingTime(p) + " 分钟</small>" +
                "<b>" + esc(p.title) + "</b><span>" + esc(p.excerpt) + "</span></a>";
            }).join("") + "</div>";
        }
      }

      // 目录
      var heads = $$("h2", article);
      var tocList = $("#toc-list");
      var tocMobile = $("#toc-mobile");
      var toc = $("#toc");

      if (!heads.length) {
        if (toc) toc.hidden = true;
        if (tocMobile) tocMobile.hidden = true;
      } else {
        heads.forEach(function (h, i) {
          if (!h.id) h.id = "section-" + (i + 1);
        });

        var tocHTML = heads.map(function (h) {
          var text = h.textContent.trim();
          return '<a href="#' + h.id + '">' + esc(text) + "</a>";
        }).join("");

        if (tocList) tocList.innerHTML = tocHTML;
        if (tocMobile) tocMobile.innerHTML = tocHTML;

        tocHeads = heads;
        tocLinks = $$('#toc-list a, #toc-mobile a');

        $$('#toc-list a, #toc-mobile a').forEach(function (a) {
          a.addEventListener("click", function () {
            var target = document.getElementById(a.getAttribute("href").slice(1));
            if (!target) return;
            // 先立即高亮，避免平滑滚动期间目录看起来“没反应”
            tocLinks.forEach(function (b) { b.classList.toggle("is-active", b === a); });
            tocLocked = true;
            window.clearTimeout(tocLockTimer);
            tocLockTimer = window.setTimeout(function () {
              tocLocked = false;
              updateScrollUI();
            }, 900);
          });
        });
      }

      // 分享 / 复制
      function shareOrCopy() {
        var url = window.location.href;
        if (navigator.share) {
          navigator.share({ title: post.title, text: post.excerpt, url: url }).catch(function () {});
          return;
        }
        copyText(url).then(function () { toast("链接已复制"); }, function () { toast("复制失败，请手动复制地址"); });
      }

      var copyBtn = $("#copy-link");
      if (copyBtn) {
        copyBtn.addEventListener("click", function () {
          copyText(window.location.href).then(function () { toast("链接已复制"); }, function () { toast("复制失败"); });
        });
      }

      if (copyFab) {
        copyFab.addEventListener("click", function () {
          copyText(window.location.href).then(function () { toast("链接已复制"); }, function () { toast("复制失败"); });
        });
      }

      var shareBtn = $("#share-post");
      if (shareBtn) shareBtn.addEventListener("click", shareOrCopy);

      updateScrollUI();

      if (window.location.hash) {
        var target = document.getElementById(window.location.hash.slice(1));
        if (target) window.setTimeout(function () { target.scrollIntoView(); }, 60);
      }
    }
  }

  /* ---------------- 其他 ---------------- */
  var yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  updateScrollUI();
  observeReveals(document);
})();
