"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUserRoutes = createUserRoutes;
const express_1 = __importDefault(require("express"));
const UserProfileService_1 = require("../services/user/UserProfileService");
const UsernameService_1 = require("../services/user/UsernameService");
function createUserRoutes(db) {
    const router = express_1.default.Router();
    const userProfileService = new UserProfileService_1.UserProfileService(db);
    const usernameService = new UsernameService_1.UsernameService(db);
    router.get('/profile', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const profile = await userProfileService.getUserProfile(userId);
            if (!profile)
                return res.status(404).json({ error: 'Profile not found' });
            res.json({ profile });
        }
        catch (error) {
            console.error('Error fetching profile:', error);
            res.status(500).json({ error: 'Failed to fetch profile' });
        }
    });
    router.put('/profile', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const { display_name, avatar_url } = req.body;
            const profile = await userProfileService.upsertUserProfile(userId, { display_name, avatar_url });
            res.json({ success: true, profile });
        }
        catch (error) {
            console.error('Error updating profile:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    });
    router.get('/username/available', async (req, res) => {
        try {
            const { username } = req.query;
            if (!username || typeof username !== 'string') {
                return res.status(400).json({ error: 'Username is required' });
            }
            const validation = await usernameService.validateUsername(username);
            res.json({ available: validation.valid, error: validation.error });
        }
        catch (error) {
            console.error('Error checking username availability:', error);
            res.status(500).json({ error: 'Failed to check availability' });
        }
    });
    router.post('/username/change', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const { username } = req.body;
            if (!username)
                return res.status(400).json({ error: 'Username is required' });
            const result = await usernameService.changeUsername(userId, username, false, req.ip, req.get('user-agent'));
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            res.json({ success: true, username: result.newUsername });
        }
        catch (error) {
            console.error('Error changing username:', error);
            res.status(500).json({ error: 'Failed to change username' });
        }
    });
    router.get('/username/history', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const history = await usernameService.getUsernameHistory(userId);
            res.json({ history });
        }
        catch (error) {
            console.error('Error fetching username history:', error);
            res.status(500).json({ error: 'Failed to fetch history' });
        }
    });
    router.get('/search', async (req, res) => {
        try {
            const { q, limit } = req.query;
            if (!q || typeof q !== 'string') {
                return res.status(400).json({ error: 'Search query is required' });
            }
            const searchLimit = limit ? parseInt(limit) : 20;
            const users = await userProfileService.searchUsers(q, searchLimit);
            res.json({ users });
        }
        catch (error) {
            console.error('Error searching users:', error);
            res.status(500).json({ error: 'Failed to search users' });
        }
    });
    return router;
}
