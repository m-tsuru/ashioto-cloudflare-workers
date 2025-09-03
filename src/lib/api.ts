import { Hono } from 'hono'
import { setCookie, getCookie } from 'hono/cookie'
import { jwt, sign, verify } from 'hono/jwt'
import { eq, and, gte, lte, sql, inArray } from 'drizzle-orm'
import { ashioto, landmarks, users } from '../db/schema'
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
    c.set('user', payload)
    await next()
  } catch {
    return c.json({ error: 'Unauthorized' }, 403)
  }
}

api.get('/auth/login', (c) => {
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
      secure: true,
      sameSite: 'Lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: '/'
    })

    return c.json({
      message: 'Authentication successful',
      user: {
        spotifyId: userData.id,
        displayName: userData.display_name || userData.id,
        profileImageUrl: userData.images?.[0]?.url || null
      }
    })

  } catch (error) {
    console.error('Authentication error:', error)
    return c.json({ error: 'Authentication failed' }, 500)
  }
})

api.get('/auth/me', jwtAuth, async (c) => {
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

    // データベースから最新のユーザー情報を取得
    const db = createDb(c.env.DB)
    const user = await db
      .select({
        spotifyId: users.spotifyId,
        displayName: users.displayName,
        profileImageUrl: users.profileImageUrl,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
      })
      .from(users)
      .where(eq(users.spotifyId, payload.spotifyId as string))
      .get()

    if (!user) {
      return c.json({ error: 'User not found' }, 404)
    }

    return c.json({
      user: {
        spotifyId: user.spotifyId,
        displayName: user.displayName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    })

  } catch (error) {
    console.error('Auth me error:', error)
    // JWTの検証に失敗した場合
    if (error instanceof Error && error.message.includes('JWT')) {
      return c.json({ error: 'Invalid or expired session' }, 401)
    }
    return c.json({ error: 'Authentication failed' }, 500)
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
    return c.json({ error: '緯度(lat)と経度(lon)は必須です。' }, 400)
  }

  const YAHOO_APP_ID = process.env.YOLP_ID
  if (!YAHOO_APP_ID) {
    console.error('環境変数 YAHOO_APP_ID が設定されていません。')
    return c.json({ error: 'サーバーの設定エラーです。' }, 500)
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
    console.error('APIリクエスト中にエラーが発生しました:', error)
    return c.json({ error: 'データの取得に失敗しました。' }, 502) // 502 Bad Gateway
  }
})

api.get('/ashioto/', jwtAuth, async (c) => {
    const db = createDb(c.env.DB)

    // 緯度・経度範囲に存在する `ashioto` データを取得する
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
    .select()
    .from(ashioto)
    .where(
        inArray(ashioto.id, latestAshiotoIds.map(row => row.id))
    );

    return c.json(latestAshiotoRecords)
})

api.post('/ashioto/', jwtAuth, async (c) => {

})

export default api
