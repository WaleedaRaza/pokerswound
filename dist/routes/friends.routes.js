"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFriendRoutes = createFriendRoutes;
const express_1 = __importDefault(require("express"));
const FriendService_1 = require("../services/social/FriendService");
function createFriendRoutes(db) {
    const router = express_1.default.Router();
    const friendService = new FriendService_1.FriendService(db);
    router.get('/', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const friends = await friendService.getFriends(userId);
            res.json({ friends });
        }
        catch (error) {
            console.error('Error fetching friends:', error);
            res.status(500).json({ error: 'Failed to fetch friends' });
        }
    });
    router.get('/requests', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const requests = await friendService.getFriendRequests(userId);
            res.json({ requests });
        }
        catch (error) {
            console.error('Error fetching friend requests:', error);
            res.status(500).json({ error: 'Failed to fetch friend requests' });
        }
    });
    router.post('/request', async (req, res) => {
        try {
            const requesterId = req.user?.id;
            if (!requesterId)
                return res.status(401).json({ error: 'Unauthorized' });
            const { username } = req.body;
            if (!username)
                return res.status(400).json({ error: 'Username is required' });
            const result = await friendService.sendFriendRequest(requesterId, username);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            res.json({ success: true, message: 'Friend request sent' });
        }
        catch (error) {
            console.error('Error sending friend request:', error);
            res.status(500).json({ error: 'Failed to send friend request' });
        }
    });
    router.put('/request/:requestId', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const { requestId } = req.params;
            const { action } = req.body;
            if (!['accepted', 'blocked'].includes(action)) {
                return res.status(400).json({ error: 'Invalid action' });
            }
            const result = await friendService.respondToFriendRequest(requestId, userId, action);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            res.json({ success: true, message: `Friend request ${action}` });
        }
        catch (error) {
            console.error('Error responding to friend request:', error);
            res.status(500).json({ error: 'Failed to process friend request' });
        }
    });
    router.delete('/:friendshipId', async (req, res) => {
        try {
            const userId = req.user?.id;
            if (!userId)
                return res.status(401).json({ error: 'Unauthorized' });
            const { friendshipId } = req.params;
            const result = await friendService.removeFriend(friendshipId, userId);
            if (!result.success) {
                return res.status(400).json({ error: result.error });
            }
            res.json({ success: true, message: 'Friend removed' });
        }
        catch (error) {
            console.error('Error removing friend:', error);
            res.status(500).json({ error: 'Failed to remove friend' });
        }
    });
    return router;
}
