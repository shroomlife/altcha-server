# 🔒 ALTCHA Server

A secure, production-ready ALTCHA (proof-of-work CAPTCHA) server built with Bun and Elysia.

## ✨ Features

- ✅ **Type-Safe**: Full TypeScript support with runtime validation
- 🐳 **Docker Ready**: Optimized Docker image included
- 🔒 **Secure**: Security headers, CORS, non-root user
- ⚡ **Fast**: Built on Bun runtime
- 📊 **Health Checks**: Built-in monitoring

## 🚀 Quick Start

### Installation

```bash
bun install
```

### Configuration

```bash
# Copy environment template
cp .env.example .env

# Generate a secure secret key
openssl rand -hex 32

# Add your secret to .env
```

Required environment variables:
- `ALTCHA_HMAC_KEY` - Your secret key (min. 32 characters)

### Run Locally

```bash
# Development (with hot reload)
bun run dev

# Production
bun run start
```

Server runs at **http://localhost:8080**

## 🐳 Docker

### Quick Start

```bash
# Build image
docker build -t altcha-server .

# Run container
docker run -p 8080:8080 -e ALTCHA_HMAC_KEY="your-secret-key" altcha-server
```

### Using docker-compose.yml

```yaml
version: '3.8'
services:
  altcha:
    build: .
    ports:
      - "8080:8080"
    environment:
      ALTCHA_HMAC_KEY: ${ALTCHA_HMAC_KEY}
      PORT: 8080
      CORS_ORIGIN: "*"
    restart: unless-stopped
```

Then run:
```bash
docker-compose up -d
```

### Scripts

```bash
bun run docker:build  # Build Docker image
bun run docker:run    # Run with .env file
```

## 📡 API Endpoints

### Health Check
```http
GET /health
```

### Create Challenge
```http
POST /api/challenge
```

Returns challenge data for client to solve.

### Verify Solution
```http
POST /api/verify
Content-Type: application/json

{
  "payload": "base64-encoded-solution"
}
```

Returns `{"verified": true}` or `{"verified": false, "error": "..."}`.

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ALTCHA_HMAC_KEY` | **Required** | HMAC secret key |
| `PORT` | `8080` | Server port |
| `ALTCHA_MAX_NUMBER` | `100000` | Max number for PoW |
| `ALTCHA_SALT_LENGTH` | `12` | Salt length |
| `ALTCHA_EXPIRES_MINUTES` | `5` | Challenge expiration |
| `CORS_ORIGIN` | `*` | CORS allowed origins |

## 🧪 Client Example

```html
<script type="module">
  import { solve } from 'altcha';

  async function verify() {
    // 1. Get challenge
    const challenge = await fetch('http://localhost:8080/api/challenge')
      .then(r => r.json());

    // 2. Solve challenge
    const solution = await solve(challenge);

    // 3. Verify solution
    const result = await fetch('http://localhost:8080/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: solution })
    }).then(r => r.json());

    console.log('Verified:', result.verified);
  }
</script>
```

## 🔐 Security Tips

1. **Generate strong secret:**
   ```bash
   openssl rand -hex 32
   ```

2. **Use HTTPS in production** (nginx/Caddy reverse proxy)

3. **Restrict CORS:**
   ```bash
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **Keep updated:**
   ```bash
   bun update
   ```

## 📦 Deploy to Docker Hub

```bash
# Tag image
docker tag altcha-server yourusername/altcha-server:latest

# Push
docker push yourusername/altcha-server:latest

# Use anywhere
docker run -p 8080:8080 -e ALTCHA_HMAC_KEY="secret" yourusername/altcha-server:latest
```

## 📄 License

MIT

---

**Made with ❤️ using [Bun](https://bun.sh), [Elysia](https://elysiajs.com), and [ALTCHA](https://altcha.org)**