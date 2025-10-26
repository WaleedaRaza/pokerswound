"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateUser = authenticateUser;
exports.optionalAuth = optionalAuth;
const supabase_js_1 = require("@supabase/supabase-js");
let supabase = null;
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
}
async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Authentication required',
                message: 'Please provide a valid authorization token'
            });
        }
        const token = authHeader.substring(7);
        if (!supabase) {
            console.error('❌ Supabase client not initialized');
            return res.status(503).json({ error: 'Auth service not available' });
        }
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({
                error: 'Invalid token',
                message: 'Your session has expired. Please sign in again.'
            });
        }
        req.user = user;
        req.userId = user.id;
        next();
    }
    catch (error) {
        console.error('❌ Auth middleware error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
}
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            req.userId = null;
            return next();
        }
        const token = authHeader.substring(7);
        if (!supabase) {
            req.user = null;
            req.userId = null;
            return next();
        }
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) {
            req.user = null;
            req.userId = null;
            return next();
        }
        req.user = user;
        req.userId = user.id;
        next();
    }
    catch (error) {
        console.error('❌ Optional auth error:', error);
        req.user = null;
        req.userId = null;
        next();
    }
}
