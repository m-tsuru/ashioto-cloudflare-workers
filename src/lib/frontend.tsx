import { Hono } from 'hono'
import type { FC } from 'hono/jsx'

const frontend = new Hono()

const Layout: FC<{ title: string; children?: any }> = ({ children, title }) => {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
        <link rel="stylesheet" href="/static/styles.css" />
      </head>
      <body>
        {children}
        <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
        <script src="/static/app.js"></script>
      </body>
    </html>
  )
}

const Map: FC<{ lat?: number; lon?: number }> = ({ lat = 35.681236, lon = 139.767125 }) => {
  return (
    <div id="map-container">
      <div id="map"></div>
    </div>
  )
}

const BottomSheet: FC<{ children?: any }> = ({ children }) => {
  return (
    <div class="bottom-sheet" id="bottomSheet">
      <div class="bottom-sheet-handle" id="bottomSheetHandle"></div>
      <div class="bottom-sheet-content">
        {children}
      </div>
    </div>
  )
}

const MusicPost: FC<{ post: any }> = ({ post }) => {
  return (

    <div class="music-post">
      <div class="music-post-header">
        <img src={post.userAvatar || '/static/default-avatar.png'} alt={post.userName} class="user-avatar" />
        <div class="user-info">
          <h4>{post.userName}</h4>
          <span class="post-time">{new Date(post.createdAt).toLocaleString('ja-JP')}</span>
        </div>
      </div>
      <div class="music-info">
        <img src={post.albumCover} alt={post.trackName} class="album-cover" />
        <div class="track-details">
            <h3>

            </h3>
            <p>{post.artistName}</p>
            {post.albumName && <p class="album-name">{post.albumName}</p>}
        </div>
      </div>
      {post.comment && <p class="post-comment">{post.comment}</p>}
      <div class="post-location">
        📍 {post.locationName || `${post.latitude}, ${post.longitude}`}
      </div>
    </div>
  )
}

const LoginPrompt: FC = () => {
  return (
    <div class="login-prompt">
      <h2>ashioto</h2>
      <p>音楽と場所を共有するSNSプラットフォーム</p>
      <a href="/api/auth" class="login-button">
        Spotifyでログイン
      </a>
    </div>
  )
}

const PostForm: FC = () => {
  return (
    <div class="post-form" id="postForm" style="display: none;">
      <h3>🐾あしあとをのこす</h3>
      <form id="musicPostForm">
        <div class="form-group" id="locationSelection" style="display: none;">
          <label>紐づける場所を選択してください</label>
          <div id="nearbyLocations"></div>
        </div>
        <div class="form-group">
          <label>現在再生中の曲を取得</label>
          <button type="button" id="getCurrentTrack">現在の曲を取得</button>
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
          <textarea id="comment" placeholder="この曲についてひとこと..."></textarea>
        </div>
        <button type="submit" id="submitButton" disabled>投稿する</button>
      </form>
    </div>
  )
}

frontend.get('/', async (c) => {
  return c.html(
    <Layout title="Ashioto - 音楽と場所のSNS">
      <div id="app">
        <Map />
        <BottomSheet>
          <div id="loginSection">
            <LoginPrompt />
          </div>
          <div id="userSection" style="display: none;">
            <div class="user-welcome">
              <img id="userAvatar" src="/static/default-avatar.png" alt="User" class="user-avatar" />
              <span id="userWelcome">読み込み中...</span>
              <button id="logoutButton" class="logout-button">ログアウト</button>
            </div>
            <PostForm />
            <div id="nearbyPosts">
              <h3>📍 ちかくのあしあと</h3>
              <div id="postsList"></div>
            </div>
          </div>
        </BottomSheet>

        {/* SpeedDial ボタン */}
        <div class="speed-dial" id="speedDial">
          <div class="speed-dial-actions" id="speedDialActions">
            <button class="speed-dial-action" id="getCurrentLocationButton" title="更新">
              📍
            </button>
            <button class="speed-dial-action" id="createPostButton" title="あしあと">
              🎵
            </button>
          </div>
          <button class="speed-dial-main" id="speedDialMain">
            ➕
          </button>
        </div>
      </div>
    </Layout>
  )
})

export default frontend
