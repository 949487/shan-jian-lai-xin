(function () {
  "use strict";

  var POSTS = (window.POSTS || []).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
  });

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(d) {
    return String(d).replace(/-/g, ".");
  }

  function plainText(html) {
    return String(html || "").replace(/<[^>]*>/g, "");
  }

  function readingTime(post) {
    var text = plainText(post.content || "");
    var cjk = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var words = text.replace(/[\u4e00-\u9fa5]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round((cjk + words * 1.6) / 340));
  }

  /* ---------- 主题切换 ---------- */
  var root = document.documentElement;
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  });

  /* ---------- 回到顶部 ---------- */
  var toTop = document.querySelector(".to-top");
  if (toTop) {
    window.addEventListener("scroll", function () {
      toTop.classList.toggle("show", window.scrollY > 420);
    }, { passive: true });
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- 首页：列表 ---------- */
  var grid = document.getElementById("post-list");
  if (grid) {
    var filtersEl = document.getElementById("filters");
    var searchEl = document.getElementById("search");
    var state = { tag: "全部", query: "" };

    var tags = ["全部"];
    POSTS.forEach(function (p) {
      (p.tags || []).forEach(function (t) {
        if (tags.indexOf(t) === -1) tags.push(t);
      });
    });

    function renderFilters() {
      if (!filtersEl) return;
      filtersEl.innerHTML = tags.map(function (t) {
        return '<button class="filter' + (t === state.tag ? " is-active" : "") +
          '" data-tag="' + esc(t) + '">' + esc(t) + "</button>";
      }).join("");
    }

    function card(post, i) {
      var cover = post.cover
        ? '<div class="post-cover"><img src="' + esc(post.cover) + '" alt="" loading="lazy"></div>'
        : '<div class="post-cover"></div>';
      var tagLine = (post.tags || []).map(function (t) { return "#" + esc(t); }).join("&nbsp;&nbsp;");
      return '<a class="post-card" style="--i:' + i + '" href="post.html?slug=' + encodeURIComponent(post.slug) + '">' +
        cover +
        '<div class="post-meta"><span>' + fmtDate(post.date) + '</span><span class="dot">·</span><span>' +
        readingTime(post) + " 分钟</span></div>" +
        "<h2>" + esc(post.title) + "</h2>" +
        "<p>" + esc(post.excerpt) + "</p>" +
        '<div class="card-tags">' + tagLine + "</div>" +
        "</a>";
    }

    function render() {
      var list = POSTS.filter(function (p) {
        var byTag = state.tag === "全部" || (p.tags || []).indexOf(state.tag) > -1;
        if (!byTag) return false;
        if (!state.query) return true;
        var hay = (p.title + " " + p.excerpt + " " + (p.tags || []).join(" ")).toLowerCase();
        return hay.indexOf(state.query.toLowerCase()) > -1;
      });

      grid.innerHTML = list.length
        ? list.map(card).join("")
        : '<div class="empty">没有找到相关的文章，换个词试试。</div>';

      grid.querySelectorAll(".post-cover img").forEach(function (img) {
        img.addEventListener("error", function () { img.style.display = "none"; });
      });
    }

    if (filtersEl) {
      filtersEl.addEventListener("click", function (e) {
        var btn = e.target.closest(".filter");
        if (!btn) return;
        state.tag = btn.dataset.tag;
        renderFilters();
        render();
      });
    }

    if (searchEl) {
      searchEl.addEventListener("input", function () {
        state.query = searchEl.value.trim();
        render();
      });
    }

    renderFilters();
    render();
  }

  /* ---------- 文章页 ---------- */
  var article = document.getElementById("article");
  if (article) {
    var slug = new URLSearchParams(location.search).get("slug");
    var post = POSTS.filter(function (p) { return p.slug === slug; })[0];
    var idx = POSTS.indexOf(post);

    if (!post) {
      document.title = "文章不存在";
      article.innerHTML = '<div class="post-header"><div class="post-kicker">404</div>' +
        "<h1>这篇文章不见了</h1>" +
        '<p style="color:var(--muted);margin-top:20px"><a href="index.html" style="color:var(--accent)">← 回到首页</a></p></div>';
      document.getElementById("post-footer").style.display = "none";
    } else {
      document.title = post.title + " | 山间来信";
      var coverEl = document.getElementById("post-hero");
      if (post.cover) {
        coverEl.innerHTML = '<img src="' + esc(post.cover) + '" alt="">';
        coverEl.querySelector("img").addEventListener("error", function () {
          coverEl.style.display = "none";
        });
      } else {
        coverEl.style.display = "none";
      }

      document.getElementById("post-title").textContent = post.title;
      document.getElementById("post-date").textContent = fmtDate(post.date);
      document.getElementById("post-read").textContent = readingTime(post) + " 分钟阅读";
      document.getElementById("post-kicker").textContent = (post.tags || [])[0] || "随笔";
      document.getElementById("post-content").innerHTML = post.content || "";
      document.getElementById("post-tags").innerHTML = (post.tags || []).map(function (t) {
        return "<span>#" + esc(t) + "</span>";
      }).join("");

      var navEl = document.getElementById("post-nav");
      var newer = idx > 0 ? POSTS[idx - 1] : null;
      var older = idx < POSTS.length - 1 ? POSTS[idx + 1] : null;
      navEl.innerHTML =
        (newer ? '<a href="post.html?slug=' + encodeURIComponent(newer.slug) + '">上一篇<span>' + esc(newer.title) + "</span></a>" : "<span></span>") +
        (older ? '<a class="next" href="post.html?slug=' + encodeURIComponent(older.slug) + '">下一篇<span>' + esc(older.title) + "</span></a>" : "<span></span>");
    }
  }
})();
