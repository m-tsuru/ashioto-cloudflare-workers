// 足跡ページの管理
class FootprintsApp {
  constructor() {
    this.user = null;
    this.init();
  }

  async init() {
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
        await this.loadMyFootprints();
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

  // 自分の足跡を読み込み
  async loadMyFootprints() {
    try {
      console.log("足跡を読み込み中...");
      const response = await fetch("/api/my-footprints", {
        credentials: "include",
      });

      if (!response.ok) {
        console.error("足跡の取得に失敗:", response.status);
        return;
      }

      const footprints = await response.json();
      console.log("足跡を取得:", footprints.length, footprints);

      this.renderFootprints(footprints);
    } catch (error) {
      console.error("足跡の読み込みに失敗:", error);
    }
  }

  // 足跡をレンダリング
  renderFootprints(footprints) {
    const footprintsList = document.getElementById("footprintsList");
    if (!footprintsList) return;

    if (footprints.length === 0) {
      footprintsList.innerHTML = `
        <div class="no-footprints">
          <h3>🐾 まだあしあとがありません</h3>
          <p>音楽を聴いている場所で投稿してあしあとを残してみましょう！</p>
          <a href="/" class="primary-button">地図に戻る</a>
        </div>
      `;
      return;
    }

    // 月ごとにグループ化
    const groupedFootprints = this.groupFootprintsByMonth(footprints);

    footprintsList.innerHTML = Object.keys(groupedFootprints)
      .map((month) => {
        const monthFootprints = groupedFootprints[month];
        return `
          <div class="month-group">
            <h2 class="month-header">${month}</h2>
            <div class="footprints-grid">
              ${monthFootprints
                .map((footprint) => this.createFootprintCard(footprint))
                .join("")}
            </div>
          </div>
        `;
      })
      .join("");
  }

  // 足跡を月ごとにグループ化
  groupFootprintsByMonth(footprints) {
    const grouped = {};

    footprints.forEach((footprint) => {
      const date = new Date(footprint.createdAt);
      const monthKey = date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
      });

      if (!grouped[monthKey]) {
        grouped[monthKey] = [];
      }
      grouped[monthKey].push(footprint);
    });

    return grouped;
  }

  // 足跡カードを作成
  createFootprintCard(footprint) {
    return `
      <div class="footprint-card">
        <div class="footprint-date">
          ${new Date(footprint.createdAt).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div class="footprint-music">
          <img src="${footprint.albumCover}" alt="${
      footprint.trackName
    }" class="footprint-album-cover" />
          <div class="footprint-track-info">
            <a href="https://open.spotify.com/intl-ja/track/${
              footprint.spotifyTrackId
            }" target="_blank" class="footprint-track-link">
              <div class="footprint-track-name">${footprint.trackName}</div>
            </a>
            <div class="footprint-artist-name">${footprint.artistName}</div>
          </div>
        </div>
        <div class="footprint-location">
          📍 ${footprint.locationName}
        </div>
        ${
          footprint.comment
            ? `<div class="footprint-comment">${footprint.comment}</div>`
            : ""
        }
      </div>
    `;
  }
}

// ページ読み込み時にアプリを初期化
document.addEventListener("DOMContentLoaded", () => {
  new FootprintsApp();
});
