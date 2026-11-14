const router = require('express').Router();
const mongoose = require('mongoose');
const Queue = require('../models/Queue');
const Token = require('../models/Token');
const auth = require('../middleware/auth');
const { ApiError, asyncHandler, assertObjectId } = require('../utils/http');
const { shapeToken } = require('../utils/shape');

router.use(auth);

// Every queue lookup includes owner, so a manager can never touch someone else's queue.
const loadOwnedQueue = async (id, userId) => {
  assertObjectId(id, 'queue id');
  const queue = await Queue.findOne({ _id: id, owner: userId });
  if (!queue) throw new ApiError(404, 'Queue not found');
  return queue;
};

const emptyCounts = () => ({ waiting: 0, serving: 0, completed: 0, cancelled: 0 });

const countsFor = async (userId, queueIds) => {
  const rows = await Token.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId), queue: { $in: queueIds } } },
    { $group: { _id: { queue: '$queue', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const map = {};
  rows.forEach((r) => {
    const key = String(r._id.queue);
    map[key] = map[key] || emptyCounts();
    map[key][r._id.status] = r.n;
  });
  return map;
};

const shape = (q, counts) => ({
  id: q._id, name: q.name, counter: q.counter, prefix: q.prefix, createdAt: q.createdAt,
  counts: counts || emptyCounts(),
});

// ---- Queues ----
router.get('/', asyncHandler(async (req, res) => {
  const queues = await Queue.find({ owner: req.userId }).sort({ createdAt: -1 });
  const counts = await countsFor(req.userId, queues.map((q) => q._id));
  res.json({ queues: queues.map((q) => shape(q, counts[String(q._id)])) });
}));

router.post('/', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new ApiError(400, 'Queue name is required');
  const counter = String(req.body.counter || '').trim() || 'Counter 1';
  const prefix = (String(req.body.prefix || '').trim() || name[0] || 'A').slice(0, 3).toUpperCase();
  const queue = await Queue.create({ owner: req.userId, name, counter, prefix });
  res.status(201).json({ queue: shape(queue) });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const queue = await loadOwnedQueue(req.params.id, req.userId);
  const counts = await countsFor(req.userId, [queue._id]);
  res.json({ queue: shape(queue, counts[String(queue._id)]) });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const queue = await loadOwnedQueue(req.params.id, req.userId);
  if (req.body.name !== undefined) {
    const name = String(req.body.name).trim();
    if (!name) throw new ApiError(400, 'Queue name is required');
    queue.name = name;
  }
  if (req.body.counter !== undefined) queue.counter = String(req.body.counter).trim() || queue.counter;
  await queue.save();
  res.json({ queue: shape(queue) });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const queue = await loadOwnedQueue(req.params.id, req.userId);
  await Token.deleteMany({ queue: queue._id });
  await queue.deleteOne();
  res.json({ message: 'Queue deleted' });
}));

// ---- Tokens inside a queue ----
router.get('/:id/tokens', asyncHandler(async (req, res) => {
  const queue = await loadOwnedQueue(req.params.id, req.userId);
  const wanted = String(req.query.status || 'waiting,serving').split(',').filter(Boolean);
  const tokens = await Token.find({ queue: queue._id, status: { $in: wanted } }).sort({ order: 1 });
  let pos = 0;
  res.json({ tokens: tokens.map((t) => shapeToken(t, t.status === 'waiting' ? ++pos : null)) });
}));

router.post('/:id/tokens', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) throw new ApiError(400, "Enter the person's name");
  if (name.length > 80) throw new ApiError(400, 'Name is too long (max 80 characters)');
  assertObjectId(req.params.id, 'queue id');
  // Atomic increment guarantees a unique number even with simultaneous requests.
  const queue = await Queue.findOneAndUpdate(
    { _id: req.params.id, owner: req.userId }, { $inc: { lastNumber: 1 } }, { new: true }
  );
  if (!queue) throw new ApiError(404, 'Queue not found');
  const token = await Token.create({
    queue: queue._id, owner: req.userId, number: queue.lastNumber,
    code: `${queue.prefix}-${String(queue.lastNumber).padStart(3, '0')}`,
    name, order: queue.lastNumber,
  });
  const position = await Token.countDocuments({ queue: queue._id, status: 'waiting', order: { $lte: token.order } });
  res.status(201).json({ token: shapeToken(token, position) });
}));

router.post('/:id/call-next', asyncHandler(async (req, res) => {
  const queue = await loadOwnedQueue(req.params.id, req.userId);
  const now = new Date();
  // Single atomic update: two clicks at once can never pick the same token.
  const token = await Token.findOneAndUpdate(
    { queue: queue._id, status: 'waiting' },
    { $set: { status: 'serving', calledAt: now, leftWaitingAt: now, counter: queue.counter } },
    { sort: { order: 1 }, new: true }
  );
  if (!token) throw new ApiError(409, 'No one is waiting in this queue');
  res.json({ token: shapeToken(token) });
}));

module.exports = router;
