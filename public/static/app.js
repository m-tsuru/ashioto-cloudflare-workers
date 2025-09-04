// 地図とUI管理のメインアプリケーション
class AshiotoApp {
  constructor() {
    this.map = null;
    this.currentPosition = { lat: 35.681236, lng: 139.767125 }; // 東京駅
    this.userMarker = null;
    this.postsMarkers = [];
    this.currentTrack = null;
    this.user = null;

    this.init();
  }

  async init() {
    this.initMap();
    this.initBottomSheet();
    this.bindEvents();
    await this.checkAuthStatus();
    this.getUserLocation();
    await this.loadNearbyPosts();
  }

  // 認証状態をチェック
  async checkAuthStatus() {
    try {
      console.log("認証状態をチェック中...");
      const response = await fetch("/api/auth/me", {
        credentials: "include", // Cookieを含める
      });

      console.log("認証レスポンス:", response.status);

      if (response.ok) {
        this.user = await response.json();
        console.log("認証成功:", this.user);
        this.showUserSection();
      } else {
        console.log("認証失敗:", response.status);
        this.showLoginSection();
      }
    } catch (error) {
      console.error("認証チェック失敗:", error);
      this.showLoginSection();
    }
  }

  // ログインセクションを表示
  showLoginSection() {
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("userSection").style.display = "none";
  }

  // ユーザーセクションを表示
  showUserSection() {
    if (this.user) {
      document.getElementById("userAvatar").src =
        this.user.avatarUrl || "/static/default-avatar.png";
      document.getElementById(
        "userWelcome"
      ).textContent = `こんにちは、${this.user.displayName}さん`;
    }
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("userSection").style.display = "block";
  }

  // 地図の初期化
  initMap() {
    this.map = L.map("map").setView(
      [this.currentPosition.lat, this.currentPosition.lng],
      13
    );

    // OpenStreetMapタイルレイヤー
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(this.map);

    // 地図移動時のイベント
    this.map.on("moveend", () => {
      const center = this.map.getCenter();
      this.currentPosition = { lat: center.lat, lng: center.lng };
      this.loadNearbyPosts();
    });

    // SpeedDialのイベントハンドラーを追加
    this.initSpeedDial();
  }

  // ドラッグ可能ボトムシート
  initBottomSheet() {
    const sheet = document.getElementById("bottomSheet");
    const handle = document.getElementById("bottomSheetHandle");

    if (!sheet || !handle) return;

    let startY = 0;
    let dragging = false;

    // 状態: 'minimized', 'normal', 'expanded'
    let sheetState = "normal";

    // ダブルクリックで状態を循環
    handle.addEventListener("dblclick", () => {
      this.cycleBottomSheetState();
    });

    // マウスイベント（PC）
    handle.addEventListener("mousedown", (e) => {
      if (e.detail === 2) return; // ダブルクリックは無視
      dragging = true;
      startY = e.clientY;
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;

      // 下向きに一定距離ドラッグしたら縮小
      if (dy > 50 && sheetState === "normal") {
        this.minimizeBottomSheet();
        sheetState = "minimized";
        dragging = false;
        document.body.style.userSelect = "";
      }
      // 上向きに一定距離ドラッグしたら拡張
      else if (dy < -50 && sheetState === "normal") {
        this.expandBottomSheet();
        sheetState = "expanded";
        dragging = false;
        document.body.style.userSelect = "";
      }
      // 縮小状態から上向きドラッグで通常に戻す
      else if (dy < -50 && sheetState === "minimized") {
        this.normalizeBottomSheet();
        sheetState = "normal";
        dragging = false;
        document.body.style.userSelect = "";
      }
      // 拡張状態から下向きドラッグで通常に戻す
      else if (dy > 50 && sheetState === "expanded") {
        this.normalizeBottomSheet();
        sheetState = "normal";
        dragging = false;
        document.body.style.userSelect = "";
      }
    });

    window.addEventListener("mouseup", () => {
      if (dragging) {
        dragging = false;
        document.body.style.userSelect = "";
      }
    });

    // タッチイベント（スマホ）
    handle.addEventListener("touchstart", (e) => {
      dragging = true;
      startY = e.touches[0].clientY;
      document.body.style.userSelect = "none";
    });

    window.addEventListener("touchmove", (e) => {
      if (!dragging) return;
      const dy = e.touches[0].clientY - startY;

      // 下向きに一定距離ドラッグしたら縮小
      if (dy > 50 && sheetState === "normal") {
        this.minimizeBottomSheet();
        sheetState = "minimized";
        dragging = false;
        document.body.style.userSelect = "";
      }
      // 上向きに一定距離ドラッグしたら拡張
      else if (dy < -50 && sheetState === "normal") {
        this.expandBottomSheet();
        sheetState = "expanded";
        dragging = false;
        document.body.style.userSelect = "";
      }
      // 縮小状態から上向きドラッグで通常に戻す
      else if (dy < -50 && sheetState === "minimized") {
        this.normalizeBottomSheet();
        sheetState = "normal";
        dragging = false;
        document.body.style.userSelect = "";
      }
      // 拡張状態から下向きドラッグで通常に戻す
      else if (dy > 50 && sheetState === "expanded") {
        this.normalizeBottomSheet();
        sheetState = "normal";
        dragging = false;
        document.body.style.userSelect = "";
      }
    });

    window.addEventListener("touchend", () => {
      if (dragging) {
        dragging = false;
        document.body.style.userSelect = "";
      }
    });

    // 状態を追跡
    this.bottomSheetState = sheetState;
  }

  // Bottom-sheetの縮小
  minimizeBottomSheet() {
    const sheet = document.getElementById("bottomSheet");
    if (sheet) {
      sheet.classList.remove("expanded");
      sheet.classList.add("minimized");
      this.bottomSheetState = "minimized";
    }
  }

  // Bottom-sheetの拡張
  expandBottomSheet() {
    const sheet = document.getElementById("bottomSheet");
    if (sheet) {
      sheet.classList.remove("minimized");
      sheet.classList.add("expanded");
      this.bottomSheetState = "expanded";
    }
  }

  // Bottom-sheetの通常状態
  normalizeBottomSheet() {
    const sheet = document.getElementById("bottomSheet");
    if (sheet) {
      sheet.classList.remove("minimized", "expanded");
      this.bottomSheetState = "normal";
    }
  }

  // Bottom-sheetの状態を循環
  cycleBottomSheetState() {
    switch (this.bottomSheetState) {
      case "normal":
        this.expandBottomSheet();
        break;
      case "expanded":
        this.minimizeBottomSheet();
        break;
      case "minimized":
        this.normalizeBottomSheet();
        break;
      default:
        this.normalizeBottomSheet();
    }
  }

  // 旧メソッドの互換性維持
  toggleBottomSheet() {
    this.cycleBottomSheetState();
  }

  // イベントハンドラーのバインド
  bindEvents() {
    // 現在の曲を取得
    const getCurrentTrackBtn = document.getElementById("getCurrentTrack");
    if (getCurrentTrackBtn) {
      getCurrentTrackBtn.addEventListener("click", () =>
        this.getCurrentTrack()
      );
    }

    // 投稿フォーム送信
    const musicPostForm = document.getElementById("musicPostForm");
    if (musicPostForm) {
      musicPostForm.addEventListener("submit", (e) => this.submitPost(e));
    }

    // ログアウト
    const logoutBtn = document.getElementById("logoutButton");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => this.logout());
    }
  }

  // SpeedDial初期化
  initSpeedDial() {
    const speedDialMain = document.getElementById("speedDialMain");
    const speedDialActions = document.getElementById("speedDialActions");
    const createPostButton = document.getElementById("createPostButton");
    const getCurrentLocationButton = document.getElementById(
      "getCurrentLocationButton"
    );

    if (
      !speedDialMain ||
      !speedDialActions ||
      !createPostButton ||
      !getCurrentLocationButton
    )
      return;

    let isOpen = false;

    // SpeedDialメインボタンのクリック
    speedDialMain.addEventListener("click", () => {
      isOpen = !isOpen;

      if (isOpen) {
        speedDialMain.classList.add("active");
        speedDialActions.classList.add("active");
      } else {
        speedDialMain.classList.remove("active");
        speedDialActions.classList.remove("active");
      }
    });

    // 投稿ボタンのクリック
    createPostButton.addEventListener("click", () => {
      // SpeedDialを閉じる
      isOpen = false;
      speedDialMain.classList.remove("active");
      speedDialActions.classList.remove("active");

      // 投稿フォームを表示
      this.showPostForm();
    });

    // 現在地取得ボタンのクリック
    getCurrentLocationButton.addEventListener("click", () => {
      // SpeedDialを閉じる
      isOpen = false;
      speedDialMain.classList.remove("active");
      speedDialActions.classList.remove("active");

      // 現在地を取得して地図を移動
      this.getUserLocationAndMoveMap();
    });

    // 外側クリックでSpeedDialを閉じる
    document.addEventListener("click", (e) => {
      const speedDial = document.getElementById("speedDial");
      if (isOpen && speedDial && !speedDial.contains(e.target)) {
        isOpen = false;
        speedDialMain.classList.remove("active");
        speedDialActions.classList.remove("active");
      }
    });
  }

  // ユーザーの現在位置を取得
  getUserLocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.map.setView(
            [this.currentPosition.lat, this.currentPosition.lng],
            15
          );
          this.updateUserMarker();
          this.loadNearbyPosts();
        },
        (error) => {
          console.warn("位置情報の取得に失敗しました:", error);
        }
      );
    }
  }

  // ユーザーマーカーの更新
  updateUserMarker() {
    if (this.userMarker) {
      this.map.removeLayer(this.userMarker);
    }

    // カスタムアイコン（現在地）
    const userIcon = L.divIcon({
      html: '<div style="background: #1db954; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    this.userMarker = L.marker(
      [this.currentPosition.lat, this.currentPosition.lng],
      {
        icon: userIcon,
      }
    ).addTo(this.map);
  }

  // SpeedDialの現在地取得ボタン用（ユーザー操作によるもの）
  getUserLocationAndMoveMap() {
    if ("geolocation" in navigator) {
      // ローディング表示（オプション）
      console.log("現在地を取得中...");

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.currentPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };

          // 地図を現在地に移動（少しズームアップ）
          this.map.setView(
            [this.currentPosition.lat, this.currentPosition.lng],
            16
          );

          // ユーザーマーカーを更新
          this.updateUserMarker();

          // 近くの投稿を再読み込み
          this.loadNearbyPosts();

          console.log("現在地を取得しました:", this.currentPosition);
        },
        (error) => {
          console.warn("位置情報の取得に失敗しました:", error);

          // エラーメッセージを表示（オプション）
          let errorMessage = "位置情報の取得に失敗しました。";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage =
                "位置情報へのアクセスが拒否されました。ブラウザの設定を確認してください。";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "位置情報が利用できません。";
              break;
            case error.TIMEOUT:
              errorMessage = "位置情報の取得がタイムアウトしました。";
              break;
          }

          // 簡易的なアラート表示（後で改善可能）
          alert(errorMessage);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    } else {
      alert("このブラウザでは位置情報機能をサポートしていません。");
    }
  }

  // 近くの投稿を読み込み
  async loadNearbyPosts() {
    try {
      console.log("Loading posts for position:", this.currentPosition);
      const response = await fetch(
        `/api/ashioto?lat=${this.currentPosition.lat}&lon=${this.currentPosition.lng}&radius=1000`,
        {
          credentials: "include", // Cookieを含める
        }
      );

      if (!response.ok) {
        console.error("Failed to fetch posts:", response.status);
        return;
      }

      const posts = await response.json();
      console.log("Loaded posts:", posts.length, posts);

      this.clearPostMarkers();
      this.renderPosts(posts);
      this.addPostMarkers(posts);
    } catch (error) {
      console.error("投稿の読み込みに失敗しました:", error);
    }
  }

  // 投稿マーカーをクリア
  clearPostMarkers() {
    console.log("Clearing markers:", this.postsMarkers.length);
    this.postsMarkers.forEach((marker) => {
      this.map.removeLayer(marker);
    });
    this.postsMarkers = [];
    console.log("Markers cleared, remaining:", this.postsMarkers.length);
  }

  // 地図に投稿マーカーを追加
  addPostMarkers(posts) {
    console.log("Adding markers for posts:", posts.length);
    posts.forEach((post, index) => {
      console.log(`Adding marker ${index + 1}:`, {
        trackName: post.trackName,
        latitude: post.latitude,
        longitude: post.longitude,
        albumCover: post.albumCover,
      });

      // アートワーク付きのマーカーを作成
      const musicIcon = L.divIcon({
        html: `
          <div class="music-marker">
            <img src="${post.albumCover}" alt="${post.trackName}" class="album-artwork" />
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        className: "custom-music-marker",
      });

      const marker = L.marker([post.latitude, post.longitude], {
        icon: musicIcon,
      }).addTo(this.map);

      // クリック時にポップアップを表示
      marker.bindPopup(`
        <div class="music-popup">
          <div class="popup-header">
            <img src="${
              post.userAvatar || "/static/default-avatar.png"
            }" alt="${post.userName}" class="popup-avatar" />
            <div class="popup-user-info">
              <strong>${post.userName}</strong>
              <span class="popup-time">${new Date(
                post.createdAt
              ).toLocaleString("ja-JP")}</span>
            </div>
          </div>
          <div class="popup-music">
            <img src="${post.albumCover}" alt="${
        post.trackName
      }" class="popup-album-cover" />
            <div class="popup-track-info">
              <a href="https://open.spotify.com/intl-ja/track/${
                post.spotifyTrackId
              }" target="_blank" class="popup-track-link">
                <div class="popup-track-name">${post.trackName}</div>
              </a>
              <div class="popup-artist-name">${post.artistName}</div>
              ${
                post.albumName
                  ? `<div class="popup-album-name">${post.albumName}</div>`
                  : ""
              }
            </div>
          </div>
          ${
            post.comment
              ? `<div class="popup-comment">${post.comment}</div>`
              : ""
          }
          <div class="popup-location">📍 ${post.locationName}</div>
        </div>
      `);

      this.postsMarkers.push(marker);
      console.log(`Marker ${index + 1} added to map and array`);
    });
    console.log("Total markers added:", this.postsMarkers.length);
  }

  // 投稿リストをレンダリング
  renderPosts(posts) {
    const postsList = document.getElementById("postsList");
    if (!postsList) return;

    if (posts.length === 0) {
      postsList.innerHTML = "";
      return;
    }

    postsList.innerHTML = posts
      .map(
        (post) => `
      <div class="music-post">
        <div class="music-post-header">
          <img src="${post.userAvatar || "/static/default-avatar.png"}" alt="${
          post.userName
        }" class="user-avatar">
          <div class="user-info">
            <h4>${post.userName}</h4>
            <span class="post-time">${new Date(post.createdAt).toLocaleString(
              "ja-JP"
            )}</span>
          </div>
        </div>
        <div class="music-info">
          <img src="${post.albumCover}" alt="${
          post.trackName
        }" class="album-cover">
          <div class="track-details">
            <a href="https://open.spotify.com/intl-ja/track/${
              post.spotifyTrackId
            }" target="_blank" class="track-link">
              <h3>${post.trackName}</h3>
            </a>
            <p>${post.artistName}</p>
            ${
              post.albumName
                ? `<p class="album-name">${post.albumName}</p>`
                : ""
            }
          </div>
        </div>
        ${post.comment ? `<p class="post-comment">${post.comment}</p>` : ""}
        <div class="post-location">
          📍 ${
            post.locationName ||
            `${post.latitude.toFixed(4)}, ${post.longitude.toFixed(4)}`
          }
        </div>
      </div>
    `
      )
      .join("");
  }

  // 投稿フォームを表示
  async showPostForm() {
    const postForm = document.getElementById("postForm");
    if (!postForm) return;

    postForm.style.display = "block";

    // 現在位置を取得して近くの場所を検索
    if (navigator.geolocation) {
      const locationSelection = document.getElementById("locationSelection");
      const nearbyLocations = document.getElementById("nearbyLocations");

      if (locationSelection && nearbyLocations) {
        locationSelection.style.display = "block";
        nearbyLocations.innerHTML =
          '<div class="loading-locations">近くの場所を検索中...</div>';

        try {
          const position = await this.getCurrentPosition();
          const locations = await this.searchNearbyLocations(
            position.coords.latitude,
            position.coords.longitude
          );
          this.renderLocationOptions(locations);
        } catch (error) {
          console.error("Location search error:", error);
          nearbyLocations.innerHTML =
            '<div class="no-locations">場所の検索に失敗しました</div>';
        }
      }
    }
  }

  // 現在位置を取得（Promise化）
  getCurrentPosition() {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      });
    });
  }

  // 近くの場所を検索
  async searchNearbyLocations(latitude, longitude) {
    try {
      const response = await fetch(
        `/api/location/search?lat=${latitude}&lon=${longitude}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const locations = await response.json();
      return Array.isArray(locations) ? locations : [];
    } catch (error) {
      console.error("Failed to search nearby locations:", error);
      return [];
    }
  }

  // 場所選択オプションをレンダリング
  renderLocationOptions(locations) {
    const nearbyLocations = document.getElementById("nearbyLocations");
    if (!nearbyLocations) return;

    if (locations.length === 0) {
      nearbyLocations.innerHTML =
        '<div class="no-locations">近くに場所が見つかりませんでした</div>';
      return;
    }

    // データを保存（後で投稿時に使用）
    this.nearbyLocationsData = locations;

    nearbyLocations.innerHTML = locations
      .map(
        (location) => `
      <div class="location-option">
        <input type="radio" name="selectedLocation" value="${
          location.gid
        }" id="location-${location.gid}">
        <label for="location-${location.gid}" class="location-info">
          <div class="location-name">${location.name}</div>
          <div class="location-address">${
            location.genre ? location.genre.join(", ") : ""
          }</div>
        </label>
      </div>
    `
      )
      .join("");

    // ラジオボタンの変更イベントを追加
    const radioButtons = nearbyLocations.querySelectorAll(
      'input[type="radio"]'
    );
    radioButtons.forEach((radio) => {
      radio.addEventListener("change", this.updateSubmitButton.bind(this));
    });

    // クリックイベントを追加
    const locationOptions =
      nearbyLocations.querySelectorAll(".location-option");
    locationOptions.forEach((option) => {
      option.addEventListener("click", (e) => {
        const radio = option.querySelector('input[type="radio"]');
        if (radio && !radio.checked) {
          radio.checked = true;
          this.updateSubmitButton();
        }

        // 選択状態のクラスを更新
        locationOptions.forEach((opt) => opt.classList.remove("selected"));
        option.classList.add("selected");
      });
    });
  }

  // 送信ボタンの状態を更新
  updateSubmitButton() {
    const submitButton = document.getElementById("submitButton");
    const selectedLocation = document.querySelector(
      'input[name="selectedLocation"]:checked'
    );
    const trackInfo = document.getElementById("trackInfo");

    if (submitButton) {
      const hasLocation = !!selectedLocation;
      const hasTrack = trackInfo && trackInfo.style.display !== "none";
      submitButton.disabled = !(hasLocation && hasTrack);
    }
  }

  // 現在再生中の曲を取得
  async getCurrentTrack() {
    try {
      const response = await fetch("/api/spotify/current-track");

      if (response.ok) {
        const track = await response.json();
        this.currentTrack = track;
        this.displaySelectedTrack(track);
        this.updateSubmitButton(); // 送信ボタンの状態を更新
      } else {
        alert(
          "現在再生中の曲が見つかりません。Spotifyで音楽を再生してください。"
        );
      }
    } catch (error) {
      console.error("曲の取得に失敗しました:", error);
      alert("曲の取得に失敗しました");
    }
  }

  // 選択された曲を表示
  displaySelectedTrack(track) {
    const trackInfo = document.getElementById("trackInfo");
    const albumCover = document.getElementById("selectedAlbumCover");
    const trackName = document.getElementById("selectedTrackName");
    const artistName = document.getElementById("selectedArtistName");

    if (trackInfo && albumCover && trackName && artistName) {
      albumCover.src = track.albumCover;
      trackName.textContent = track.name;
      artistName.textContent = track.artists.join(", ");
      trackInfo.style.display = "block";
    }
  }

  // 投稿を送信
  async submitPost(e) {
    e.preventDefault();

    if (!this.currentTrack) {
      alert("曲を選択してください");
      return;
    }

    const selectedLocationInput = document.querySelector(
      'input[name="selectedLocation"]:checked'
    );
    if (!selectedLocationInput) {
      alert("場所を選択してください");
      return;
    }

    // 選択された場所の詳細情報を取得
    const selectedLocationGid = selectedLocationInput.value;
    const selectedLocation = this.nearbyLocationsData.find(
      (loc) => loc.gid === selectedLocationGid
    );

    if (!selectedLocation) {
      alert("選択された場所の情報が見つかりません");
      return;
    }

    const comment = document.getElementById("comment").value;

    const postData = {
      spotifyTrackId: this.currentTrack.id,
      trackName: this.currentTrack.name,
      artistName: this.currentTrack.artists.join(", "),
      albumName: this.currentTrack.album,
      albumCover: this.currentTrack.albumCover,
      landmarkGid: selectedLocation.gid,
      landmarkName: selectedLocation.name,
      landmarkLat: selectedLocation.geo.lat,
      landmarkLon: selectedLocation.geo.lon,
      comment: comment.trim() || null,
    };

    try {
      const response = await fetch("/api/ashioto", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(postData),
      });

      if (response.ok) {
        alert("投稿しました！");
        document.getElementById("comment").value = "";
        document.getElementById("postForm").style.display = "none";
        this.currentTrack = null;
        document.getElementById("trackInfo").style.display = "none";

        // フォームをリセット
        const locationSelection = document.getElementById("locationSelection");
        if (locationSelection) {
          locationSelection.style.display = "none";
        }

        // 送信ボタンを無効化
        const submitButton = document.getElementById("submitButton");
        if (submitButton) {
          submitButton.disabled = true;
        }

        await this.loadNearbyPosts();
      } else {
        const error = await response.json();
        alert(`投稿に失敗しました: ${error.error}`);
      }
    } catch (error) {
      console.error("投稿に失敗しました:", error);
      alert("投稿に失敗しました");
    }
  }

  // ログアウト
  async logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      location.reload();
    } catch (error) {
      console.error("ログアウトに失敗しました:", error);
    }
  }
}

// アプリケーション初期化
document.addEventListener("DOMContentLoaded", () => {
  new AshiotoApp();
});
