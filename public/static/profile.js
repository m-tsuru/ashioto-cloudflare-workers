// プロフィールページの管理
class ProfileApp {
  constructor() {
    this.user = null;
    this.targetUserId = null;
    this.init();
  }

  async init() {
    // URLからユーザーIDを取得
    const profileApp = document.getElementById("profile-app");
    this.targetUserId = profileApp.dataset.userId;

    await this.checkAuthStatus();
  }

  // 認証状態をチェック
  async checkAuthStatus() {
    try {
      console.log("認証状態をチェック中...");
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        this.user = await response.json();
        console.log("認証成功:", this.user);
        this.showUserSection();
        await this.loadUserProfile();
        await this.loadUserFootprints();
      } else {
        console.log("認証失敗:", response.status);
        this.showLoginSection();
      }
    } catch (error) {
      console.error("認証チェック失敗:", error);
      this.showLoginSection();
    }
  }

  showLoginSection() {
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("userSection").style.display = "none";
  }

  showUserSection() {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("userSection").style.display = "block";
  }

  // ユーザープロフィールを読み込み
  async loadUserProfile() {
    try {
      console.log("プロフィールを読み込み中...");
      const response = await fetch(`/api/user/${this.targetUserId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("プロフィールの取得に失敗:", response.status);
        return;
      }

      const userInfo = await response.json();
      console.log("プロフィールを取得:", userInfo);

      this.renderUserProfile(userInfo);
    } catch (error) {
      console.error("プロフィールの読み込みに失敗:", error);
    }
  }

  // ユーザーの足跡を読み込み
  async loadUserFootprints() {
    try {
      console.log("ユーザーの足跡を読み込み中...");
      const response = await fetch(
        `/api/user/${this.targetUserId}/footprints`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error("足跡の取得に失敗:", response.status);
        return;
      }

      const footprints = await response.json();
      console.log("足跡を取得:", footprints.length, footprints);

      this.renderUserFootprints(footprints);
    } catch (error) {
      console.error("足跡の読み込みに失敗:", error);
    }
  }

  // ユーザープロフィールをレンダリング
  renderUserProfile(userInfo) {
    const profileInfo = document.getElementById("profileInfo");
    if (!profileInfo) return;

    const joinDate = new Date(userInfo.createdAt).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
    });

    const isMyProfile = this.user && this.user.spotifyId === userInfo.spotifyId;

    profileInfo.innerHTML = `
      <div class="profile-header">
        <img src="${userInfo.avatarUrl || "/static/default-avatar.png"}" alt="${
      userInfo.displayName
    }" class="profile-avatar" />
        <div class="profile-info">
          <div class="profile-name-container">
            <h2 class="profile-name">${userInfo.displayName}</h2>
            <button class="profile-link-button" id="profileLinkButton" title="プロフィールリンクをコピー">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
              <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
            </svg>
            </button>
          </div>
          ${isMyProfile ? '<span class="profile-badge">あなた</span>' : ""}
          <div class="profile-stats">
            <div class="stat">
              <span class="stat-number">${userInfo.postCount}</span>
              <span class="stat-label">あしあと</span>
            </div>
            <div class="stat">
              <span class="stat-number">${joinDate}</span>
              <span class="stat-label">から利用</span>
            </div>
          </div>
        </div>
      </div>
      ${
        isMyProfile
          ? `
        <div class="profile-actions">
          <a href="/footprints" class="profile-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
              <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z"/>
              <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/>
              <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/>
            </svg> あしあとをたどる
          </a>
        </div>
      `
          : ""
      }
    `;

    // リンクボタンのイベントリスナーを追加
    this.bindProfileLinkButton();
  }

  // プロフィールリンクボタンの機能を追加
  bindProfileLinkButton() {
    const linkButton = document.getElementById("profileLinkButton");
    if (linkButton) {
      linkButton.addEventListener("click", async () => {
        try {
          const profileUrl = `${window.location.origin}/user/${this.targetUserId}`;

          // クリップボードにコピー
          await navigator.clipboard.writeText(profileUrl);

          // 成功フィードバック
          const originalText = linkButton.innerHTML;
          // linkButton.textContent = "✓";
          linkButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M13.854 2.146a.5.5 0 0 1 0 .708l-8 8a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 .708-.708L5 9.293l8.146-8.147a.5.5 0 0 1 .708 0z"/>
            </svg>
          `;
          linkButton.style.color = "#1db954";

          // 2秒後に元に戻す
          setTimeout(() => {
            linkButton.innerHTML = originalText;
            linkButton.style.color = "";
          }, 2000);

          console.log(
            "プロフィールURLがクリップボードにコピーされました:",
            profileUrl
          );
        } catch (err) {
          console.error("クリップボードへのコピーに失敗:", err);

          // フォールバック: 旧式のコピー方法を試す
          this.fallbackCopyToClipboard(
            `${window.location.origin}/user/${this.targetUserId}`
          );
        }
      });
    }
  }

  // フォールバック用のコピー機能
  fallbackCopyToClipboard(text) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);

      if (successful) {
        const linkButton = document.getElementById("profileLinkButton");
        if (linkButton) {
          const originalText = linkButton.textContent;
          linkButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
              <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
            </svg>
          `;
          linkButton.style.color = "#1db954";

          setTimeout(() => {
            linkButton.innerHTML = ``;
            linkButton.textContent = originalText;
            linkButton.style.color = "";
          }, 2000);
        }
        console.log(
          "プロフィールURLがクリップボードにコピーされました（フォールバック）:",
          text
        );
      } else {
        console.error("フォールバックコピーも失敗しました");
        alert("リンクのコピーに失敗しました。手動でURLをコピーしてください。");
      }
    } catch (err) {
      console.error("フォールバックコピーでエラー:", err);
      alert("リンクのコピーに失敗しました。手動でURLをコピーしてください。");
    }
  }

  // ユーザーの足跡をレンダリング
  renderUserFootprints(footprints) {
    const userFootprints = document.getElementById("userFootprints");
    if (!userFootprints) return;

    if (footprints.length === 0) {
      userFootprints.innerHTML = `
        <div class="no-footprints">
          <h3>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
            <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z"/>
            <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/>
            <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/>
          </svg> まだあしあとがありません</h3>
        </div>
      `;
      return;
    }

    userFootprints.innerHTML = `
      <div class="footprints-section">
        <h3><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
            <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z"/>
            <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/>
            <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/>
          </svg> あしあと (${footprints.length})
        </h3>
        <div class="footprints-timeline">
          ${footprints
            .slice(0, 10)
            .map((footprint) => this.createTimelineItem(footprint))
            .join("")}
        </div>
        ${
          footprints.length > 10
            ? `
          <div class="load-more">
            <button class="load-more-button" onclick="this.loadMoreFootprints()">さらに読み込む</button>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  // タイムライン項目を作成
  createTimelineItem(footprint) {
    return `
      <div class="timeline-item">
        <div class="timeline-date">
          ${new Date(footprint.createdAt).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div class="timeline-content">
          <div class="timeline-music">
            <a href="/detail/${
              footprint.id
            }" class="detail-link" title="投稿の詳細を見る">
              <img src="${footprint.albumCover}" alt="${
      footprint.trackName
    }" class="timeline-album-cover" />
            </a>
            <div class="timeline-track-info">
              <a href="/detail/${
                footprint.id
              }" class="detail-link" title="投稿の詳細を見る">
                <div class="timeline-track-name">${footprint.trackName}</div>
              </a>
              <div class="timeline-artist-name">${footprint.artistName}</div>
            </div>
          </div>
          <div class="timeline-location">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-fill" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411"/>
</svg> ${footprint.locationName}
          </div>
          ${
            footprint.comment
              ? `<div class="timeline-comment">${footprint.comment}</div>`
              : ""
          }
        </div>
      </div>
    `;
  }
}

// ページ読み込み時にアプリを初期化
document.addEventListener("DOMContentLoaded", () => {
  new ProfileApp();
});
