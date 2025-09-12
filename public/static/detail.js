// 詳細ページの管理
class DetailApp {
  constructor() {
    this.user = null;
    this.ashiotoId = null;
    this.init();
  }

  async init() {
    // URLからあしあとIDを取得
    const detailApp = document.getElementById("detail-app");
    this.ashiotoId = detailApp.dataset.ashiotoId;

    // ログイン状態を取得（失敗してもOK）
    try {
      const response = await fetch("/api/auth/me", { credentials: "include" });
      if (response.ok) {
        this.user = await response.json();
      }
    } catch {}

    // 投稿詳細は必ず取得し、公開投稿は誰でも見れる
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("userSection").style.display = "block";
    await this.loadPostDetail();
  }

  // 投稿詳細を読み込み
  async loadPostDetail() {
    try {
      console.log("投稿詳細を読み込み中...", this.ashiotoId);
      const response = await fetch(`/api/ashioto/${this.ashiotoId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 404) {
          this.showNotFound();
          return;
        } else if (response.status === 403) {
          this.showAccessDenied();
          return;
        }
        console.error("投稿詳細の取得に失敗:", response.status);
        return;
      }

      const postDetail = await response.json();
      console.log("投稿詳細を取得:", postDetail);

      this.renderPostDetail(postDetail);
    } catch (error) {
      console.error("投稿詳細の読み込みに失敗:", error);
      this.showError();
    }
  }

  // 投稿詳細をレンダリング
  renderPostDetail(post) {
    const postDetailContainer = document.getElementById("postDetail");
    if (!postDetailContainer) return;

    const isMyPost = this.user && this.user.spotifyId === post.userId;
    const createdDate = new Date(post.createdAt);

    postDetailContainer.innerHTML = `
      <div class="detail-card">
        <!-- ユーザー情報 -->
        <div class="detail-user-header">
          <img src="${post.userAvatar || "/static/default-avatar.png"}" alt="${
      post.userName
    }" class="detail-user-avatar" />
          <div class="detail-user-info">
            <a href="/user/${post.userId}" class="detail-user-name-link">
              <h3>${post.userName}</h3>
            </a>
            ${isMyPost ? '<span class="my-post-badge">あなたの投稿</span>' : ""}
          </div>
        </div>

        <!-- 日時情報 -->
        <div class="detail-timestamp">
          <div class="detail-date">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-calendar-event-fill" viewBox="0 0 16 16">
              <path d="M4 .5a.5.5 0 0 0-1 0V1H2a2 2 0 0 0-2 2v1h16V3a2 2 0 0 0-2-2h-1V.5a.5.5 0 0 0-1 0V1H4zM16 14V5H0v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2m-3.5-7h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5"/>
            </svg> ${createdDate.toLocaleDateString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
          <div class="detail-time">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clock" viewBox="0 0 16 16">
              <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"/>
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0"/>
            </svg> ${createdDate.toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>

        <!-- 音楽情報 -->
        <div class="detail-music-section">
          <h4>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-music-note-beamed" viewBox="0 0 16 16">
              <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13s1.12-2 2.5-2 2.5.896 2.5 2m9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2"/>
              <path fill-rule="evenodd" d="M14 11V2h1v9zM6 3v10H5V3z"/>
              <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4z"/>
            </svg> 聴いていた音楽
          </h4>
          <div class="detail-music-card">
            <img src="${post.albumCover}" alt="${
      post.trackName
    }" class="detail-album-cover" />
            <div class="detail-track-info">
              <a href="https://open.spotify.com/intl-ja/track/${
                post.spotifyTrackId
              }" target="_blank" class="detail-spotify-link">
                <h5 class="detail-track-name">${post.trackName}</h5>
              </a>
              <p class="detail-artist-name">${post.artistName}</p>
              ${
                post.albumName
                  ? `<p class="detail-album-name">${post.albumName}</p>`
                  : ""
              }
            </div>
          </div>
        </div>

        <!-- 場所情報 -->
        <div class="detail-location-section">
          <h4>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-geo-fill" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411"/>
            </svg> 場所</h4>
          <div class="detail-location-card">
            <div class="detail-location-name">${post.locationName}</div>
            <div class="detail-coordinates">
              緯度: ${post.latitude.toFixed(6)}, 経度: ${post.longitude.toFixed(
      6
    )}
            </div>
          </div>
        </div>

        <!-- コメント -->
        ${
          post.comment
            ? `
          <div class="detail-comment-section">
            <h4>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-chat" viewBox="0 0 16 16">
                <path d="M2.678 11.894a1 1 0 0 1 .287.801 11 11 0 0 1-.398 2c1.395-.323 2.247-.697 2.634-.893a1 1 0 0 1 .71-.074A8 8 0 0 0 8 14c3.996 0 7-2.807 7-6s-3.004-6-7-6-7 2.808-7 6c0 1.468.617 2.83 1.678 3.894m-.493 3.905a22 22 0 0 1-.713.129c-.2.032-.352-.176-.273-.362a10 10 0 0 0 .244-.637l.003-.01c.248-.72.45-1.548.524-2.319C.743 11.37 0 9.76 0 8c0-3.866 3.582-7 8-7s8 3.134 8 7-3.582 7-8 7a9 9 0 0 1-2.347-.306c-.52.263-1.639.742-3.468 1.105"/>
              </svg> コメント
            </h4>
            <div class="detail-comment-card">
              ${post.comment}
            </div>
          </div>
        `
            : ""
        }

        <!-- アクション -->
        <div class="detail-actions">
          <button class="detail-action-btn" id="copyLinkBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
              <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
              <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
            </svg> リンクをコピー
          </button>
          <button class="detail-action-btn" id="tweetBtn">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-twitter" viewBox="0 0 16 16">
              <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.009-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.084.797A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115c-.212 0-.417-.021-.616-.061a3.293 3.293 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
            </svg> ツイート
          </button>
          <button class="detail-action-btn" id="mapBtn">
            🗺️ 地図で見る
          </button>
        </div>
      </div>


    `;

    // イベントリスナーを設定
    this.bindDetailActions(post);
  }

  // 詳細ページのアクションを設定
  bindDetailActions(post) {
    // リンクをコピー
    const copyLinkBtn = document.getElementById("copyLinkBtn");
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener("click", async () => {
        try {
          const postUrl = `${window.location.origin}/detail/${this.ashiotoId}`;
          await navigator.clipboard.writeText(postUrl);
          const originalText = copyLinkBtn.textContent;
          copyLinkBtn.textContent = "✔ コピー済み";
          copyLinkBtn.style.background = "#1db954";
          setTimeout(() => {
            copyLinkBtn.textContent = originalText;
            copyLinkBtn.style.background = "";
          }, 2000);
        } catch (err) {
          console.error("クリップボードへのコピーに失敗:", err);
          alert("リンクのコピーに失敗しました");
        }
      });
    }

    // ツイート
    const tweetBtn = document.getElementById("tweetBtn");
    if (tweetBtn) {
      tweetBtn.addEventListener("click", () => {
        const userName = post.userName;
        const locationName = post.locationName;
        const trackName = post.trackName;
        const artistName = post.artistName;
        const createdDate = new Date(post.createdAt);
        const mmdd = `${createdDate.getMonth() + 1}/${createdDate.getDate()}`;
        const hm = `${createdDate
          .getHours()
          .toString()
          .padStart(2, "0")}:${createdDate
          .getMinutes()
          .toString()
          .padStart(2, "0")}`;
        const url = `${window.location.origin}/detail/${this.ashiotoId}`;
        const text = `${userName} さんが ${locationName} の近くで『${trackName}（${artistName}）』を聞きました！(${mmdd} ${hm})\n${url}`;
        const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(
          text
        )}`;
        window.open(tweetUrl, "_blank");
      });
    }

    // 地図で見る
    const mapBtn = document.getElementById("mapBtn");
    if (mapBtn) {
      mapBtn.addEventListener("click", () => {
        window.location.href = `/`;
      });
    }
  }

  // 投稿が見つからない場合
  showNotFound() {
    const postDetailContainer = document.getElementById("postDetail");
    if (!postDetailContainer) return;

    postDetailContainer.innerHTML = `
      <div class="detail-error">
        <h3>🔍 投稿が見つかりません</h3>
        <p>指定された投稿が存在しないか、削除されている可能性があります。</p>
        <a href="/" class="error-action-btn">地図に戻る</a>
      </div>
    `;
  }

  // アクセス拒否の場合
  showAccessDenied() {
    const postDetailContainer = document.getElementById("postDetail");
    if (!postDetailContainer) return;

    postDetailContainer.innerHTML = `
      <div class="detail-error">
        <h3>🔒 アクセス権限がありません</h3>
        <p>この投稿は非公開に設定されています。</p>
        <a href="/" class="error-action-btn">地図に戻る</a>
      </div>
    `;
  }

  // エラーの場合
  showError() {
    const postDetailContainer = document.getElementById("postDetail");
    if (!postDetailContainer) return;

    postDetailContainer.innerHTML = `
      <div class="detail-error">
        <h3>⚠️ エラーが発生しました</h3>
        <p>投稿の読み込み中にエラーが発生しました。</p>
        <button onclick="location.reload()" class="error-action-btn">再読み込み</button>
      </div>
    `;
  }
}

// ページ読み込み時にアプリを初期化
document.addEventListener("DOMContentLoaded", () => {
  new DetailApp();
});
