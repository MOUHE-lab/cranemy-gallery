const state = {
  works: [],
  selectedWorkId: "",
  view: "gallery",
  sortBy: "featured",
  searchTerm: "",
  categoryFilter: "all",
  collectionFilter: "all",
  authMode: "login",
  currentUser: "",
  admin: false,
  adminUsers: [],
  comments: {},
  voteCounts: {},
  favoriteCounts: {},
  viewCounts: {},
  myVote: "",
  myFavorites: [],
  apiReady: false,
  viewedWorkIds: new Set(),
};

const showcaseState = {
  rotation: 0,
  tilt: -8,
  dragging: false,
  paused: false,
  moved: false,
  ignoreClick: false,
  pointerId: null,
  startX: 0,
  startY: 0,
  startRotation: 0,
  startTilt: -8,
  pendingWorkId: "",
  frame: 0,
  lastFrame: 0,
};

let uploadPreviewUrl = "";

const elements = {
  galleryPage: document.querySelector("#galleryPage"),
  accountPage: document.querySelector("#accountPage"),
  adminPage: document.querySelector("#adminPage"),
  profileStats: document.querySelector("#profileStats"),
  collectionTabs: document.querySelector("#collectionTabs"),
  categoryTabs: document.querySelector("#categoryTabs"),
  galleryGrid: document.querySelector("#galleryGrid"),
  showcaseStage: document.querySelector("#showcaseStage"),
  showcaseOrbit: document.querySelector("#showcaseOrbit"),
  workDetailDialog: document.querySelector("#workDetailDialog"),
  closeDetailBtn: document.querySelector("#closeDetailBtn"),
  detailPanel: document.querySelector("#detailPanel"),
  searchInput: document.querySelector("#searchInput"),
  sessionLabel: document.querySelector("#sessionLabel"),
  openAccountBtn: document.querySelector("#openAccountBtn"),
  closeAccountBtn: document.querySelector("#closeAccountBtn"),
  accountWorksPanel: document.querySelector("#accountWorksPanel"),
  accountWorksCount: document.querySelector("#accountWorksCount"),
  accountCommentsPanel: document.querySelector("#accountCommentsPanel"),
  accountCommentsCount: document.querySelector("#accountCommentsCount"),
  openAdminBtn: document.querySelector("#openAdminBtn"),
  openAuthBtn: document.querySelector("#openAuthBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  authDialog: document.querySelector("#authDialog"),
  closeAuthBtn: document.querySelector("#closeAuthBtn"),
  loginTab: document.querySelector("#loginTab"),
  registerTab: document.querySelector("#registerTab"),
  authTitle: document.querySelector("#authTitle"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  authMessage: document.querySelector("#authMessage"),
  submitAuthBtn: document.querySelector("#submitAuthBtn"),
  uploadDialog: document.querySelector("#uploadDialog"),
  openUploadBtn: document.querySelector("#openUploadBtn"),
  closeUploadBtn: document.querySelector("#closeUploadBtn"),
  uploadForm: document.querySelector("#uploadForm"),
  workMediaTypeInput: document.querySelector("#workMediaTypeInput"),
  workImageInput: document.querySelector("#workImageInput"),
  workImageLabel: document.querySelector("#workImageLabel"),
  uploadPreview: document.querySelector("#uploadPreview"),
  uploadMessage: document.querySelector("#uploadMessage"),
  uploadSubmitBtn: document.querySelector("#uploadSubmitBtn"),
  closeAdminBtn: document.querySelector("#closeAdminBtn"),
  adminDashboardPanel: document.querySelector("#adminDashboardPanel"),
  adminForm: document.querySelector("#adminForm"),
  adminWorkSelect: document.querySelector("#adminWorkSelect"),
  adminMediaTypeInput: document.querySelector("#adminMediaTypeInput"),
  adminPrivateInput: document.querySelector("#adminPrivateInput"),
  adminMessage: document.querySelector("#adminMessage"),
  adminDeleteBtn: document.querySelector("#adminDeleteBtn"),
  adminReviewsPanel: document.querySelector("#adminReviewsPanel"),
  adminReviewsCount: document.querySelector("#adminReviewsCount"),
  adminUsersPanel: document.querySelector("#adminUsersPanel"),
  adminUsersCount: document.querySelector("#adminUsersCount"),
  adminCommentsPanel: document.querySelector("#adminCommentsPanel"),
  adminCommentsCount: document.querySelector("#adminCommentsCount"),
  workCardTemplate: document.querySelector("#workCardTemplate"),
  sortButtons: document.querySelectorAll("[data-sort]"),
};

async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: isFormData
      ? { ...(options.headers || {}) }
      : {
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "请求失败");
  }

  return data;
}

async function loadServerState() {
  try {
    const data = await apiRequest("/api/state");
    applyServerState(data);
    state.apiReady = true;
  } catch {
    state.apiReady = false;
  }

  render();
}

function applyServerState(data) {
  state.works = data.works || [];
  state.currentUser = data.currentUser || "";
  state.admin = Boolean(data.admin);
  state.adminUsers = data.adminUsers || [];
  state.comments = data.comments || {};
  state.voteCounts = data.voteCounts || {};
  state.favoriteCounts = data.favoriteCounts || {};
  state.viewCounts = data.viewCounts || {};
  state.myVote = data.myVote || "";
  state.myFavorites = data.myFavorites || [];

  if (!state.works.some((work) => work.id === state.selectedWorkId)) {
    state.selectedWorkId = state.works[0]?.id || "";
  }
}

function getSelectedWork() {
  return state.works.find((work) => work.id === state.selectedWorkId) || getFilteredWorks()[0] || null;
}

function getVoteCount(workId) {
  return state.voteCounts[workId] || 0;
}

function getFavoriteCount(workId) {
  return state.favoriteCounts[workId] || 0;
}

function getViewCount(workId) {
  return state.viewCounts[workId] || 0;
}

function getCommentCount(workId) {
  return (state.comments[workId] || []).length;
}

function isFavorite(workId) {
  return state.myFavorites.includes(workId);
}

function getMediaType(work) {
  return work?.mediaType === "video" ? "video" : "image";
}

function getCommentStatusLabel(status) {
  return status === "pending" ? "待审核" : "已公开";
}

function getWorkStatusLabel(status) {
  return status === "pending" ? "待审核" : "已公开";
}

function getWorkStatusSuffix(work) {
  return work?.status === "pending" ? " · 待审核" : "";
}

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.ceil(bytes / 1024)} KB`;
}

function renderWorkVisibility(work) {
  const badges = [];
  if (work?.status === "pending") {
    badges.push(`<span class="status-badge pending">待审核</span>`);
  }
  if (work?.privateWork) {
    badges.push(`<span class="status-badge private">私密</span>`);
  }
  return badges.join(" ");
}

function getCollectionName(work) {
  return String(work?.collectionName || "").trim();
}

function getCollectionItems() {
  const collections = [...new Set(state.works.map(getCollectionName).filter(Boolean))];
  return [
    { id: "all", label: "全部合集" },
    ...collections.map((collection) => ({ id: `collection:${collection}`, label: collection })),
  ];
}

function matchesCollection(work) {
  if (state.collectionFilter === "all") {
    return true;
  }
  if (state.collectionFilter.startsWith("collection:")) {
    return getCollectionName(work) === state.collectionFilter.slice(11);
  }
  return true;
}

function getCategoryItems() {
  const kinds = [...new Set(state.works.map((work) => work.kind).filter(Boolean))];
  return [
    { id: "all", label: "全部" },
    { id: "image", label: "图片" },
    { id: "video", label: "视频" },
    ...kinds.map((kind) => ({ id: `kind:${kind}`, label: kind })),
  ];
}

function matchesCategory(work) {
  if (state.categoryFilter === "all") {
    return true;
  }
  if (state.categoryFilter === "image" || state.categoryFilter === "video") {
    return getMediaType(work) === state.categoryFilter;
  }
  if (state.categoryFilter.startsWith("kind:")) {
    return work.kind === state.categoryFilter.slice(5);
  }
  return true;
}

function getFilteredWorks() {
  const term = state.searchTerm.trim().toLowerCase();
  const filtered = state.works.filter((work) => {
    const haystack = `${work.title} ${work.kind} ${getCollectionName(work)} ${work.summary} ${work.body} ${(work.tags || []).join(" ")}`.toLowerCase();
    return matchesCollection(work) && matchesCategory(work) && haystack.includes(term);
  });

  return filtered.sort((a, b) => {
    if (state.sortBy === "votes") {
      return getVoteCount(b.id) - getVoteCount(a.id) || a.featured - b.featured;
    }

    if (state.sortBy === "favorites") {
      return getFavoriteCount(b.id) - getFavoriteCount(a.id) || a.featured - b.featured;
    }

    if (state.sortBy === "comments") {
      return getCommentCount(b.id) - getCommentCount(a.id) || a.featured - b.featured;
    }

    if (state.sortBy === "views") {
      return getViewCount(b.id) - getViewCount(a.id) || a.featured - b.featured;
    }

    return a.featured - b.featured;
  });
}

function render() {
  if (state.view === "admin" && !state.admin) {
    state.view = "gallery";
  }
  if (state.view === "account" && !state.currentUser) {
    state.view = "gallery";
  }

  renderSession();
  renderView();

  if (state.view === "account") {
    renderAccountPanels();
    return;
  }

  if (state.view === "admin") {
    renderAdminSelector();
    renderAdminPanels();
    return;
  }

  renderProfile();
  renderCollections();
  renderCategories();
  renderGallery();
  if (elements.workDetailDialog.open) {
    renderDetail();
  }
}

function renderView() {
  elements.galleryPage.classList.toggle("hidden", state.view !== "gallery");
  elements.accountPage.classList.toggle("hidden", state.view !== "account");
  elements.adminPage.classList.toggle("hidden", state.view !== "admin");
}

function renderSession() {
  const signedIn = Boolean(state.currentUser);
  elements.sessionLabel.textContent = signedIn ? `你好，${state.currentUser}${state.admin ? " · 管理员" : ""}` : "未登录";
  elements.openAuthBtn.classList.toggle("hidden", signedIn);
  elements.logoutBtn.classList.toggle("hidden", !signedIn);
  elements.openAccountBtn.classList.toggle("hidden", !signedIn);
  elements.openAccountBtn.classList.toggle("active", state.view === "account");
  elements.openAdminBtn.classList.toggle("hidden", !state.admin);
  elements.openAdminBtn.classList.toggle("active", state.view === "admin");
}

function renderProfile() {
  const totalWorks = state.works.length;
  const imageWorks = state.works.filter((work) => getMediaType(work) === "image").length;
  const videoWorks = state.works.filter((work) => getMediaType(work) === "video").length;
  const collectionCount = getCollectionItems().length - 1;
  const totalViews = state.works.reduce((sum, work) => sum + getViewCount(work.id), 0);

  elements.profileStats.innerHTML = [
    { label: "作品", value: totalWorks },
    { label: "图片", value: imageWorks },
    { label: "视频", value: videoWorks },
    { label: "合集", value: collectionCount },
    { label: "浏览", value: totalViews },
  ]
    .map(
      (item) => `
        <div class="profile-stat">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </div>
      `,
    )
    .join("");
}

function renderCollections() {
  const collections = getCollectionItems();
  if (!collections.some((item) => item.id === state.collectionFilter)) {
    state.collectionFilter = "all";
  }
  if (collections.length <= 1) {
    elements.collectionTabs.innerHTML = "";
    return;
  }

  elements.collectionTabs.innerHTML = collections
    .map(
      (item) => `
        <button class="collection-tab ${state.collectionFilter === item.id ? "active" : ""}" type="button" data-collection="${escapeHTML(item.id)}">
          ${escapeHTML(item.label)}
        </button>
      `,
    )
    .join("");
}

function renderCategories() {
  const categories = getCategoryItems();
  if (!categories.some((item) => item.id === state.categoryFilter)) {
    state.categoryFilter = "all";
  }

  elements.categoryTabs.innerHTML = categories
    .map(
      (item) => `
        <button class="category-tab ${state.categoryFilter === item.id ? "active" : ""}" type="button" data-category="${escapeHTML(item.id)}">
          ${escapeHTML(item.label)}
        </button>
      `,
    )
    .join("");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateShowcaseTransform() {
  const cards = [...elements.showcaseOrbit.querySelectorAll(".showcase-card")];
  const count = cards.length;
  if (!count) {
    return;
  }

  const compact = window.matchMedia("(max-width: 760px)").matches;
  const radiusX = compact ? 210 : 360;
  const radiusY = compact ? 58 : 90;
  const centerLift = compact ? 8 : 4;

  cards.forEach((card, index) => {
    const angle = ((index / count) * Math.PI * 2) + (showcaseState.rotation * Math.PI) / 180;
    const x = Math.cos(angle) * radiusX;
    const y = Math.sin(angle) * radiusY + centerLift;
    const depth = (Math.sin(angle) + 1) / 2;
    const hovered = card.matches(":hover, :focus-visible");
    const scale = 0.78 + depth * 0.24 + (hovered ? 0.08 : 0);
    const opacity = 0.66 + depth * 0.34;

    card.style.setProperty("--showcase-x", `${x}px`);
    card.style.setProperty("--showcase-y", `${y}px`);
    card.style.setProperty("--showcase-scale", scale.toFixed(3));
    card.style.setProperty("--showcase-opacity", opacity.toFixed(3));
    card.style.zIndex = String(Math.round(depth * 100));
  });
}

function renderShowcaseMedia(work) {
  const src = escapeHTML(work.image);
  const title = escapeHTML(work.title);
  if (getMediaType(work) === "video") {
    return `<video class="showcase-media" src="${src}" muted playsinline preload="metadata" aria-label="${title}"></video>`;
  }

  return `<img class="showcase-media" src="${src}" alt="${title}" loading="lazy" />`;
}

function getShowcaseWorks() {
  return [...getFilteredWorks()]
    .sort(
      (a, b) =>
        getVoteCount(b.id) - getVoteCount(a.id) ||
        getFavoriteCount(b.id) - getFavoriteCount(a.id) ||
        getViewCount(b.id) - getViewCount(a.id) ||
        getCommentCount(b.id) - getCommentCount(a.id) ||
        (a.featured || 0) - (b.featured || 0),
    )
    .slice(0, 10);
}

function renderShowcase() {
  const works = getShowcaseWorks();

  if (!state.apiReady) {
    elements.showcaseOrbit.innerHTML = `<div class="showcase-empty">服务启动后显示作品星图</div>`;
    updateShowcaseTransform();
    return;
  }

  if (!works.length) {
    elements.showcaseOrbit.innerHTML = `<div class="showcase-empty">暂无匹配作品</div>`;
    updateShowcaseTransform();
    return;
  }

  const step = 360 / works.length;

  elements.showcaseOrbit.innerHTML = works
    .map((work, index) => {
      const angle = Number((index * step).toFixed(3));
      const selected = work.id === state.selectedWorkId;
      return `
        <button
          class="showcase-card ${selected ? "selected" : ""}"
          style="--showcase-angle: ${angle}deg;"
          type="button"
          data-showcase-work="${escapeHTML(work.id)}"
          data-showcase-angle="${angle}"
          aria-label="打开作品 ${escapeHTML(work.title)}"
        >
          ${renderShowcaseMedia(work)}
          <span class="showcase-glow" aria-hidden="true"></span>
          <span class="showcase-card-copy">
            <strong>${escapeHTML(work.title)}</strong>
            <span>${getVoteCount(work.id)} 票 · ${getFavoriteCount(work.id)} 收藏</span>
          </span>
        </button>
      `;
    })
    .join("");

  updateShowcaseTransform();
}

function renderGallery() {
  renderShowcase();
  const fragment = document.createDocumentFragment();
  const filteredWorks = getFilteredWorks();

  elements.galleryGrid.innerHTML = "";

  if (!state.apiReady) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "请通过 Spring Boot 服务访问：mvn spring-boot:run";
    elements.galleryGrid.append(empty);
    return;
  }

  if (!filteredWorks.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "没有匹配的作品";
    elements.galleryGrid.append(empty);
    return;
  }

  if (!filteredWorks.some((work) => work.id === state.selectedWorkId) && !elements.workDetailDialog.open) {
    state.selectedWorkId = filteredWorks[0].id;
  }

  filteredWorks.forEach((work) => {
    const card = elements.workCardTemplate.content.firstElementChild.cloneNode(true);
    const button = card.querySelector(".work-hit-area");
    const image = card.querySelector(".work-image");
    const voteBadge = card.querySelector(".vote-badge");
    const kind = card.querySelector(".work-kind");
    const title = card.querySelector(".work-title");
    const summary = card.querySelector(".work-summary");
    const meta = card.querySelector(".work-meta");

    card.classList.toggle("selected", work.id === state.selectedWorkId);
    renderCardMedia(image, work);
    voteBadge.textContent = `${getVoteCount(work.id)} 票`;
    kind.textContent = `${getCollectionName(work) ? `${getCollectionName(work)} · ` : ""}${getMediaType(work) === "video" ? "视频 · " : ""}${work.kind} · ${work.year}${work.privateWork ? " · 私密" : ""}${getWorkStatusSuffix(work)}`;
    title.textContent = work.title;
    summary.textContent = work.summary;
    meta.innerHTML = `<span>${escapeHTML((work.tags || []).slice(0, 2).join(" / ") || work.ownerName || "作品")}</span><span>${getFavoriteCount(work.id)} 收藏 · ${getCommentCount(work.id)} 留言 · ${getViewCount(work.id)} 浏览</span>`;
    button.addEventListener("click", () => {
      openWorkDetail(work.id);
    });

    fragment.append(card);
  });

  elements.galleryGrid.append(fragment);
}

function renderCardMedia(imageElement, work) {
  if (getMediaType(work) !== "video") {
    imageElement.src = work.image;
    imageElement.alt = work.title;
    return;
  }

  const video = document.createElement("video");
  video.className = imageElement.className;
  video.classList.add("work-video");
  video.src = work.image;
  video.muted = true;
  video.playsInline = true;
  video.preload = "metadata";
  video.setAttribute("aria-label", work.title);
  imageElement.replaceWith(video);
}

function openWorkDetail(workId) {
  state.selectedWorkId = workId;
  renderGallery();
  renderDetail();
  if (!elements.workDetailDialog.open) {
    elements.workDetailDialog.showModal();
  }
}

function closeWorkDetail() {
  if (elements.workDetailDialog.open) {
    elements.workDetailDialog.close();
  }
  elements.detailPanel.innerHTML = "";
}

function renderDetailMeta(work) {
  const items = [
    ["类型", getMediaType(work) === "video" ? "视频" : "图片"],
    ["分类", work.kind || "未分类"],
    ["年份", work.year || "未填写"],
    ["合集", getCollectionName(work) || "未归入合集"],
  ];

  return items
    .map(
      ([label, value]) => `
        <div class="detail-meta-item">
          <span>${label}</span>
          <strong>${escapeHTML(value)}</strong>
        </div>
      `,
    )
    .join("");
}

function renderDetailMedia(work) {
  if (getMediaType(work) === "video") {
    return `
      <video class="detail-image detail-video" src="${escapeHTML(work.image)}" controls preload="metadata" playsinline>
        当前浏览器不支持视频播放。
      </video>
    `;
  }

  return `<img class="detail-image" src="${escapeHTML(work.image)}" alt="${escapeHTML(work.title)}" />`;
}

function renderDetail() {
  const work = getSelectedWork();

  if (!work) {
    elements.detailPanel.innerHTML = `<div class="empty-state">暂无作品</div>`;
    return;
  }

  const isVoted = state.myVote === work.id;
  const favored = isFavorite(work.id);
  const comments = state.comments[work.id] || [];
  const detailBody = work.body || work.summary || "这件作品还没有填写详细介绍。";
  const statusBadges = renderWorkVisibility(work);
  const deleteButton = work.canDelete
    ? `<button id="deleteWorkBtn" class="button button-danger" type="button">删除作品</button>`
    : "";
  const editButton = work.canEdit
    ? `<button id="editWorkBtn" class="button button-secondary" type="button">编辑作品</button>`
    : "";

  elements.detailPanel.innerHTML = `
    ${renderDetailMedia(work)}
    <div class="detail-body">
      <div class="detail-head">
        <div class="detail-text">
          <p class="eyebrow">${getCollectionName(work) ? `${escapeHTML(getCollectionName(work))} · ` : ""}${escapeHTML(work.kind)} · ${escapeHTML(work.year)}</p>
          <h2 id="panelTitle">${escapeHTML(work.title)}</h2>
          <p class="detail-summary">${escapeHTML(work.summary || detailBody)}</p>
          <p class="owner-line">上传者：${escapeHTML(work.ownerName || "站点")}</p>
        </div>
        ${statusBadges ? `<div class="detail-status">${statusBadges}</div>` : ""}
      </div>

      <div class="detail-meta-grid">${renderDetailMeta(work)}</div>

      <div class="stats-row" aria-label="作品数据">
        <div class="stat"><strong>${getVoteCount(work.id)}</strong><span>喜欢票</span></div>
        <div class="stat"><strong>${getFavoriteCount(work.id)}</strong><span>收藏</span></div>
        <div class="stat"><strong>${comments.length}</strong><span>留言</span></div>
        <div class="stat"><strong>${getViewCount(work.id)}</strong><span>浏览</span></div>
      </div>

      <div class="detail-actions">
        <button id="favoriteBtn" class="button button-secondary ${favored ? "active" : ""}" type="button">
          ${favored ? "已收藏" : "收藏作品"}
        </button>
        <button id="voteBtn" class="button button-secondary ${isVoted ? "active" : ""}" type="button">
          ${isVoted ? "已投给这件作品" : "投给这件作品"}
        </button>
        ${editButton}
        ${deleteButton}
      </div>

      <section class="detail-section" aria-labelledby="detailBodyTitle">
        <div class="section-title">
          <h3 id="detailBodyTitle">创作说明</h3>
        </div>
        <p>${escapeHTML(detailBody)}</p>
      </section>

      <section class="detail-section" aria-label="作品标签">
        <div class="tag-row">
          ${(work.tags || []).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("") || `<span class="tag">未添加标签</span>`}
        </div>
      </section>

      <section class="comment-section" aria-labelledby="commentsTitle">
        <div class="section-title">
          <h3 id="commentsTitle">留言</h3>
          <span>${comments.length}</span>
        </div>
        <div class="comment-list">
          ${renderComments(comments)}
        </div>
        <form id="commentForm" class="comment-form">
          <textarea id="commentText" maxlength="300" placeholder="${state.currentUser ? "写下你的留言" : "登录后可以留言"}" ${state.currentUser ? "" : "disabled"}></textarea>
          <button class="button button-primary" type="submit" ${state.currentUser ? "" : "disabled"}>发布留言</button>
        </form>
      </section>
    </div>
  `;

  elements.detailPanel.querySelector("#favoriteBtn").addEventListener("click", handleFavorite);
  elements.detailPanel.querySelector("#voteBtn").addEventListener("click", handleVote);
  elements.detailPanel.querySelector("#commentForm").addEventListener("submit", handleCommentSubmit);
  elements.detailPanel.querySelector(".comment-list").addEventListener("click", handleCommentListAction);
  elements.detailPanel.querySelector("#deleteWorkBtn")?.addEventListener("click", handleDeleteWork);
  elements.detailPanel.querySelector("#editWorkBtn")?.addEventListener("click", () => {
    closeWorkDetail();
    openAdmin(work.id);
  });
  recordWorkView(work.id);
}

function renderComments(comments) {
  if (!comments.length) {
    return `<div class="empty-state">还没有留言</div>`;
  }

  return comments
    .map(
      (comment) => `
        <div class="comment">
          <div class="comment-head">
            <strong>${escapeHTML(comment.user)}</strong>
            <span class="status-badge ${comment.status === "pending" ? "pending" : ""}">${getCommentStatusLabel(comment.status)}</span>
          </div>
          <p>${escapeHTML(comment.text)}</p>
          ${
            comment.canDelete
              ? `<button class="text-button" type="button" data-comment-delete="${escapeHTML(comment.id)}">删除留言</button>`
              : ""
          }
        </div>
      `,
    )
    .join("");
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

async function recordWorkView(workId) {
  if (!workId || state.viewedWorkIds.has(workId)) {
    return;
  }

  state.viewedWorkIds.add(workId);
  try {
    const data = await apiRequest(`/api/works/${encodeURIComponent(workId)}/views`, {
      method: "POST",
    });
    applyServerState(data);
    renderProfile();
    renderGallery();
    if (elements.workDetailDialog.open) {
      renderDetail();
    }
  } catch {
    state.viewedWorkIds.delete(workId);
  }
}

async function handleFavorite() {
  if (!state.currentUser) {
    closeWorkDetail();
    openAuth("login", "请先登录再收藏");
    return;
  }

  try {
    const data = await apiRequest("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ workId: getSelectedWork().id }),
    });
    applyServerState(data);
    render();
  } catch (error) {
    closeWorkDetail();
    openAuth("login", error.message);
  }
}

async function handleVote() {
  if (!state.currentUser) {
    closeWorkDetail();
    openAuth("login", "请先登录再投票");
    return;
  }

  try {
    const data = await apiRequest("/api/votes", {
      method: "POST",
      body: JSON.stringify({ workId: getSelectedWork().id }),
    });
    applyServerState(data);
    render();
  } catch (error) {
    closeWorkDetail();
    openAuth("login", error.message);
  }
}

async function handleDeleteWork() {
  const work = getSelectedWork();
  if (!work) {
    return;
  }

  try {
    const data = await deleteWorkById(work.id, work.title);
    if (data) {
      applyServerState(data);
      if (elements.workDetailDialog.open) {
        closeWorkDetail();
      }
      render();
    }
  } catch (error) {
    alert(error.message);
  }
}

async function deleteWorkById(workId, title) {
  if (!window.confirm(`确定删除《${title}》吗？`)) {
    return null;
  }
  return apiRequest(`/api/works/${encodeURIComponent(workId)}`, {
    method: "DELETE",
  });
}

async function handleCommentSubmit(event) {
  event.preventDefault();

  if (!state.currentUser) {
    closeWorkDetail();
    openAuth("login", "请先登录再留言");
    return;
  }

  const textarea = elements.detailPanel.querySelector("#commentText");
  const text = textarea.value.trim();

  if (!text) {
    textarea.focus();
    return;
  }

  try {
    const data = await apiRequest("/api/comments", {
      method: "POST",
      body: JSON.stringify({ workId: getSelectedWork().id, text }),
    });
    textarea.value = "";
    if (data) {
      applyServerState(data);
      render();
    }
  } catch (error) {
    closeWorkDetail();
    openAuth("login", error.message);
  }
}

async function handleCommentListAction(event) {
  const commentId = event.target.closest("[data-comment-delete]")?.dataset.commentDelete;
  if (!commentId) {
    return;
  }
  if (!window.confirm("确定删除这条留言吗？")) {
    return;
  }

  try {
    const data = await apiRequest(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
    applyServerState(data);
    render();
  } catch (error) {
    alert(error.message);
  }
}

function openAuth(mode = "login", message = "") {
  setAuthMode(mode);
  elements.authMessage.textContent = message;
  elements.usernameInput.value = "";
  elements.passwordInput.value = "";
  elements.authDialog.showModal();
  window.setTimeout(() => elements.usernameInput.focus(), 80);
}

function closeAuth() {
  elements.authDialog.close();
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isLogin = mode === "login";
  elements.authTitle.textContent = isLogin ? "登录账号" : "注册账号";
  elements.submitAuthBtn.textContent = isLogin ? "登录" : "注册";
  elements.loginTab.classList.toggle("active", isLogin);
  elements.registerTab.classList.toggle("active", !isLogin);
  elements.passwordInput.autocomplete = isLogin ? "current-password" : "new-password";
  elements.authMessage.textContent = "";
}

async function handleAuthSubmit() {
  const username = elements.usernameInput.value.trim();
  const password = elements.passwordInput.value;

  if (username.length < 3 || username.length > 24) {
    elements.authMessage.textContent = "账号长度需要在 3 到 24 个字符之间";
    return;
  }

  if (password.length < 6) {
    elements.authMessage.textContent = "密码至少需要 6 个字符";
    return;
  }

  try {
    const data = await apiRequest(state.authMode === "register" ? "/api/register" : "/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    applyServerState(data);
    state.apiReady = true;
    closeAuth();
    render();
  } catch (error) {
    elements.authMessage.textContent = error.message;
  }
}

async function logout() {
  try {
    const data = await apiRequest("/api/logout", { method: "POST", body: "{}" });
    applyServerState(data);
    state.view = "gallery";
    render();
  } catch {
    state.currentUser = "";
    state.admin = false;
    state.view = "gallery";
    render();
  }
}

function openUpload() {
  if (!state.currentUser) {
    openAuth("login", "请先登录再上传作品");
    return;
  }

  elements.uploadMessage.textContent = "";
  elements.uploadForm.reset();
  updateUploadMediaMode();
  clearUploadPreview();
  elements.uploadDialog.showModal();
  window.setTimeout(() => document.querySelector("#workTitleInput").focus(), 80);
}

function closeUpload() {
  clearUploadPreview();
  elements.uploadDialog.close();
}

function clearUploadPreview() {
  if (uploadPreviewUrl) {
    URL.revokeObjectURL(uploadPreviewUrl);
    uploadPreviewUrl = "";
  }
  elements.uploadPreview.classList.add("empty");
  elements.uploadPreview.innerHTML = `<span>选择文件后会在这里预览</span>`;
}

function renderUploadPreview() {
  const file = elements.workImageInput.files?.[0];
  clearUploadPreview();
  elements.uploadMessage.textContent = "";
  if (!file) {
    return;
  }

  const isVideo = elements.workMediaTypeInput.value === "video";
  const maxBytes = isVideo ? 209715200 : 8388608;
  const mediaLabel = isVideo ? "视频" : "图片";
  uploadPreviewUrl = URL.createObjectURL(file);
  elements.uploadPreview.classList.remove("empty");
  elements.uploadPreview.innerHTML = `
    <div class="upload-preview-media">
      ${
        isVideo
          ? `<video src="${uploadPreviewUrl}" muted controls preload="metadata" playsinline></video>`
          : `<img src="${uploadPreviewUrl}" alt="待上传作品预览" />`
      }
    </div>
    <div class="upload-preview-copy">
      <strong>${escapeHTML(file.name)}</strong>
      <p>${mediaLabel} · ${formatFileSize(file.size)} · 上限 ${formatFileSize(maxBytes)}</p>
    </div>
  `;

  if (file.size > maxBytes) {
    elements.uploadMessage.textContent = `${mediaLabel}文件过大，请选择 ${formatFileSize(maxBytes)} 以内的文件`;
  }
}

function openAccount() {
  if (!state.currentUser) {
    openAuth("login", "请先登录再进入个人后台");
    return;
  }

  state.view = "account";
  render();
  window.requestAnimationFrame(() => {
    elements.accountPage.scrollIntoView({ block: "start" });
  });
}

function closeAccount() {
  state.view = "gallery";
  render();
  window.requestAnimationFrame(() => elements.galleryPage.scrollIntoView({ block: "start" }));
}

function getMyWorks() {
  return state.works.filter((work) => work.ownedByMe);
}

function getMyComments() {
  const workById = new Map(state.works.map((work) => [work.id, work]));
  return Object.entries(state.comments)
    .flatMap(([workId, comments]) =>
      (comments || [])
        .filter((comment) => comment.canDelete)
        .map((comment) => ({
          ...comment,
          workId,
          workTitle: workById.get(workId)?.title || "未知作品",
        })),
    )
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function renderAccountPanels() {
  renderAccountWorks();
  renderAccountComments();
}

function renderAccountWorks() {
  const works = getMyWorks();
  elements.accountWorksCount.textContent = works.length;
  if (!works.length) {
    elements.accountWorksPanel.innerHTML = `<div class="empty-state">你还没有上传作品</div>`;
    return;
  }

  elements.accountWorksPanel.innerHTML = works
    .map(
      (work) => `
        <article class="admin-row">
          <div>
            <strong>${escapeHTML(work.title)} ${renderWorkVisibility(work)}</strong>
            <p>${getCollectionName(work) ? `${escapeHTML(getCollectionName(work))} · ` : ""}${escapeHTML(work.kind)} · ${escapeHTML(work.year)} · ${getMediaType(work) === "video" ? "视频" : "图片"} · ${getWorkStatusLabel(work.status)} · ${getViewCount(work.id)} 浏览</p>
          </div>
          <div class="row-actions">
            <button class="button button-secondary" type="button" data-work-privacy="${escapeHTML(work.id)}">
              ${work.privateWork ? "设为公开" : "设为私密"}
            </button>
            <button class="button button-danger" type="button" data-work-delete="${escapeHTML(work.id)}">删除作品</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderAccountComments() {
  const comments = getMyComments();
  elements.accountCommentsCount.textContent = comments.length;
  if (!comments.length) {
    elements.accountCommentsPanel.innerHTML = `<div class="empty-state">你还没有可管理的留言</div>`;
    return;
  }

  elements.accountCommentsPanel.innerHTML = comments
    .map(
      (comment) => `
        <article class="admin-row">
          <div>
            <strong>${escapeHTML(comment.workTitle)} <span class="status-badge ${comment.status === "pending" ? "pending" : ""}">${getCommentStatusLabel(comment.status)}</span></strong>
            <p>${escapeHTML(comment.text)}</p>
          </div>
          <div class="row-actions">
            <button class="button button-danger" type="button" data-account-comment-delete="${escapeHTML(comment.id)}">删除留言</button>
          </div>
        </article>
      `,
    )
    .join("");
}

async function handleAccountWorkAction(event) {
  const privacyWorkId = event.target.closest("[data-work-privacy]")?.dataset.workPrivacy;
  const deleteWorkId = event.target.closest("[data-work-delete]")?.dataset.workDelete;
  if (!privacyWorkId && !deleteWorkId) {
    return;
  }

  const workId = privacyWorkId || deleteWorkId;
  const work = state.works.find((item) => item.id === workId);
  if (!work) {
    return;
  }

  try {
    const data = privacyWorkId
      ? await apiRequest(`/api/me/works/${encodeURIComponent(workId)}/privacy`, {
          method: "PUT",
          body: JSON.stringify({ privateWork: !work.privateWork }),
        })
      : await deleteWorkById(workId, work.title);
    if (data) {
      applyServerState(data);
      render();
    }
  } catch (error) {
    alert(error.message);
  }
}

async function handleAccountCommentAction(event) {
  const commentId = event.target.closest("[data-account-comment-delete]")?.dataset.accountCommentDelete;
  if (!commentId) {
    return;
  }
  if (!window.confirm("确定删除这条留言吗？")) {
    return;
  }

  try {
    const data = await apiRequest(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE",
    });
    applyServerState(data);
    render();
  } catch (error) {
    alert(error.message);
  }
}

function updateUploadMediaMode() {
  const isVideo = elements.workMediaTypeInput.value === "video";
  elements.workImageLabel.textContent = isVideo ? "视频" : "图片";
  elements.workImageInput.accept = isVideo
    ? "video/mp4,video/webm,.mp4,.webm"
    : "image/jpeg,image/png,image/gif,image/webp";
  elements.workImageInput.value = "";
  clearUploadPreview();
}

async function handleUploadSubmit(event) {
  event.preventDefault();

  const formData = new FormData(elements.uploadForm);
  const uploadFile = formData.get("image");
  if (!String(formData.get("title") || "").trim()) {
    elements.uploadMessage.textContent = "请填写作品标题";
    return;
  }
  if (!String(formData.get("summary") || "").trim()) {
    elements.uploadMessage.textContent = "请填写作品简介";
    return;
  }
  if (!uploadFile?.size) {
    elements.uploadMessage.textContent = elements.workMediaTypeInput.value === "video" ? "请选择作品视频" : "请选择作品图片";
    return;
  }
  const isVideo = elements.workMediaTypeInput.value === "video";
  const maxBytes = isVideo ? 209715200 : 8388608;
  if (uploadFile.size > maxBytes) {
    elements.uploadMessage.textContent = `${isVideo ? "视频" : "图片"}文件过大，请选择 ${formatFileSize(maxBytes)} 以内的文件`;
    return;
  }

  try {
    elements.uploadSubmitBtn.disabled = true;
    elements.uploadSubmitBtn.textContent = "保存中...";
    elements.uploadMessage.textContent = "正在上传作品...";
    const data = await apiRequest("/api/works", {
      method: "POST",
      body: formData,
    });
    applyServerState(data);
    state.selectedWorkId = state.works[0]?.id || state.selectedWorkId;
    closeUpload();
    render();
  } catch (error) {
    elements.uploadMessage.textContent = error.message;
  } finally {
    elements.uploadSubmitBtn.disabled = false;
    elements.uploadSubmitBtn.textContent = "保存作品";
  }
}

function openAdmin(workId = state.selectedWorkId) {
  const selectedId = state.works.some((work) => work.id === workId) ? workId : "";
  window.location.href = selectedId ? `./admin.html?work=${encodeURIComponent(selectedId)}` : "./admin.html";
}

function closeAdmin() {
  state.view = "gallery";
  render();
  window.requestAnimationFrame(() => elements.galleryPage.scrollIntoView({ block: "start" }));
}

function getAdminWorkOptionLabel(work) {
  const flags = [
    work.status === "pending" ? "待审核" : "",
    work.privateWork ? "私密" : "",
  ].filter(Boolean);
  return `${work.title} · ${work.ownerName || "站点"}${flags.length ? ` · ${flags.join(" · ")}` : ""}`;
}

function renderAdminSelector() {
  const currentValue = elements.adminWorkSelect.value || state.selectedWorkId;
  elements.adminWorkSelect.innerHTML = state.works
    .map((work) => `<option value="${escapeHTML(work.id)}">${escapeHTML(getAdminWorkOptionLabel(work))}</option>`)
    .join("");
  if (state.works.some((work) => work.id === currentValue)) {
    elements.adminWorkSelect.value = currentValue;
  }
}

function fillAdminForm(workId) {
  const work = state.works.find((item) => item.id === workId);
  if (!work) {
    elements.adminForm.reset();
    return;
  }

  document.querySelector("#adminTitleInput").value = work.title || "";
  document.querySelector("#adminKindInput").value = work.kind || "";
  document.querySelector("#adminCollectionInput").value = getCollectionName(work);
  document.querySelector("#adminYearInput").value = work.year || "";
  elements.adminMediaTypeInput.value = getMediaType(work);
  document.querySelector("#adminImageInput").value = work.image || "";
  document.querySelector("#adminSummaryInput").value = work.summary || "";
  document.querySelector("#adminBodyInput").value = work.body || "";
  document.querySelector("#adminTagsInput").value = (work.tags || []).join(", ");
  document.querySelector("#adminOwnerInput").value = work.ownerName || "站点";
  document.querySelector("#adminFeaturedInput").value = work.featured || "";
  elements.adminPrivateInput.checked = Boolean(work.privateWork);
}

function getTotalViews() {
  return state.works.reduce((total, work) => total + getViewCount(work.id), 0);
}

function getTotalFavorites() {
  return state.works.reduce((total, work) => total + getFavoriteCount(work.id), 0);
}

function getTopPopularWork() {
  return [...state.works].sort(
    (a, b) =>
      getVoteCount(b.id) - getVoteCount(a.id) ||
      getViewCount(b.id) - getViewCount(a.id) ||
      getFavoriteCount(b.id) - getFavoriteCount(a.id) ||
      (a.featured || 0) - (b.featured || 0),
  )[0];
}

function getFavoriteRanking() {
  return [...state.works]
    .map((work) => ({
      work,
      count: getFavoriteCount(work.id),
    }))
    .filter((item) => item.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        getVoteCount(b.work.id) - getVoteCount(a.work.id) ||
        (a.work.featured || 0) - (b.work.featured || 0),
    )
    .slice(0, 5);
}

function renderDashboardComments(comments) {
  if (!comments.length) {
    return `<div class="dashboard-empty">暂无留言</div>`;
  }

  return comments
    .map(
      (comment) => `
        <article class="dashboard-item">
          <div>
            <strong>${escapeHTML(comment.user)} · ${escapeHTML(comment.workTitle)}</strong>
            <p>${escapeHTML(comment.text)}</p>
          </div>
          <span class="status-badge ${comment.status === "pending" ? "pending" : ""}">${getCommentStatusLabel(comment.status)}</span>
        </article>
      `,
    )
    .join("");
}

function renderFavoriteRanking(items) {
  if (!items.length) {
    return `<div class="dashboard-empty">暂无收藏数据</div>`;
  }

  return items
    .map(
      ({ work, count }, index) => `
        <article class="dashboard-item">
          <div>
            <strong>${index + 1}. ${escapeHTML(work.title)}</strong>
            <p>${escapeHTML(work.kind || "作品")} · ${getVoteCount(work.id)} 票 · ${getViewCount(work.id)} 浏览</p>
          </div>
          <span class="dashboard-rank-count">${count}</span>
        </article>
      `,
    )
    .join("");
}

function renderAdminDashboard() {
  const comments = getAdminComments();
  const pendingComments = comments.filter((comment) => comment.status === "pending");
  const pendingWorks = state.works.filter((work) => work.status === "pending");
  const pendingCount = pendingComments.length + pendingWorks.length;
  const topWork = getTopPopularWork();
  const favoriteRanking = getFavoriteRanking();
  const recentComments = comments.slice(0, 5);
  const topWorkTitle = topWork ? topWork.title : "暂无作品";
  const topWorkDetail = topWork
    ? `${getVoteCount(topWork.id)} 票 · ${getViewCount(topWork.id)} 浏览 · ${getFavoriteCount(topWork.id)} 收藏`
    : "上传作品后自动统计";

  elements.adminDashboardPanel.innerHTML = `
    <article class="dashboard-stat">
      <span>总浏览</span>
      <strong>${getTotalViews()}</strong>
      <p>全部作品累计访问</p>
    </article>
    <article class="dashboard-stat">
      <span>最受欢迎作品</span>
      <strong>${escapeHTML(topWorkTitle)}</strong>
      <p>${escapeHTML(topWorkDetail)}</p>
    </article>
    <article class="dashboard-stat">
      <span>待审核数量</span>
      <strong>${pendingCount}</strong>
      <p>${pendingWorks.length} 件作品 · ${pendingComments.length} 条留言</p>
    </article>
    <article class="dashboard-stat">
      <span>总收藏</span>
      <strong>${getTotalFavorites()}</strong>
      <p>用户收藏作品次数</p>
    </article>
    <section class="dashboard-card dashboard-wide" aria-label="最近留言">
      <div class="dashboard-card-head">
        <h3>最近留言</h3>
        <span>${comments.length}</span>
      </div>
      <div class="dashboard-list">${renderDashboardComments(recentComments)}</div>
    </section>
    <section class="dashboard-card dashboard-wide" aria-label="收藏排行">
      <div class="dashboard-card-head">
        <h3>收藏排行</h3>
        <span>Top 5</span>
      </div>
      <div class="dashboard-list">${renderFavoriteRanking(favoriteRanking)}</div>
    </section>
  `;
}

function renderAdminPanels() {
  renderAdminDashboard();
  renderAdminReviews();
  renderAdminUsers();
  renderAdminComments();
}

function getPendingWorks() {
  return state.works
    .filter((work) => work.canApprove)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function renderAdminReviews() {
  const works = getPendingWorks();
  elements.adminReviewsCount.textContent = works.length;
  if (!works.length) {
    elements.adminReviewsPanel.innerHTML = `<div class="empty-state">暂无待审核作品</div>`;
    return;
  }

  elements.adminReviewsPanel.innerHTML = works
    .map(
      (work) => `
        <article class="admin-row">
          <div>
            <strong>${escapeHTML(work.title)} ${renderWorkVisibility(work)}</strong>
            <p>${escapeHTML(work.ownerName || "站点")} · ${escapeHTML(work.kind || "作品")} · ${escapeHTML(work.year || "")} · ${getMediaType(work) === "video" ? "视频" : "图片"}</p>
            <p>${escapeHTML(work.summary || "")}</p>
          </div>
          <div class="row-actions">
            <button class="button button-secondary" type="button" data-review-view="${escapeHTML(work.id)}">查看</button>
            <button class="button button-secondary" type="button" data-review-edit="${escapeHTML(work.id)}">编辑</button>
            <button class="button button-primary" type="button" data-review-approve="${escapeHTML(work.id)}">通过</button>
            <button class="button button-danger" type="button" data-review-delete="${escapeHTML(work.id)}">删除</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderAdminUsers() {
  elements.adminUsersCount.textContent = state.adminUsers.length;
  if (!state.adminUsers.length) {
    elements.adminUsersPanel.innerHTML = `<div class="empty-state">暂无用户</div>`;
    return;
  }

  elements.adminUsersPanel.innerHTML = state.adminUsers
    .map(
      (user) => `
        <article class="admin-row">
          <div>
            <strong>${escapeHTML(user.username)}</strong>
            <p>${user.admin ? "管理员" : "普通用户"} · ${user.disabled ? "已禁用" : "正常"} · 作品 ${user.workCount} · 留言 ${user.commentCount} · 收藏 ${user.favoriteCount}</p>
          </div>
          <div class="row-actions">
            <button class="button button-secondary" type="button" data-user-admin="${escapeHTML(user.id)}">
              ${user.admin ? "取消管理员" : "设为管理员"}
            </button>
            <button class="button ${user.disabled ? "button-secondary" : "button-danger"}" type="button" data-user-disabled="${escapeHTML(user.id)}">
              ${user.disabled ? "启用账号" : "禁用账号"}
            </button>
          </div>
        </article>
      `,
    )
    .join("");
}

function getAdminComments() {
  const workById = new Map(state.works.map((work) => [work.id, work]));
  return Object.entries(state.comments)
    .flatMap(([workId, comments]) =>
      (comments || []).map((comment) => ({
        ...comment,
        workId,
        workTitle: workById.get(workId)?.title || "未知作品",
      })),
    )
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
}

function renderAdminComments() {
  const comments = getAdminComments();
  elements.adminCommentsCount.textContent = comments.length;
  if (!comments.length) {
    elements.adminCommentsPanel.innerHTML = `<div class="empty-state">暂无留言</div>`;
    return;
  }

  elements.adminCommentsPanel.innerHTML = comments
    .map(
      (comment) => `
        <article class="admin-row">
          <div>
            <strong>${escapeHTML(comment.user)} · ${escapeHTML(comment.workTitle)} <span class="status-badge ${comment.status === "pending" ? "pending" : ""}">${getCommentStatusLabel(comment.status)}</span></strong>
            <p>${escapeHTML(comment.text)}</p>
          </div>
          <div class="row-actions">
            ${
              comment.canApprove
                ? `<button class="button button-secondary" type="button" data-comment-approve="${escapeHTML(comment.id)}">通过</button>`
                : ""
            }
            <button class="button button-danger" type="button" data-comment-delete="${escapeHTML(comment.id)}">删除留言</button>
          </div>
        </article>
      `,
    )
    .join("");
}

async function handleAdminSubmit(event) {
  event.preventDefault();
  const workId = elements.adminWorkSelect.value;
  if (!workId) {
    elements.adminMessage.textContent = "请选择作品";
    return;
  }

  const body = {
    title: document.querySelector("#adminTitleInput").value.trim(),
    kind: document.querySelector("#adminKindInput").value.trim(),
    collectionName: document.querySelector("#adminCollectionInput").value.trim(),
    year: document.querySelector("#adminYearInput").value.trim(),
    image: document.querySelector("#adminImageInput").value.trim(),
    mediaType: elements.adminMediaTypeInput.value,
    summary: document.querySelector("#adminSummaryInput").value.trim(),
    body: document.querySelector("#adminBodyInput").value.trim(),
    tags: document.querySelector("#adminTagsInput").value.trim(),
    ownerName: document.querySelector("#adminOwnerInput").value.trim(),
    privateWork: elements.adminPrivateInput.checked,
    featured: Number(document.querySelector("#adminFeaturedInput").value) || null,
  };

  try {
    const data = await apiRequest(`/api/admin/works/${encodeURIComponent(workId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    applyServerState(data);
    state.selectedWorkId = workId;
    elements.adminMessage.textContent = "已保存";
    render();
    fillAdminForm(workId);
  } catch (error) {
    elements.adminMessage.textContent = error.message;
  }
}

async function handleAdminDelete() {
  const workId = elements.adminWorkSelect.value;
  const work = state.works.find((item) => item.id === workId);
  if (!work || !window.confirm(`确定删除《${work.title}》吗？`)) {
    return;
  }

  try {
    const data = await apiRequest(`/api/works/${encodeURIComponent(workId)}`, {
      method: "DELETE",
    });
    applyServerState(data);
    elements.adminMessage.textContent = "已删除";
    renderAdminSelector();
    fillAdminForm(elements.adminWorkSelect.value);
    render();
  } catch (error) {
    elements.adminMessage.textContent = error.message;
  }
}

async function approveAdminWork(workId) {
  if (!workId) {
    return;
  }

  const data = await apiRequest(`/api/admin/works/${encodeURIComponent(workId)}/approval`, {
    method: "PUT",
  });
  applyServerState(data);
  state.selectedWorkId = workId;
  elements.adminMessage.textContent = "作品已通过审核";
  render();
  renderAdminSelector();
  elements.adminWorkSelect.value = workId;
  fillAdminForm(workId);
}

async function deleteAdminWork(workId) {
  const data = await apiRequest(`/api/works/${encodeURIComponent(workId)}`, {
    method: "DELETE",
  });
  applyServerState(data);
  elements.adminMessage.textContent = "已删除";
  renderAdminSelector();
  fillAdminForm(elements.adminWorkSelect.value);
  render();
}

async function handleAdminReviewAction(event) {
  const approveId = event.target.closest("[data-review-approve]")?.dataset.reviewApprove;
  const deleteId = event.target.closest("[data-review-delete]")?.dataset.reviewDelete;
  const editId = event.target.closest("[data-review-edit]")?.dataset.reviewEdit;
  const viewId = event.target.closest("[data-review-view]")?.dataset.reviewView;
  const workId = approveId || deleteId || editId || viewId;
  if (!workId) {
    return;
  }

  if (viewId) {
    openWorkDetail(viewId);
    return;
  }

  if (editId) {
    elements.adminWorkSelect.value = editId;
    fillAdminForm(editId);
    elements.adminForm.scrollIntoView({ block: "start" });
    return;
  }

  if (deleteId) {
    const work = state.works.find((item) => item.id === deleteId);
    if (!work || !window.confirm(`确定删除《${work.title}》吗？`)) {
      return;
    }
  }

  try {
    if (approveId) {
      await approveAdminWork(approveId);
    } else {
      await deleteAdminWork(deleteId);
    }
  } catch (error) {
    elements.adminMessage.textContent = error.message;
  }
}

async function handleAdminUserAction(event) {
  const adminUserId = event.target.closest("[data-user-admin]")?.dataset.userAdmin;
  const disabledUserId = event.target.closest("[data-user-disabled]")?.dataset.userDisabled;
  if (!adminUserId && !disabledUserId) {
    return;
  }

  const userId = adminUserId || disabledUserId;
  const user = state.adminUsers.find((item) => item.id === userId);
  if (!user) {
    return;
  }

  const body = adminUserId
    ? { admin: !user.admin }
    : { disabled: !user.disabled };

  try {
    const data = await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    applyServerState(data);
    elements.adminMessage.textContent = "用户已更新";
    render();
  } catch (error) {
    elements.adminMessage.textContent = error.message;
  }
}

async function handleAdminCommentAction(event) {
  const approveId = event.target.closest("[data-comment-approve]")?.dataset.commentApprove;
  const commentId = event.target.closest("[data-comment-delete]")?.dataset.commentDelete;
  if (!approveId && !commentId) {
    return;
  }
  if (commentId && !window.confirm("确定删除这条留言吗？")) {
    return;
  }

  try {
    const data = approveId
      ? await apiRequest(`/api/admin/comments/${encodeURIComponent(approveId)}`, {
          method: "PUT",
          body: JSON.stringify({ approved: true }),
        })
      : await apiRequest(`/api/admin/comments/${encodeURIComponent(commentId)}`, {
          method: "DELETE",
        });
    applyServerState(data);
    elements.adminMessage.textContent = approveId ? "留言已通过" : "留言已删除";
    render();
  } catch (error) {
    elements.adminMessage.textContent = error.message;
  }
}

function handleShowcaseClick(event) {
  const button = event.target.closest("[data-showcase-work]");
  if (!button) {
    return;
  }

  if (showcaseState.ignoreClick) {
    showcaseState.ignoreClick = false;
    return;
  }

  openWorkDetail(button.dataset.showcaseWork);
}

function startShowcaseDrag(event) {
  const card = event.target.closest("[data-showcase-work]");
  if (card) {
    showcaseState.pendingWorkId = card.dataset.showcaseWork;
    showcaseState.moved = false;
    showcaseState.startX = event.clientX;
    showcaseState.startY = event.clientY;
    return;
  }

  showcaseState.dragging = true;
  showcaseState.moved = false;
  showcaseState.pointerId = event.pointerId;
  showcaseState.startX = event.clientX;
  showcaseState.startY = event.clientY;
  showcaseState.startRotation = showcaseState.rotation;
  showcaseState.startTilt = showcaseState.tilt;
  elements.showcaseStage.classList.add("dragging");
  elements.showcaseStage.setPointerCapture(event.pointerId);
}

function moveShowcaseDrag(event) {
  if (!showcaseState.dragging || event.pointerId !== showcaseState.pointerId) {
    return;
  }

  const deltaX = event.clientX - showcaseState.startX;
  const deltaY = event.clientY - showcaseState.startY;
  showcaseState.moved = showcaseState.moved || Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5;
  showcaseState.rotation = showcaseState.startRotation + deltaX * 0.28;
  showcaseState.tilt = clamp(showcaseState.startTilt - deltaY * 0.08, -22, 14);
  updateShowcaseTransform();
}

function endShowcaseDrag(event) {
  if (showcaseState.pendingWorkId) {
    const deltaX = event.clientX - showcaseState.startX;
    const deltaY = event.clientY - showcaseState.startY;
    const workId = showcaseState.pendingWorkId;
    showcaseState.pendingWorkId = "";
    showcaseState.moved = Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6;
    if (!showcaseState.moved) {
      showcaseState.ignoreClick = true;
      openWorkDetail(workId);
    }
    return;
  }

  if (!showcaseState.dragging || event.pointerId !== showcaseState.pointerId) {
    return;
  }

  showcaseState.ignoreClick = showcaseState.moved;
  showcaseState.dragging = false;
  showcaseState.pointerId = null;
  elements.showcaseStage.classList.remove("dragging");
  if (elements.showcaseStage.hasPointerCapture(event.pointerId)) {
    elements.showcaseStage.releasePointerCapture(event.pointerId);
  }
}

function cancelShowcaseDrag(event) {
  showcaseState.pendingWorkId = "";
  endShowcaseDrag(event);
}

function handleShowcaseWheel(event) {
  event.preventDefault();
  showcaseState.rotation -= event.deltaY * 0.08;
  updateShowcaseTransform();
}

function nudgeShowcase(event) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
    return;
  }

  event.preventDefault();
  showcaseState.rotation += event.key === "ArrowLeft" ? -24 : 24;
  updateShowcaseTransform();
}

function startShowcaseAnimation() {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || showcaseState.frame) {
    return;
  }

  const tick = (time) => {
    const elapsed = Math.min(32, time - (showcaseState.lastFrame || time));
    showcaseState.lastFrame = time;
    if (!showcaseState.dragging && !showcaseState.paused && state.view === "gallery" && !elements.workDetailDialog.open) {
      showcaseState.rotation += elapsed * 0.006;
      updateShowcaseTransform();
    }
    showcaseState.frame = window.requestAnimationFrame(tick);
  };

  showcaseState.frame = window.requestAnimationFrame(tick);
}

function bindEvents() {
  elements.searchInput.addEventListener("input", (event) => {
    state.searchTerm = event.target.value;
    renderGallery();
  });

  elements.sortButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.sortBy = button.dataset.sort;
      elements.sortButtons.forEach((item) => item.classList.toggle("active", item === button));
      renderGallery();
    });
  });

  elements.collectionTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collection]");
    if (!button) {
      return;
    }
    state.collectionFilter = button.dataset.collection;
    renderCollections();
    renderGallery();
  });

  elements.categoryTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) {
      return;
    }
    state.categoryFilter = button.dataset.category;
    renderCategories();
    renderGallery();
  });

  elements.showcaseOrbit.addEventListener("click", handleShowcaseClick);
  elements.showcaseStage.addEventListener("pointerdown", startShowcaseDrag);
  elements.showcaseStage.addEventListener("pointermove", moveShowcaseDrag);
  elements.showcaseStage.addEventListener("pointerup", endShowcaseDrag);
  elements.showcaseStage.addEventListener("pointercancel", cancelShowcaseDrag);
  elements.showcaseStage.addEventListener("wheel", handleShowcaseWheel, { passive: false });
  elements.showcaseStage.addEventListener("keydown", nudgeShowcase);

  elements.openAuthBtn.addEventListener("click", () => openAuth("login"));
  elements.logoutBtn.addEventListener("click", logout);
  elements.closeDetailBtn.addEventListener("click", closeWorkDetail);
  elements.openAccountBtn.addEventListener("click", openAccount);
  elements.closeAccountBtn.addEventListener("click", closeAccount);
  elements.accountWorksPanel.addEventListener("click", handleAccountWorkAction);
  elements.accountCommentsPanel.addEventListener("click", handleAccountCommentAction);
  elements.closeAuthBtn.addEventListener("click", closeAuth);
  elements.loginTab.addEventListener("click", () => setAuthMode("login"));
  elements.registerTab.addEventListener("click", () => setAuthMode("register"));
  elements.submitAuthBtn.addEventListener("click", handleAuthSubmit);
  elements.openUploadBtn.addEventListener("click", openUpload);
  elements.closeUploadBtn.addEventListener("click", closeUpload);
  elements.workMediaTypeInput.addEventListener("change", updateUploadMediaMode);
  elements.workImageInput.addEventListener("change", renderUploadPreview);
  elements.uploadForm.addEventListener("submit", handleUploadSubmit);
  elements.openAdminBtn.addEventListener("click", () => openAdmin());
  elements.closeAdminBtn.addEventListener("click", closeAdmin);
  elements.adminWorkSelect.addEventListener("change", () => fillAdminForm(elements.adminWorkSelect.value));
  elements.adminForm.addEventListener("submit", handleAdminSubmit);
  elements.adminDeleteBtn.addEventListener("click", handleAdminDelete);
  elements.adminReviewsPanel.addEventListener("click", handleAdminReviewAction);
  elements.adminUsersPanel.addEventListener("click", handleAdminUserAction);
  elements.adminCommentsPanel.addEventListener("click", handleAdminCommentAction);

  elements.authDialog.addEventListener("click", (event) => {
    if (event.target === elements.authDialog) {
      closeAuth();
    }
  });

  elements.uploadDialog.addEventListener("click", (event) => {
    if (event.target === elements.uploadDialog) {
      closeUpload();
    }
  });

  elements.workDetailDialog.addEventListener("click", (event) => {
    if (event.target === elements.workDetailDialog) {
      closeWorkDetail();
    }
  });

  elements.workDetailDialog.addEventListener("close", () => {
    elements.detailPanel.querySelectorAll("video").forEach((video) => video.pause());
    elements.detailPanel.innerHTML = "";
  });

  elements.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleAuthSubmit();
    }
  });

}

bindEvents();
render();
startShowcaseAnimation();
loadServerState();
