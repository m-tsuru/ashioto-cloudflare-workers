import { Hono } from 'hono'
import { cors } from 'hono/cors'
import api from './lib/api'
import frontend from './lib/frontend'

const app = new Hono()

app.route('/api', api)
app.route('/', frontend)

export default app
