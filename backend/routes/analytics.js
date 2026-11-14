const router = require('express').Router();
const mongoose = require('mongoose');
const Token = require('../models/Token');
const auth = require('../middleware/auth');
const { asyncHandler, assertObjectId } = require('../utils/http');

router.use(auth);

const HOUR = 3600000;
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

// Every number below is computed from Token documents in MongoDB. Optional ?queueId= narrows to one queue.
router.get('/', asyncHandler(async (req, res) => {
  const match = { owner: new mongoose.Types.ObjectId(req.userId) };
  if (req.query.queueId) { assertObjectId(req.query.queueId, 'queue id'); match.queue = new mongoose.Types.ObjectId(req.query.queueId); }

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

  const [totalToday, waiting, serving, completedToday, cancelledToday, completedAll, cancelledAll, waitAgg] = await Promise.all([
    Token.countDocuments({ ...match, createdAt: { $gte: todayStart } }),
    Token.countDocuments({ ...match, status: 'waiting' }),
    Token.countDocuments({ ...match, status: 'serving' }),
    Token.countDocuments({ ...match, status: 'completed', completedAt: { $gte: todayStart } }),
    Token.countDocuments({ ...match, status: 'cancelled', cancelledAt: { $gte: todayStart } }),
    Token.countDocuments({ ...match, status: 'completed' }),
    Token.countDocuments({ ...match, status: 'cancelled' }),
    Token.aggregate([
      { $match: { ...match, calledAt: { $ne: null } } },
      { $project: { wait: { $subtract: ['$calledAt', '$createdAt'] }, today: { $gte: ['$calledAt', todayStart] } } },
      { $group: { _id: '$today', avg: { $avg: '$wait' }, n: { $sum: 1 } } },
    ]),
  ]);
  const toMin = (ms) => (ms == null ? null : Math.round((ms / 60000) * 10) / 10);
  const avgToday = waitAgg.find((r) => r._id === true);
  const totalN = waitAgg.reduce((s, r) => s + r.n, 0);
  const allAvg = totalN ? waitAgg.reduce((s, r) => s + r.avg * r.n, 0) / totalN : null;

  // Queue length trend: how many tokens were waiting at each of the last 12 hourly marks.
  const windowStart = new Date(now.getTime() - 11 * HOUR);
  const waitingDocs = await Token.find(
    { ...match, createdAt: { $lte: now }, $or: [{ leftWaitingAt: null }, { leftWaitingAt: { $gte: windowStart } }] },
    'createdAt leftWaitingAt'
  ).lean();
  const trend = [];
  for (let i = 11; i >= 0; i--) {
    const t = new Date(now.getTime() - i * HOUR);
    const length = waitingDocs.filter((d) => d.createdAt <= t && (!d.leftWaitingAt || d.leftWaitingAt > t)).length;
    trend.push({ label: t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), length });
  }

  // Daily activity for the last 7 days.
  const weekStart = new Date(todayStart); weekStart.setDate(weekStart.getDate() - 6);
  const weekDocs = await Token.find(
    { ...match, $or: [{ createdAt: { $gte: weekStart } }, { completedAt: { $gte: weekStart } }, { cancelledAt: { $gte: weekStart } }] },
    'createdAt completedAt cancelledAt'
  ).lean();
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
    days.push({ key: dayKey(d), label: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }), created: 0, completed: 0, cancelled: 0 });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  weekDocs.forEach((t) => {
    if (t.createdAt >= weekStart) byKey[dayKey(t.createdAt)].created++;
    if (t.completedAt && t.completedAt >= weekStart) byKey[dayKey(t.completedAt)].completed++;
    if (t.cancelledAt && t.cancelledAt >= weekStart) byKey[dayKey(t.cancelledAt)].cancelled++;
  });

  res.json({
    summary: {
      totalToday, waiting, serving, completedToday, cancelledToday,
      avgWaitMinutes: toMin(avgToday ? avgToday.avg : null),
      avgWaitAllTimeMinutes: toMin(allAvg),
    },
    trend,
    daily: days.map(({ key, ...rest }) => rest),
    outcome: { completed: completedAll, cancelled: cancelledAll },
  });
}));

module.exports = router;
