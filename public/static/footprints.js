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
          <h3><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock-history" viewBox="0 0 16 16">
            <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z"/>
            <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z"/>
            <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5"/>
          </svg> まだあしあとがありません</h3>
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
          <a href="/detail/${
            footprint.id
          }" class="detail-link" title="投稿の詳細を見る">
            <img src="${footprint.albumCover}" alt="${
      footprint.trackName
    }" class="footprint-album-cover" />
          </a>
          <div class="footprint-track-info">
            <a href="/detail/${
              footprint.id
            }" class="detail-link" title="投稿の詳細を見る">
              <div class="footprint-track-name">${footprint.trackName}</div>
            </a>
            <div class="footprint-artist-name">${footprint.artistName}</div>
          </div>
        </div>
        <div class="footprint-location">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-fill" viewBox="0 0 16 16">
  <path fill-rule="evenodd" d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411"/>
</svg> ${footprint.locationName}
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
