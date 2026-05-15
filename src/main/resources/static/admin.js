const state = {
  works: [],
  currentUser: "",
  admin: false,
  adminUsers: [],
  comments: {},
  voteCounts: {},
  favoriteCounts: {},
  viewCounts: {},
};

const elements = {
  sessionLabel: document.querySelector("#sessionLabel"),
  openAuthBtn: document.querySelector("#openAuthBtn"),
  logoutBtn: document.querySelector("#logoutBtn"),
  lockedLoginBtn: document.querySelector("#lockedLoginBtn"),
  adminLocked: document.querySelector("#adminLocked"),
  adminLockedMessage: document.querySelector("#adminLockedMessage"),
  adminShell: document.querySelector("#adminShell"),
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
  authDialog: document.querySelector("#authDialog"),
  closeAuthBtn: document.querySelector("#closeAuthBtn"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  authMessage: document.querySelector("#authMessage"),
  submitAuthBtn: document.querySelector("#submitAuthBtn"),
  workDetailDialog: document.querySelector("#workDetailDialog"),
  closeDetailBtn: document.querySelector("#closeDetailBtn"),
  detailPanel: document.querySelector("#detailPanel"),
};

async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "same-origin",
    ...options,
    headers: {
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

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
}

async function loadServerState() {
  try {
    applyServerState(await apiRequest("/api/state"));
  } catch (error) {
    elements.adminLockedMessage.textContent = error.message;
  }
  render();
}

function render() {
  renderSession();
  elements.adminLocked.classList.toggle("hidden", state.admin);
  elements.adminShell.classList.toggle("hidden", !state.admin);

  if (!state.currentUser) {
    elements.adminLockedMessage.textContent = "请先使用管理员账号登录。";
    return;
  }
  if (!state.admin) {
    elements.adminLockedMessage.textContent = "当前账号不是管理员，无法进入后台。";
    return;
  }

  renderAdminSelector();
  renderAdminDashboard();
  renderAdminReviews();
  renderAdminUsers();
  renderAdminComments();
}

function renderSession() {
  const signedIn = Boolean(state.currentUser);
  elements.sessionLabel.textContent = signedIn
    ? `你好，${state.currentUser}${state.admin ? " · 管理员" : ""}`
    : "未登录";
  elements.openAuthBtn.classList.toggle("hidden", signedIn);
  elements.logoutBtn.classList.toggle("hidden", !signedIn);
}

function getQueryWorkId() {
  return new URLSearchParams(window.location.search).get("work") || "";
}

function getMediaType(work) {
  return work?.mediaType === "video" ? "video" : "image";
}

function getCollectionName(work) {
  return String(work?.collectionName || "").trim();
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

function getCommentStatusLabel(status) {
  return status === "pending" ? "待审核" : "已公开";
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

function getAdminWorkOptionLabel(work) {
  const flags = [
    work.status === "pending" ? "待审核" : "",
    work.privateWork ? "私密" : "",
  ].filter(Boolean);
  return `${work.title} · ${work.ownerName || "站点"}${flags.length ? ` · ${flags.join(" · ")}` : ""}`;
}

function renderAdminSelector() {
  const queryWorkId = getQueryWorkId();
  const currentValue = elements.adminWorkSelect.value || queryWorkId || state.works[0]?.id || "";
  elements.adminWorkSelect.innerHTML = state.works
    .map((work) => `<option value="${escapeHTML(work.id)}">${escapeHTML(getAdminWorkOptionLabel(work))}</option>`)
    .join("");

  const selectedId = state.works.some((work) => work.id === currentValue) ? currentValue : state.works[0]?.id || "";
  elements.adminWorkSelect.value = selectedId;
  fillAdminForm(selectedId);
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
    .map((work) => ({ work, count: getFavoriteCount(work.id) }))
    .filter((item) => item.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        getVoteCount(b.work.id) - getVoteCount(a.work.id) ||
        (a.work.featured || 0) - (b.work.featured || 0),
    )
    .slice(0, 5);
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
  const topWork = getTopPopularWork();
  const favoriteRanking = getFavoriteRanking();
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
      <strong>${pendingWorks.length + pendingComments.length}</strong>
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
      <div class="dashboard-list">${renderDashboardComments(comments.slice(0, 5))}</div>
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
    applyServerState(await apiRequest(`/api/admin/works/${encodeURIComponent(workId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }));
    elements.adminMessage.textContent = "已保存";
    render();
    elements.adminWorkSelect.value = workId;
    fillAdminForm(workId);
  } catch (error) {
    elements.adminMessage.textContent = error.message;
  }
}

async function deleteAdminWork(workId) {
  applyServerState(await apiRequest(`/api/works/${encodeURIComponent(workId)}`, {
    method: "DELETE",
  }));
  elements.adminMessage.textContent = "已删除";
  render();
}

async function handleAdminDelete() {
  const workId = elements.adminWorkSelect.value;
  const work = state.works.find((item) => item.id === workId);
  if (!work || !window.confirm(`确定删除《${work.title}》吗？`)) {
    return;
  }

  try {
    await deleteAdminWork(workId);
  } catch (error) {
    elements.adminMessage.textContent = error.message;
  }
}

async function approveAdminWork(workId) {
  applyServerState(await apiRequest(`/api/admin/works/${encodeURIComponent(workId)}/approval`, {
    method: "PUT",
  }));
  elements.adminMessage.textContent = "作品已通过审核";
  render();
  elements.adminWorkSelect.value = workId;
  fillAdminForm(workId);
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

  const body = adminUserId ? { admin: !user.admin } : { disabled: !user.disabled };
  try {
    applyServerState(await apiRequest(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }));
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

function renderDetailMedia(work) {
  if (getMediaType(work) === "video") {
    return `
      <video class="detail-image detail-video" src="${escapeHTML(work.image)}" controls playsinline preload="metadata"></video>
    `;
  }
  return `<img class="detail-image" src="${escapeHTML(work.image)}" alt="${escapeHTML(work.title)}" />`;
}

function openWorkDetail(workId) {
  const work = state.works.find((item) => item.id === workId);
  if (!work) {
    return;
  }
  elements.detailPanel.innerHTML = `
    ${renderDetailMedia(work)}
    <div class="detail-body">
      <div class="detail-text">
        <p class="eyebrow">${getCollectionName(work) ? `${escapeHTML(getCollectionName(work))} · ` : ""}${escapeHTML(work.kind || "作品")} · ${escapeHTML(work.year || "")}</p>
        <h2 id="panelTitle">${escapeHTML(work.title)}</h2>
        <p>${escapeHTML(work.body || work.summary || "")}</p>
        <p class="owner-line">上传者：${escapeHTML(work.ownerName || "站点")} ${renderWorkVisibility(work)}</p>
      </div>
      <div class="tag-row">
        ${(work.tags || []).map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join("")}
      </div>
      <div class="stats-row" aria-label="作品数据">
        <div class="stat"><strong>${getVoteCount(work.id)}</strong><span>喜欢票</span></div>
        <div class="stat"><strong>${getFavoriteCount(work.id)}</strong><span>收藏</span></div>
        <div class="stat"><strong>${getCommentCount(work.id)}</strong><span>留言</span></div>
        <div class="stat"><strong>${getViewCount(work.id)}</strong><span>浏览</span></div>
      </div>
    </div>
  `;
  elements.workDetailDialog.showModal();
}

function closeWorkDetail() {
  elements.detailPanel.querySelectorAll("video").forEach((video) => video.pause());
  elements.workDetailDialog.close();
}

function openAuth(message = "") {
  elements.authMessage.textContent = message;
  elements.passwordInput.value = "";
  elements.authDialog.showModal();
  window.requestAnimationFrame(() => elements.usernameInput.focus());
}

function closeAuth() {
  elements.authDialog.close();
  elements.authMessage.textContent = "";
}

async function handleAuthSubmit() {
  const username = elements.usernameInput.value.trim();
  const password = elements.passwordInput.value;
  if (!username || !password) {
    elements.authMessage.textContent = "请输入账号和密码";
    return;
  }

  try {
    applyServerState(await apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }));
    closeAuth();
    render();
  } catch (error) {
    elements.authMessage.textContent = error.message;
  }
}

async function logout() {
  applyServerState(await apiRequest("/api/logout", { method: "POST" }));
  render();
}

function bindEvents() {
  elements.openAuthBtn.addEventListener("click", () => openAuth());
  elements.lockedLoginBtn.addEventListener("click", () => openAuth());
  elements.logoutBtn.addEventListener("click", logout);
  elements.closeAuthBtn.addEventListener("click", closeAuth);
  elements.submitAuthBtn.addEventListener("click", handleAuthSubmit);
  elements.passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      handleAuthSubmit();
    }
  });
  elements.authDialog.addEventListener("click", (event) => {
    if (event.target === elements.authDialog) {
      closeAuth();
    }
  });

  elements.adminWorkSelect.addEventListener("change", () => fillAdminForm(elements.adminWorkSelect.value));
  elements.adminForm.addEventListener("submit", handleAdminSubmit);
  elements.adminDeleteBtn.addEventListener("click", handleAdminDelete);
  elements.adminReviewsPanel.addEventListener("click", handleAdminReviewAction);
  elements.adminUsersPanel.addEventListener("click", handleAdminUserAction);
  elements.adminCommentsPanel.addEventListener("click", handleAdminCommentAction);

  elements.closeDetailBtn.addEventListener("click", closeWorkDetail);
  elements.workDetailDialog.addEventListener("click", (event) => {
    if (event.target === elements.workDetailDialog) {
      closeWorkDetail();
    }
  });
  elements.workDetailDialog.addEventListener("close", () => {
    elements.detailPanel.querySelectorAll("video").forEach((video) => video.pause());
    elements.detailPanel.innerHTML = "";
  });
}

bindEvents();
loadServerState();
