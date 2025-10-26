"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateJoinRoom = exports.validateCreateRoom = exports.validatePlayerAction = exports.validateCreateGame = exports.JoinRoomSchema = exports.CreateRoomSchema = exports.PlayerActionSchema = exports.CreateGameSchema = void 0;
exports.validateRequest = validateRequest;
const zod_1 = require("zod");
exports.CreateGameSchema = zod_1.z.object({
    small_blind: zod_1.z.number().positive(),
    big_blind: zod_1.z.number().positive(),
    max_players: zod_1.z.number().min(2).max(10),
    roomId: zod_1.z.string().uuid().optional(),
    hostUserId: zod_1.z.string().optional()
});
exports.PlayerActionSchema = zod_1.z.object({
    player_id: zod_1.z.string(),
    action: zod_1.z.enum(['FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN']),
    amount: zod_1.z.number().min(0).optional()
});
exports.CreateRoomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    small_blind: zod_1.z.number().positive(),
    big_blind: zod_1.z.number().positive(),
    min_buy_in: zod_1.z.number().positive(),
    max_buy_in: zod_1.z.number().positive(),
    max_players: zod_1.z.number().min(2).max(10),
    is_private: zod_1.z.boolean().optional(),
    user_id: zod_1.z.string()
});
exports.JoinRoomSchema = zod_1.z.object({
    user_id: zod_1.z.string(),
    seat_index: zod_1.z.number().min(0).max(9),
    buy_in_amount: zod_1.z.number().positive()
});
function validateRequest(schema) {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                const errors = result.error.issues.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({
                    error: 'Validation failed',
                    details: errors
                });
            }
            req.body = result.data;
            next();
        }
        catch (error) {
            console.error('Validation middleware error:', error);
            res.status(500).json({ error: 'Validation failed' });
        }
    };
}
exports.validateCreateGame = validateRequest(exports.CreateGameSchema);
exports.validatePlayerAction = validateRequest(exports.PlayerActionSchema);
exports.validateCreateRoom = validateRequest(exports.CreateRoomSchema);
exports.validateJoinRoom = validateRequest(exports.JoinRoomSchema);
