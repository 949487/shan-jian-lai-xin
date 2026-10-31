# 山间来信

一个记录日常、城市、记忆与植物的生活随笔博客。纯静态 HTML/CSS/JS，零构建、零外部依赖，直接由 GitHub Pages 托管。

**在线访问**：<https://949487.github.io/shan-jian-lai-xin/>

## 特点

- Material Design 3 + 液态玻璃质感：多层渐变玻璃、双侧内高光、暗色下边框、表面扫光，参考 [luci-theme-liquid](https://github.com/zzsj0928/luci-theme-liquid)
- 流动彩色色斑背景 + 纸纹颗粒；深色模式单独提亮玻璃，避免变成灰块
- 浅色 / 深色主题切换，带圆形扩散过渡动画（记忆用户选择）
- 顶部胶囊导航随滚动收缩，浮动按钮按滚动方向自动收放
- 首页两列文章卡片，支持标签筛选（带计数）与关键词搜索（`/` 快捷聚焦、`Esc` 清空）
- 「今日一文」每天零点自动轮换一篇公有领域古文，按北京时间计算，无需构建或后端
- 顶部诗句取自 [Hitokoto](https://hitokoto.cn/) 诗词分类，按日缓存，失败时回退静态诗句
- 文章页：滚动进度条、桌面侧边目录 / 移动端横向目录、滚动高亮、首字下沉、玻璃引用块、上一篇 / 下一篇、复制链接与分享
- 滚动揭示动画、涟漪反馈、Toast 提示，并支持 `prefers-reduced-motion`
- 移动端适配，封面图与图标本地存储
- 不依赖任何框架或第三方 CDN

## 目录结构

```text
index.html          首页
post.html           文章页（通过 ?slug= 读取）
about.html          关于页
404.html            404 页
data/posts.js       全部文章数据（标题、日期、标签、封面、正文）
data/daily.js       「今日一文」公有领域文本库（按日期轮换）
assets/css/style.css  样式（MD3 设计令牌 + 玻璃组件）
assets/js/main.js     列表渲染、筛选、搜索、主题、文章渲染与目录
assets/img/          文章封面与 favicon.svg
```

## 新增文章

1. 在 `data/posts.js` 顶部的数组里新增一个对象：

```js
{
  slug: "my-post",              // URL 标识，唯一
  title: "文章标题",
  date: "2026-10-23",
  tags: ["生活"],
  excerpt: "首页摘要",
  cover: "assets/img/my-post.jpg",
  content: `<p>正文 HTML</p>`
}
```

2. 把封面图放进 `assets/img/`
3. 提交并推送，Pages 会自动重新构建

## 本地预览

```bash
python3 -m http.server 8080
# 打开 http://localhost:8080
```

## 部署

仓库 Settings → Pages 已配置为 `main` 分支根目录，推送后约 1 分钟生效。

## 液态玻璃模板

通用玻璃 token、组件配方与踩坑记录已整理为 `liquid-glass` 技能：

```text
.trae/skills/liquid-glass/
├── SKILL.md                     何时使用、设计原则、组件配方、验收清单
├── assets/liquid-glass.css      可直接复制的 token + .liquid-glass 组件
└── references/luci-theme-liquid.md  参考主题取值与实现要点
```

本站的具体实现见 `assets/css/style.css` 顶部的 `--glass-*` / `--paper-*` 令牌。
