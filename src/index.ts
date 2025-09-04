import { Hono } from 'hono'
import { cors } from 'hono/cors'
import api from './lib/api'
import frontend from './lib/frontend'

const app = new Hono()

app.use(
    '/*',
    cors({
        origin: [
            'https://ashioto.sasakulab.com',
            'http://localhost:5173',
            'http://localhost:3000',
        ],
    })
)

app.route('/api', api)
app.route('/', frontend)

export default app
