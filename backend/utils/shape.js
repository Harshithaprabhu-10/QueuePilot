// Converts Token documents into the JSON the API returns.
const shapeToken = (t, position) => ({
  id: t._id, queue: t.queue, number: t.number, code: t.code, name: t.name, status: t.status,
  position: position ?? null, counter: t.counter, createdAt: t.createdAt,
  calledAt: t.calledAt, completedAt: t.completedAt, cancelledAt: t.cancelledAt,
});
module.exports = { shapeToken };
