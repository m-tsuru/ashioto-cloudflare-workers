import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'
import { jwt, sign, verify } from 'hono/jwt'
import { eq, and, gte, lte, sql, inArray, desc } from 'drizzle-orm'
import { ashioto, landmarks, users, tracks } from '../db/schema'
import { createDb } from '../db/db'
import 'dotenv/config';

// 型定義
interface SpotifyTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyUserData {
  id: string;
  display_name: string;
  images?: Array<{ url: string }>;
}

interface CloudflareBindings {
  DB: unknown; // D1Database
  JWT_SECRET: string;
}

const api = new Hono<{ Bindings: CloudflareBindings }>()

const redirect_uri_path = `${process.env.SPOTIFY_REDIRECT_URI_PATH}`
const client_id = process.env.SPOTIFY_CLIENT_ID ?? ''
const client_secret = process.env.SPOTIFY_CLIENT_SECRET ?? ''
const scope = process.env.SPOTIFY_SCOPE ?? ''
const state = process.env.SPOTIFY_REDIRECT_STATE ?? ''

const jwtAuth = async (c, next) => {
  const sessionToken = getCookie(c, 'session')
  const jwtSecret = c.env.JWT_SECRET || 'fallback-secret'

  if (!sessionToken) {
    return c.json({ error: 'Unauthorized' }, 403)
  }

  try {
    const payload = await verify(sessionToken, jwtSecret)
    if (!payload || !payload.spotifyId) {
      return c.json({ error: 'Unauthorized' }, 403)
    }
    // 認証OKなら次へ
    c.set('jwtPayload', payload)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 403)
  }
}

api.get('/auth', (c) => {
const url = new URL(c.req.url);
  const domain = url.origin;
  const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${client_id}&redirect_uri=${domain}${redirect_uri_path}&scope=${scope}&state=${state}`
  return c.redirect(authUrl)
})

api.get('/auth/callback', async (c) => {
  try {
    const code = c.req.query('code')
    const state_param = c.req.query('state')

    if (!code) {
      return c.json({ error: 'Authorization code not found' }, 400)
    }

    if (state_param !== state) {
      return c.json({ error: 'Invalid state parameter' }, 400)
    }

    // Access tokenを取得
    const url = new URL(c.req.url)
    const domain = url.origin
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${client_id}:${client_secret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: `${domain}${redirect_uri_path}`
      })
    })

    if (!tokenResponse.ok) {
      return c.json({ error: 'Failed to get access token' }, 400)
    }

    const tokenData = await tokenResponse.json() as SpotifyTokenResponse
    const { access_token, refresh_token } = tokenData

    // ユーザー情報を取得
    const userResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    })

    if (!userResponse.ok) {
      return c.json({ error: 'Failed to get user info' }, 400)
    }

    const userData = await userResponse.json() as SpotifyUserData

    // データベース接続
    const db = createDb(c.env.DB)

    // ユーザーがすでに登録されているかチェック
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.spotifyId, userData.id))
      .get()

    if (!existingUser) {
      // 新規ユーザーをデータベースに追加
      await db.insert(users).values({
        spotifyId: userData.id,
        displayName: userData.display_name || userData.id,
        profileImageUrl: userData.images?.[0]?.url || null,
        refreshToken: refresh_token
      })
    } else {
      // 既存ユーザーのリフレッシュトークンを更新
      await db
        .update(users)
        .set({
          refreshToken: refresh_token,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.spotifyId, userData.id))
    }

    // JWTトークンを生成
    const payload = {
      spotifyId: userData.id,
      displayName: userData.display_name || userData.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7日間有効
    }

    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret'
    const token = await sign(payload, jwtSecret)

    // セッションCookieを設定
    setCookie(c, 'session', token, {
      httpOnly: true,
      secure: false, // 開発環境ではfalse
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: '/'
    })

    // 認証成功後、フロントエンドページにリダイレクト
    return c.redirect('/')

  } catch (error) {
    console.error('Authentication error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

api.get('/auth/me', jwtAuth, async (c) => {
  try {
    const user = c.get('jwtPayload') as any
    const db = createDb(c.env.DB)

    const userRecord = await db
      .select({
        spotifyId: users.spotifyId,
        displayName: users.displayName,
        avatarUrl: users.profileImageUrl,
      })
      .from(users)
      .where(eq(users.spotifyId, user.spotifyId))
      .get()

    if (!userRecord) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json(userRecord)

  } catch (error) {
    console.error('User fetch error:', error)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

api.get('/auth/avatar', async (c) => {
  try {
    // Cookieからセッショントークンを取得
    const sessionToken = getCookie(c, 'session')

    if (!sessionToken) {
      return c.json({ error: 'No session found' }, 401)
    }

    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret'

    // JWTトークンを検証してペイロードを取得
    const payload = await verify(sessionToken, jwtSecret)

    if (!payload || !payload.spotifyId) {
      return c.json({ error: 'Invalid session token' }, 401)
    }

    // データベースからユーザーのアバター画像URLを取得
    const db = createDb(c.env.DB)
    const user = await db
      .select({
        profileImageUrl: users.profileImageUrl
      })
      .from(users)
      .where(eq(users.spotifyId, payload.spotifyId as string))
      .get()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    if (!user.profileImageUrl) {
      return c.json({ error: 'No avatar image available' }, 404)
    }

    // アバター画像のURLにリダイレクト
    return c.redirect(user.profileImageUrl)

  } catch (error) {
    console.error('Auth avatar error:', error)
    if (error instanceof Error && error.message.includes('JWT')) {
      return c.json({ error: 'Invalid or expired session' }, 401)
    }
    return c.json({ error: 'Failed to get avatar' }, 500)
  }
})

api.get('/spotify/refresh', async (c) => {
  try {
    // Cookieからセッショントークンを取得
    const sessionToken = getCookie(c, 'session')

    if (!sessionToken) {
      return c.json({ error: 'No session found' }, 401)
    }

    const jwtSecret = c.env.JWT_SECRET || 'fallback-secret'

    // JWTトークンを検証してペイロードを取得
    const payload = await verify(sessionToken, jwtSecret)

    if (!payload || !payload.spotifyId) {
      return c.json({ error: 'Invalid session token' }, 401)
    }

    // データベースからユーザーのリフレッシュトークンを取得
    const db = createDb(c.env.DB)
    const user = await db
      .select({
        refreshToken: users.refreshToken
      })
      .from(users)
      .where(eq(users.spotifyId, payload.spotifyId as string))
      .get()

    if (!user || !user.refreshToken) {
      return c.json({ error: 'No refresh token available' }, 404)
    }

    // Spotifyのトークンリフレッシュエンドポイントを呼び出し
    const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${client_id}:${client_secret}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: user.refreshToken
      })
    })

    if (!refreshResponse.ok) {
      return c.json({ error: 'Failed to refresh token' }, 400)
    }

    const refreshData = await refreshResponse.json() as SpotifyTokenResponse

    // 新しいリフレッシュトークンがある場合は更新
    if (refreshData.refresh_token) {
      await db
        .update(users)
        .set({
          refreshToken: refreshData.refresh_token,
          updatedAt: new Date().toISOString()
        })
        .where(eq(users.spotifyId, payload.spotifyId as string))
    }

    return c.json({
      access_token: refreshData.access_token,
      token_type: refreshData.token_type,
      expires_in: refreshData.expires_in
    })

  } catch (error) {
    console.error('Spotify refresh error:', error)
    if (error instanceof Error && error.message.includes('JWT')) {
      return c.json({ error: 'Invalid or expired session' }, 401)
    }
    return c.json({ error: 'Failed to refresh Spotify token' }, 500)
  }
})

api.get('/location/search', jwtAuth, async (c) => {
  const lat = c.req.query('lat')
  const lon = c.req.query('lon')
  // const query = c.req.query('query') || 'レストラン'
  const dist = c.req.query('dist') || '1'           // 指定がない場合は半径1kmを検索

  // 2. 緯度・経度が指定されているかバリデーション
  if (!lat || !lon) {
    return c.json({ error: 'Required Parameters `lon` and `lat`' }, 400)
  }

  const YAHOO_APP_ID = process.env.YOLP_ID
  if (!YAHOO_APP_ID) {
    console.error('Unsetted Environment Variable: `YAHOO_APP_ID` ')
    return c.json({ error: 'Server configuration error.' }, 500)
  }

  const params = new URLSearchParams({
    appid: YAHOO_APP_ID,
    lat: lat,
    lon: lon,
    dist: dist,
    // query: query,
    output: 'json', // レスポンスをJSON形式で受け取る
    sort: 'geo',     // 距離が近い順でソートする
    results: '3'    // 最大3件取得する
  })
  const url = `https://map.yahooapis.jp/search/local/V1/localSearch?${params.toString()}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`APIリクエストに失敗しました: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as { Feature?: any[] }

    const features = data.Feature || []
    const results = features.map((item: any) => {
      // 座標は "経度,緯度" の文字列で返ってくるため分割する
      const [itemLon, itemLat] = item.Geometry.Coordinates.split(',')

      return {
        gid: item.Gid,
        name: item.Name,
        // address: item.Property.Address,
        // yomi: item.Property.Yomi,
        // tel: item.Property.Tel1,
       genre: item.Property.Genre?.map((g: any) => g.Name) || [],
        geo: {
          lat: parseFloat(itemLat),
          lon: parseFloat(itemLon),
        },
      }
    })

    // 7. 整形したデータをクライアントに返す
    return c.json(results)

  } catch (error) {
    console.error('Unexpected Error when fetching API:', error)
    return c.json({ error: 'Failed to retrieve data.' }, 502) // 502 Bad Gateway
  }
})

api.get('/ashioto', jwtAuth, async (c) => {
    const db = createDb(c.env.DB)

    // lat/lon/radius形式のクエリパラメータをチェック
    const lat = Number(c.req.query('lat'))
    const lon = Number(c.req.query('lon'))
    const radius = Number(c.req.query('radius')) || 1000 // デフォルト1km

    if (!isNaN(lat) && !isNaN(lon)) {
        // 緯度・経度から範囲を計算（簡易的な実装）
        const latDelta = radius / 111000 // 1度≈111km
        const lonDelta = radius / (111000 * Math.cos(lat * Math.PI / 180))

        const lat0 = lat - latDelta
        const lat1 = lat + latDelta
        const lon0 = lon - lonDelta
        const lon1 = lon + lonDelta

        // 指定範囲内で各ランドマークの最新投稿のIDを取得
        const latestAshiotoIds = await db
        .select({
            id: ashioto.id,
            landmarkId: ashioto.landmarkId,
            maxTimestamp: sql`MAX(${ashioto.timestamp})`.as('maxTimestamp')
        })
        .from(ashioto)
        .innerJoin(landmarks, eq(ashioto.landmarkId, landmarks.id))
        .where(
            and(
                gte(landmarks.latitude, lat0),
                lte(landmarks.latitude, lat1),
                gte(landmarks.longitude, lon0),
                lte(landmarks.longitude, lon1)
            )
        )
        .groupBy(ashioto.landmarkId)
        .having(sql`${ashioto.timestamp} = MAX(${ashioto.timestamp})`);

        // そのIDで実際の投稿データを取得
        const nearbyPosts = await db
        .select({
            id: ashioto.id,
            userId: ashioto.userId,
            userName: users.displayName,
            userAvatar: users.profileImageUrl,
            spotifyTrackId: tracks.spotifyTrackId,
            trackName: tracks.trackName,
            artistName: tracks.artistName,
            albumName: tracks.albumName,
            albumCover: tracks.albumImageUrl,
            comment: ashioto.comment,
            createdAt: ashioto.timestamp,
            latitude: landmarks.latitude,
            longitude: landmarks.longitude,
            locationName: landmarks.name,
        })
        .from(ashioto)
        .leftJoin(users, eq(ashioto.userId, users.spotifyId))
        .leftJoin(tracks, eq(ashioto.trackId, tracks.spotifyTrackId))
        .leftJoin(landmarks, eq(ashioto.landmarkId, landmarks.id))
        .where(
            inArray(ashioto.id, latestAshiotoIds.map(row => row.id))
        )
        .orderBy(desc(ashioto.timestamp));

        console.log(`Found ${nearbyPosts.length} latest posts per landmark in area`);
        return c.json(nearbyPosts)
    }

    // 元の緯度・経度範囲指定方式
    const lat0 = Number(c.req.query('lat0'))
    const lon0 = Number(c.req.query('lon0'))
    const lat1 = Number(c.req.query('lat1'))
    const lon1 = Number(c.req.query('lon1'))

    const latestAshiotoIds = await db
    .select({ id: ashioto.id })
    .from(ashioto)
    .innerJoin(landmarks, eq(ashioto.landmarkId, landmarks.id))
    .where(
        and(
        gte(landmarks.latitude, lat0),
        lte(landmarks.latitude, lat1),
        gte(landmarks.longitude, lon0),
        lte(landmarks.longitude, lon1)
        )
    )
    .groupBy(ashioto.landmarkId)
    .having(sql`timestamp = MAX(timestamp)`);

    // そのIDで ashioto レコードを取得
    const latestAshiotoRecords = await db
    .select({
        id: ashioto.id,
        userId: ashioto.userId,
        userName: users.displayName,
        userAvatar: users.profileImageUrl,
        spotifyTrackId: tracks.spotifyTrackId,
        trackName: tracks.trackName,
        artistName: tracks.artistName,
        albumName: tracks.albumName,
        albumCover: tracks.albumImageUrl,
        comment: ashioto.comment,
        createdAt: ashioto.timestamp,
        latitude: landmarks.latitude,
        longitude: landmarks.longitude,
        locationName: landmarks.name,
    })
    .from(ashioto)
    .leftJoin(users, eq(ashioto.userId, users.spotifyId))
    .leftJoin(tracks, eq(ashioto.trackId, tracks.spotifyTrackId))
    .leftJoin(landmarks, eq(ashioto.landmarkId, landmarks.id))
    .where(
        inArray(ashioto.id, latestAshiotoIds.map(row => row.id))
    );

    return c.json(latestAshiotoRecords)
})

// 現在再生中の曲を取得
api.get('/spotify/current-track', jwtAuth, async (c) => {
    const user = c.get('jwtPayload') as any
    const db = createDb(c.env.DB)

    // ユーザーのSpotifyトークンを取得（refreshTokenを使用）
    const userRecord = await db.select().from(users).where(eq(users.spotifyId, user.spotifyId)).limit(1)

    if (!userRecord.length) {
        return c.json({ error: 'User not found' }, 404)
    }

    const { refreshToken } = userRecord[0]

    if (!refreshToken) {
        return c.json({ error: 'No refresh token available' }, 400)
    }

    // アクセストークンを更新
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${client_id}:${client_secret}`)}`
        },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        }),
    })

    if (!tokenResponse.ok) {
        return c.json({ error: 'Failed to refresh token' }, 400)
    }

    const tokenData = await tokenResponse.json() as SpotifyTokenResponse

    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
            },
        })

        if (response.status === 204) {
            return c.json({ error: 'No track currently playing' }, 404)
        }

        if (!response.ok) {
            return c.json({ error: 'Failed to get current track' }, 400)
        }

        const data = await response.json()

        if (!data.item) {
            return c.json({ error: 'No track currently playing' }, 404)
        }

        const track = {
            id: data.item.id,
            name: data.item.name,
            artists: data.item.artists.map((artist: any) => artist.name),
            album: data.item.album.name,
            albumCover: data.item.album.images[0]?.url || null,
        }

        return c.json(track)
    } catch (error) {
        console.error('Current track error:', error)
        return c.json({ error: 'Failed to get current track' }, 500)
    }
})

// ログアウト
api.post('/auth/logout', async (c) => {
    setCookie(c, 'session', '', {
        maxAge: 0,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict',
    })

    return c.json({ message: 'Logged out successfully' })
})

api.post('/ashioto', jwtAuth, async (c) => {
    const user = c.get('jwtPayload') as any
    const db = createDb(c.env.DB)

    try {
        const body = await c.req.json()
        const {
            spotifyTrackId,
            trackName,
            artistName,
            albumName,
            albumCover,
            landmarkGid, // 外部APIのgid
            landmarkName, // 選択された場所の名前
            landmarkLat,  // 選択された場所の緯度
            landmarkLon,  // 選択された場所の経度
            comment
        } = body

        // 必須フィールドの検証
        if (!spotifyTrackId || !trackName || !artistName || !landmarkGid || !landmarkName || landmarkLat == null || landmarkLon == null) {
            return c.json({ error: 'Missing required fields' }, 400)
        }

        // まずトラック情報を保存（存在確認してから挿入）
        const existingTrack = await db.select().from(tracks).where(eq(tracks.spotifyTrackId, spotifyTrackId)).limit(1)

        if (existingTrack.length === 0) {
            await db.insert(tracks).values({
                spotifyTrackId,
                trackName,
                artistName,
                albumName: albumName || '',
                albumImageUrl: albumCover || '',
            })
        }

        // ランドマークを作成または取得（名前と座標で重複チェック）
        const existingLandmark = await db.select()
            .from(landmarks)
            .where(
                and(
                    eq(landmarks.name, landmarkName),
                    eq(landmarks.latitude, parseFloat(landmarkLat)),
                    eq(landmarks.longitude, parseFloat(landmarkLon))
                )
            )
            .get()

        let internalLandmarkId: number;

        if (existingLandmark) {
            internalLandmarkId = existingLandmark.id;
        } else {
            // 新しいランドマークを作成
            const newLandmark = await db.insert(landmarks).values({
                name: landmarkName,
                latitude: parseFloat(landmarkLat),
                longitude: parseFloat(landmarkLon),
                type: 'user_selected'
            }).returning()

            internalLandmarkId = newLandmark[0].id;
        }

        // ashioto投稿を作成
        const newPost = await db.insert(ashioto).values({
            userId: user.spotifyId,
            trackId: spotifyTrackId,
            landmarkId: internalLandmarkId,
            timestamp: new Date().toISOString(),
            comment: comment || null,
            isPublic: true,
        }).returning()

        return c.json({ success: true, postId: newPost[0].id })

    } catch (error) {
        console.error('Post creation error:', error)
        return c.json({ error: 'Failed to create post' }, 500)
    }
})

// ユーザーの足跡（投稿履歴）を取得
api.get('/user/:userId/footprints', jwtAuth, async (c) => {
    const targetUserId = c.req.param('userId')
    const db = createDb(c.env.DB)

    try {
        const userFootprints = await db
        .select({
            id: ashioto.id,
            userId: ashioto.userId,
            userName: users.displayName,
            userAvatar: users.profileImageUrl,
            spotifyTrackId: tracks.spotifyTrackId,
            trackName: tracks.trackName,
            artistName: tracks.artistName,
            albumName: tracks.albumName,
            albumCover: tracks.albumImageUrl,
            comment: ashioto.comment,
            createdAt: ashioto.timestamp,
            latitude: landmarks.latitude,
            longitude: landmarks.longitude,
            locationName: landmarks.name,
        })
        .from(ashioto)
        .leftJoin(users, eq(ashioto.userId, users.spotifyId))
        .leftJoin(tracks, eq(ashioto.trackId, tracks.spotifyTrackId))
        .leftJoin(landmarks, eq(ashioto.landmarkId, landmarks.id))
        .where(eq(ashioto.userId, targetUserId))
        .orderBy(desc(ashioto.timestamp))
        .limit(50);

        return c.json(userFootprints)
    } catch (error) {
        console.error('Footprints fetch error:', error)
        return c.json({ error: 'Failed to fetch footprints' }, 500)
    }
})

// 自分の足跡（投稿履歴）を取得
api.get('/my-footprints', jwtAuth, async (c) => {
    const user = c.get('jwtPayload') as any
    const db = createDb(c.env.DB)

    try {
        const userFootprints = await db
        .select({
            id: ashioto.id,
            userId: ashioto.userId,
            userName: users.displayName,
            userAvatar: users.profileImageUrl,
            spotifyTrackId: tracks.spotifyTrackId,
            trackName: tracks.trackName,
            artistName: tracks.artistName,
            albumName: tracks.albumName,
            albumCover: tracks.albumImageUrl,
            comment: ashioto.comment,
            createdAt: ashioto.timestamp,
            latitude: landmarks.latitude,
            longitude: landmarks.longitude,
            locationName: landmarks.name,
        })
        .from(ashioto)
        .leftJoin(users, eq(ashioto.userId, users.spotifyId))
        .leftJoin(tracks, eq(ashioto.trackId, tracks.spotifyTrackId))
        .leftJoin(landmarks, eq(ashioto.landmarkId, landmarks.id))
        .where(eq(ashioto.userId, user.spotifyId))
        .orderBy(desc(ashioto.timestamp))
        .limit(100);

        return c.json(userFootprints)
    } catch (error) {
        console.error('My footprints fetch error:', error)
        return c.json({ error: 'Failed to fetch my footprints' }, 500)
    }
})

// ユーザー情報を取得
api.get('/user/:userId', jwtAuth, async (c) => {
    const targetUserId = c.req.param('userId')
    const db = createDb(c.env.DB)

    try {
        const userInfo = await db
        .select({
            spotifyId: users.spotifyId,
            displayName: users.displayName,
            avatarUrl: users.profileImageUrl,
            createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.spotifyId, targetUserId))
        .get()

        if (!userInfo) {
            return c.json({ error: 'User not found' }, 404)
        }

        // 投稿数を取得
        const postCount = await db
        .select({ count: sql`COUNT(*)` })
        .from(ashioto)
        .where(eq(ashioto.userId, targetUserId))
        .get()

        return c.json({
            ...userInfo,
            postCount: postCount?.count || 0
        })
    } catch (error) {
        console.error('User info fetch error:', error)
        return c.json({ error: 'Failed to fetch user info' }, 500)
    }
})

export default api
