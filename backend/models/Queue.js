const mongoose = require('mongoose');

const queueSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: [true, 'Queue name is required'], trim: true, maxlength: 80 },
    counter: { type: String, trim: true, maxlength: 40, default: 'Counter 1' },
    prefix: { type: String, trim: true, uppercase: true, maxlength: 3, default: 'A' },
    // Incremented atomically ($inc) to hand out unique, sequential token numbers.
    lastNumber: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Queue', queueSchema);
