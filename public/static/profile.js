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
              🔗
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
          <a href="/footprints" class="profile-button">🐾 あしあとをたどる</a>
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
          const originalText = linkButton.textContent;
          linkButton.textContent = "✓";
          linkButton.style.color = "#1db954";

          // 2秒後に元に戻す
          setTimeout(() => {
            linkButton.textContent = originalText;
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
          linkButton.textContent = "✓";
          linkButton.style.color = "#1db954";

          setTimeout(() => {
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
          <h3>🐾 まだあしあとがありません</h3>
        </div>
      `;
      return;
    }

    userFootprints.innerHTML = `
      <div class="footprints-section">
        <h3>🐾 あしあと (${footprints.length})</h3>
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
            <img src="${footprint.albumCover}" alt="${
      footprint.trackName
    }" class="timeline-album-cover" />
            <div class="timeline-track-info">
              <a href="https://open.spotify.com/intl-ja/track/${
                footprint.spotifyTrackId
              }" target="_blank" class="timeline-track-link">
                <div class="timeline-track-name">${footprint.trackName}</div>
              </a>
              <div class="timeline-artist-name">${footprint.artistName}</div>
            </div>
          </div>
          <div class="timeline-location">
            📍 ${footprint.locationName}
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
