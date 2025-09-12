import { Hono } from "hono";
import type { FC } from "hono/jsx";

const frontend = new Hono();

const Layout: FC<{ title: string; children?: any }> = ({ children, title }) => {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet/dist/leaflet.css"
        />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        {children}
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <script src="/static/app.js"></script>
      </body>
    </html>
  );
};

const Map: FC<{ lat?: number; lon?: number }> = ({
  lat = 35.681236,
  lon = 139.767125,
}) => {
  return (
    <div id="map-container">
      <div id="map"></div>
    </div>
  );
};

const BottomSheet: FC<{ children?: any }> = ({ children }) => {
  return (
    <div class="bottom-sheet" id="bottomSheet">
      <div class="bottom-sheet-handle" id="bottomSheetHandle"></div>
      <div class="bottom-sheet-content">{children}</div>
    </div>
  );
};

const MusicPost: FC<{ post: any }> = ({ post }) => {
  return (
    <div class="music-post">
      <div class="music-post-header">
        <img
          src={post.userAvatar || "/static/default-avatar.png"}
          alt={post.userName}
          class="user-avatar"
        />
        <div class="user-info">
          <h4>{post.userName}</h4>
          <span class="post-time">
            {new Date(post.createdAt).toLocaleString("ja-JP")}
          </span>
        </div>
      </div>
      <div class="music-info">
        <img src={post.albumCover} alt={post.trackName} class="album-cover" />
        <div class="track-details">
          <h3></h3>
          <p>{post.artistName}</p>
          {post.albumName && <p class="album-name">{post.albumName}</p>}
        </div>
      </div>
      {post.comment && <p class="post-comment">{post.comment}</p>}
      <div class="post-location">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-geo-fill"
          viewBox="0 0 16 16"
        >
          <path
            fill-rule="evenodd"
            d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411"
          />
        </svg>{" "}
        {post.locationName || `${post.latitude}, ${post.longitude}`}
      </div>
    </div>
  );
};

const LoginPrompt: FC = () => {
  return (
    <div class="login-prompt">
      <h2>あしおと</h2>
      <p>
        世界と音楽をむすびつける
        <br />
        わたしたちだけのサウンドトラック。
      </p>
      <a href="/api/auth" class="login-button">
        Spotifyでログイン
      </a>
    </div>
  );
};

const PostForm: FC = () => {
  return (
    <div class="post-form" id="postForm" style="display: none;">
      <h3>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          fill="currentColor"
          class="bi bi-clock-history"
          viewBox="0 0 16 16"
        >
          <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z" />
          <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z" />
          <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5" />
        </svg>
        あしおとをのこす
      </h3>
      <form id="musicPostForm">
        <div class="form-group" id="locationSelection" style="display: none;">
          <label>紐づける場所を選択してください</label>
          <div id="nearbyLocations"></div>
        </div>
        <div class="form-group">
          <label>現在再生中の曲を取得</label>
          <button type="button" id="getCurrentTrack">
            現在の曲を取得
          </button>
        </div>
        <div class="form-group" id="trackInfo" style="display: none;">
          <div class="selected-track">
            <img id="selectedAlbumCover" alt="" class="album-cover-small" />
            <div>
              <div id="selectedTrackName"></div>
              <div id="selectedArtistName"></div>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label for="comment">コメント（任意）</label>
          <textarea
            id="comment"
            placeholder="この曲についてひとこと..."
          ></textarea>
        </div>
        <button type="submit" id="submitButton" disabled>
          投稿する
        </button>
      </form>
    </div>
  );
};

frontend.get("/", async (c) => {
  return c.html(
    <Layout title="ホーム - あしおと">
      <div id="app">
        <Map />
        <BottomSheet>
          <div id="loginSection">
            <LoginPrompt />
          </div>
          <div id="userSection" style="display: none;">
            <div class="user-welcome">
              <img
                id="userAvatar"
                src="/static/default-avatar.png"
                alt="User"
                class="user-avatar"
              />
              <span id="userWelcome">読み込み中...</span>
              <button id="logoutButton" class="logout-button">
                ログアウト
              </button>
            </div>
            <PostForm />
            <div id="nearbyPosts">
              <h3>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-geo-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411"
                  />
                </svg>{" "}
                ちかくのあしおと
              </h3>
              <div id="postsList"></div>
            </div>
          </div>
        </BottomSheet>

        {/* SpeedDial ボタン */}
        <div class="speed-dial" id="speedDial">
          <div class="speed-dial-actions" id="speedDialActions">
            <button
              class="speed-dial-action"
              id="getCurrentLocationButton"
              title="更新"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-geo-fill"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999zm2.493 8.574a.5.5 0 0 1-.411.575c-.712.118-1.28.295-1.655.493a1.3 1.3 0 0 0-.37.265.3.3 0 0 0-.057.09V14l.002.008.016.033a.6.6 0 0 0 .145.15c.165.13.435.27.813.395.751.25 1.82.414 3.024.414s2.273-.163 3.024-.414c.378-.126.648-.265.813-.395a.6.6 0 0 0 .146-.15l.015-.033L12 14v-.004a.3.3 0 0 0-.057-.09 1.3 1.3 0 0 0-.37-.264c-.376-.198-.943-.375-1.655-.493a.5.5 0 1 1 .164-.986c.77.127 1.452.328 1.957.594C12.5 13 13 13.4 13 14c0 .426-.26.752-.544.977-.29.228-.68.413-1.116.558-.878.293-2.059.465-3.34.465s-2.462-.172-3.34-.465c-.436-.145-.826-.33-1.116-.558C3.26 14.752 3 14.426 3 14c0-.599.5-1 .961-1.243.505-.266 1.187-.467 1.957-.594a.5.5 0 0 1 .575.411"
                />
              </svg>
            </button>
            <button
              class="speed-dial-action"
              id="createPostButton"
              title="あしおと"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-music-note-beamed"
                viewBox="0 0 16 16"
              >
                <path d="M6 13c0 1.105-1.12 2-2.5 2S1 14.105 1 13s1.12-2 2.5-2 2.5.896 2.5 2m9-2c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2" />
                <path fill-rule="evenodd" d="M14 11V2h1v9zM6 3v10H5V3z" />
                <path d="M5 2.905a1 1 0 0 1 .9-.995l8-.8a1 1 0 0 1 1.1.995V3L5 4z" />
              </svg>
            </button>
          </div>
          <button class="speed-dial-main" id="speedDialMain">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-circle" viewBox="0 0 16 16">
              <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
              <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
            </svg>
          </button>
        </div>
      </div>
    </Layout>
  );
});

// 自分の足跡ページ
frontend.get("/footprints", async (c) => {
  return c.html(
    <Layout title="あしおとをたどる - あしおと">
      <div id="footprints-app">
        <header class="page-header">
          <a href="/" class="back-button">
            ← もどる
          </a>
          <h1>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              class="bi bi-clock-history"
              viewBox="0 0 16 16"
            >
              <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z" />
              <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z" />
              <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5" />
            </svg>{" "}
            あしおとをたどる
          </h1>
        </header>
        <div class="page-content">
          <div id="loginSection">
            <LoginPrompt />
          </div>
          <div id="userSection" style="display: none;">
            <div id="footprintsList" class="footprints-list"></div>
          </div>
        </div>
      </div>
      <script src="/static/footprints.js"></script>
    </Layout>
  );
});

// ユーザープロフィールページ
frontend.get("/user/:userId", async (c) => {
  const userId = c.req.param("userId");
  return c.html(
    <Layout title={`ユーザープロフィール - あしおと`}>
      <div id="profile-app" data-user-id={userId}>
        <header class="page-header">
          <a href="/" class="back-button">
            ← もどる
          </a>
          <h1>
            プロフィール
          </h1>
        </header>
        <div class="page-content">
          <div id="loginSection">
            <LoginPrompt />
          </div>
          <div id="userSection" style="display: none;">
            <div id="profileInfo" class="profile-info"></div>
            <div id="userFootprints" class="user-footprints"></div>
          </div>
        </div>
      </div>
      <script src="/static/profile.js"></script>
    </Layout>
  );
});

// ログ詳細ページ
frontend.get("/detail/:ashiotoId", async (c) => {
  const ashiotoId = c.req.param("ashiotoId");
  return c.html(
    <Layout title={`ログ詳細 - あしおと`}>
      <div id="detail-app" data-ashioto-id={ashiotoId}>
        <header class="page-header">
          <a href="/" class="back-button">
            ← もどる
          </a>
          <h1>ログ詳細</h1>
        </header>
        <div class="page-content">
          <div id="loginSection">
            <LoginPrompt />
          </div>
          <div id="userSection" style="display: none;">
            <div id="postDetail" class="post-detail-container"></div>
          </div>
        </div>
      </div>
      <script src="/static/detail.js"></script>
    </Layout>
  );
});

export default frontend;
