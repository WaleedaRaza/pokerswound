"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const pg_1 = require("pg");
const environment_1 = require("./config/environment");
const auth_1 = require("./routes/auth");
const auth_middleware_1 = require("./middleware/auth-middleware");
const auth_service_1 = require("./services/auth/auth-service");
console.log('🚀 Starting Poker Engine with Authentication...');
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use((0, cors_1.default)({
    origin: environment_1.config.CORS_ORIGIN,
    credentials: environment_1.config.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((0, cookie_parser_1.default)());
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});
pool.connect()
    .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
})
    .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
});
const authService = new auth_service_1.AuthService(pool);
const authMiddleware = new auth_middleware_1.AuthMiddleware(authService);
app.use('/auth', (0, auth_1.createAuthRoutes)(pool));
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        features: ['authentication', 'database', 'jwt-tokens']
    });
});
app.get('/protected', authMiddleware.requireAuth, (req, res) => {
    res.json({
        message: 'This is a protected endpoint',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});
app.get('/profile', authMiddleware.requireAuth, (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
});
app.get('/admin', authMiddleware.requireAuth, authMiddleware.requireAdmin, (req, res) => {
    res.json({
        message: 'Admin access granted',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});
app.get('/test-auth', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Authentication Test</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .form-group { margin: 15px 0; }
            input, button { padding: 10px; margin: 5px; }
            button { background: #007bff; color: white; border: none; cursor: pointer; }
            button:hover { background: #0056b3; }
            .response { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 5px; }
            .error { background: #f8d7da; color: #721c24; }
            .success { background: #d4edda; color: #155724; }
        </style>
    </head>
    <body>
        <h1>🔐 Authentication Test</h1>
        
        <h2>Register</h2>
        <div class="form-group">
            <input type="email" id="regEmail" placeholder="Email" required>
            <input type="text" id="regUsername" placeholder="Username" required>
            <input type="password" id="regPassword" placeholder="Password" required>
            <input type="text" id="regDisplayName" placeholder="Display Name (optional)">
            <button onclick="register()">Register</button>
        </div>
        
        <h2>Login</h2>
        <div class="form-group">
            <input type="text" id="loginEmailOrUsername" placeholder="Email or Username" required>
            <input type="password" id="loginPassword" placeholder="Password" required>
            <button onclick="login()">Login</button>
        </div>
        
        <h2>Actions</h2>
        <div class="form-group">
            <button onclick="getProfile()">Get Profile</button>
            <button onclick="testProtected()">Test Protected Endpoint</button>
            <button onclick="refreshToken()">Refresh Token</button>
            <button onclick="logout()">Logout</button>
        </div>
        
        <div id="response" class="response"></div>
        
        <script>
            let accessToken = localStorage.getItem('accessToken');
            
            function showResponse(data, isError = false) {
                const responseDiv = document.getElementById('response');
                responseDiv.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                responseDiv.className = 'response ' + (isError ? 'error' : 'success');
            }
            
            async function register() {
                try {
                    const response = await fetch('/auth/register', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: document.getElementById('regEmail').value,
                            username: document.getElementById('regUsername').value,
                            password: document.getElementById('regPassword').value,
                            displayName: document.getElementById('regDisplayName').value
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        accessToken = data.accessToken;
                        localStorage.setItem('accessToken', accessToken);
                    }
                    
                    showResponse(data, !data.success);
                } catch (error) {
                    showResponse({ error: error.message }, true);
                }
            }
            
            async function login() {
                try {
                    const response = await fetch('/auth/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            emailOrUsername: document.getElementById('loginEmailOrUsername').value,
                            password: document.getElementById('loginPassword').value
                        })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        accessToken = data.accessToken;
                        localStorage.setItem('accessToken', accessToken);
                    }
                    
                    showResponse(data, !data.success);
                } catch (error) {
                    showResponse({ error: error.message }, true);
                }
            }
            
            async function getProfile() {
                try {
                    const response = await fetch('/profile', {
                        headers: { 'Authorization': 'Bearer ' + accessToken }
                    });
                    
                    const data = await response.json();
                    showResponse(data, !data.success);
                } catch (error) {
                    showResponse({ error: error.message }, true);
                }
            }
            
            async function testProtected() {
                try {
                    const response = await fetch('/protected', {
                        headers: { 'Authorization': 'Bearer ' + accessToken }
                    });
                    
                    const data = await response.json();
                    showResponse(data, response.status !== 200);
                } catch (error) {
                    showResponse({ error: error.message }, true);
                }
            }
            
            async function refreshToken() {
                try {
                    const response = await fetch('/auth/refresh', {
                        method: 'POST',
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        accessToken = data.accessToken;
                        localStorage.setItem('accessToken', accessToken);
                    }
                    
                    showResponse(data, !data.success);
                } catch (error) {
                    showResponse({ error: error.message }, true);
                }
            }
            
            async function logout() {
                try {
                    const response = await fetch('/auth/logout', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + accessToken },
                        credentials: 'include'
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        accessToken = null;
                        localStorage.removeItem('accessToken');
                    }
                    
                    showResponse(data, !data.success);
                } catch (error) {
                    showResponse({ error: error.message }, true);
                }
            }
        </script>
    </body>
    </html>
  `);
});
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found'
    });
});
const PORT = environment_1.config.PORT;
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🎉 ===============================================');
    console.log('🎉 POKER ENGINE WITH AUTHENTICATION STARTED!');
    console.log('🎉 ===============================================');
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`🔐 Auth Test: http://localhost:${PORT}/test-auth`);
    console.log(`💚 Health: http://localhost:${PORT}/health`);
    console.log('');
    console.log('📋 Available endpoints:');
    console.log('   POST /auth/register - Register new user');
    console.log('   POST /auth/login - Login user');
    console.log('   POST /auth/refresh - Refresh access token');
    console.log('   POST /auth/logout - Logout user');
    console.log('   GET  /auth/me - Get current user info');
    console.log('   GET  /profile - Get user profile (protected)');
    console.log('   GET  /protected - Test protected endpoint');
    console.log('   GET  /admin - Admin only endpoint');
    console.log('');
});
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        pool.end(() => {
            console.log('✅ Database pool closed');
            process.exit(0);
        });
    });
});
process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed successfully');
        pool.end(() => {
            console.log('✅ Database pool closed');
            process.exit(0);
        });
    });
});
exports.default = app;
