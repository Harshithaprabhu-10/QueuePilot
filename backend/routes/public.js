const router = require('express').Router();
const Queue = require('../models/Queue');
const Token = require('../models/Token');
const { ApiError, asyncHandler, assertObjectId } = require('../utils/http');

const firstName = (n) => String(n).trim().split(/\s+/)[0];

// Public, read-only data for the live display board. Only first names are exposed.
router.get('/queues/:id', asyncHandler(async (req, res) => {
  assertObjectId(req.params.id, 'queue id');
  const queue = await Queue.findById(req.params.id);
  if (!queue) throw new ApiError(404, 'Queue not found');
  const [serving, next, waitingCount] = await Promise.all([
    Token.find({ queue: queue._id, status: 'serving' }).sort({ calledAt: -1 }).limit(3),
    Token.find({ queue: queue._id, status: 'waiting' }).sort({ order: 1 }).limit(5),
    Token.countDocuments({ queue: queue._id, status: 'waiting' }),
  ]);
  res.json({
    queue: { id: queue._id, name: queue.name, counter: queue.counter },
    serving: serving.map((t) => ({ code: t.code, name: firstName(t.name), counter: t.counter || queue.counter })),
    next: next.map((t, i) => ({ code: t.code, name: firstName(t.name), position: i + 1 })),
    waitingCount,
    updatedAt: new Date(),
  });
}));

module.exports = router;
