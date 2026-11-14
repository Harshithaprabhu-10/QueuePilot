const mongoose = require('mongoose');

const STATUSES = ['waiting', 'serving', 'completed', 'cancelled'];

const tokenSchema = new mongoose.Schema(
  {
    queue: { type: mongoose.Schema.Types.ObjectId, ref: 'Queue', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    number: { type: Number, required: true },
    code: { type: String, required: true }, // e.g. A-014
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 80 },
    status: { type: String, enum: STATUSES, default: 'waiting' },
    // Position in the waiting line. Starts equal to number; moving up/down swaps values.
    order: { type: Number, required: true },
    counter: { type: String },
    leftWaitingAt: { type: Date, default: null }, // when it stopped waiting (called or cancelled)
    calledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tokenSchema.index({ queue: 1, number: 1 }, { unique: true });
tokenSchema.index({ queue: 1, status: 1, order: 1 });

const Token = mongoose.model('Token', tokenSchema);
Token.STATUSES = STATUSES;
module.exports = Token;
