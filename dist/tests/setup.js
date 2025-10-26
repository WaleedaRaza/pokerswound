"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testUtils = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.test' });
beforeAll(() => {
    console.log('Setting up test environment...');
});
afterAll(() => {
    console.log('Cleaning up test environment...');
});
exports.testUtils = {};
