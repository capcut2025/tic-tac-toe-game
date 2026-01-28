import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  games: defineTable({
    roomCode: v.string(),
    playerX: v.string(), // اسم اللاعب الأول
    playerO: v.optional(v.string()), // اسم اللاعب الثاني
    board: v.array(v.union(v.string(), v.null())), // المصفوفة 3x3
    turn: v.string(), // 'X' أو 'O'
    winner: v.optional(v.string()), // 'X', 'O', 'Draw'
    isFinished: v.boolean(),
  }).index("by_room_code", ["roomCode"]),
});