const router = require('express').Router();
const Token = require('../models/Token');
const auth = require('../middleware/auth');
const { ApiError, asyncHandler, assertObjectId } = require('../utils/http');
const { shapeToken } = require('../utils/shape');

router.use(auth);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Token history across all of the manager's queues (filter + paginate).
router.get('/history', asyncHandler(async (req, res) => {
  const filter = { owner: req.userId };
  if (req.query.queueId) { assertObjectId(req.query.queueId, 'queue id'); filter.queue = req.query.queueId; }
  if (req.query.status && req.query.status !== 'all') {
    if (!Token.STATUSES.includes(req.query.status)) throw new ApiError(400, 'Invalid status filter');
    filter.status = req.query.status;
  }
  const search = String(req.query.search || '').trim();
  if (search) filter.$or = [{ name: new RegExp(esc(search), 'i') }, { code: new RegExp(esc(search), 'i') }];
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
  const [total, rows] = await Promise.all([
    Token.countDocuments(filter),
    Token.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('queue', 'name'),
  ]);
  const tokens = rows.map((t) => ({ ...shapeToken(t), queue: t.queue ? { id: t.queue._id, name: t.queue.name } : null }));
  res.json({ tokens, page, pages: Math.max(1, Math.ceil(total / limit)), total });
}));

const loadOwnedToken = async (id, userId) => {
  assertObjectId(id, 'token id');
  const token = await Token.findOne({ _id: id, owner: userId });
  if (!token) throw new ApiError(404, 'Token not found');
  return token;
};

// Move a waiting token up or down by swapping its `order` with its neighbour.
router.patch('/:id/move', asyncHandler(async (req, res) => {
  const { direction } = req.body;
  if (!['up', 'down'].includes(direction)) throw new ApiError(400, 'direction must be "up" or "down"');
  const token = await loadOwnedToken(req.params.id, req.userId);
  if (token.status !== 'waiting') throw new ApiError(409, 'Only waiting tokens can be reordered');
  const neighbour = await Token.findOne({
    queue: token.queue, status: 'waiting',
    order: direction === 'up' ? { $lt: token.order } : { $gt: token.order },
  }).sort({ order: direction === 'up' ? -1 : 1 });
  if (!neighbour) throw new ApiError(409, direction === 'up' ? 'Already first in line' : 'Already last in line');
  const a = token.order;
  const b = neighbour.order;
  await Token.bulkWrite([
    { updateOne: { filter: { _id: token._id, status: 'waiting' }, update: { $set: { order: b } } } },
    { updateOne: { filter: { _id: neighbour._id, status: 'waiting' }, update: { $set: { order: a } } } },
  ]);
  res.json({ message: 'Token moved' });
}));

router.patch('/:id/complete', asyncHandler(async (req, res) => {
  await loadOwnedToken(req.params.id, req.userId);
  const token = await Token.findOneAndUpdate(
    { _id: req.params.id, owner: req.userId, status: 'serving' },
    { $set: { status: 'completed', completedAt: new Date() } }, { new: true }
  );
  if (!token) throw new ApiError(409, 'Only tokens that are being served can be completed');
  res.json({ token: shapeToken(token) });
}));

router.patch('/:id/cancel', asyncHandler(async (req, res) => {
  const existing = await loadOwnedToken(req.params.id, req.userId);
  if (!['waiting', 'serving'].includes(existing.status)) throw new ApiError(409, `Token is already ${existing.status}`);
  const now = new Date();
  const set = { status: 'cancelled', cancelledAt: now };
  if (existing.status === 'waiting') set.leftWaitingAt = now;
  const token = await Token.findOneAndUpdate({ _id: existing._id, status: existing.status }, { $set: set }, { new: true });
  if (!token) throw new ApiError(409, 'Token changed state. Refresh and try again.');
  res.json({ token: shapeToken(token) });
}));

module.exports = router;
