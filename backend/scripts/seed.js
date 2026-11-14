// Creates a demo manager plus a week of realistic token history so the dashboard charts have data.
// Usage: npm run seed   (then log in with demo@queuepilot.com / demo1234)
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Queue = require('../models/Queue');
const Token = require('../models/Token');

const NAMES = ['Aarav Shah', 'Meera Nair', 'Rohan Das', 'Sana Khan', 'Vikram Rao', 'Anita Joseph', 'Kiran Pai', 'Divya Menon',
  'Imran Ali', 'Priya Hegde', 'Suresh Bhat', 'Lakshmi Iyer', 'Arjun Kamath', 'Nisha Fernandes', 'Farhan Sheikh', 'Deepa Shetty'];
const rnd = (a, b) => a + Math.random() * (b - a);
const MIN = 60000;

async function seedQueue(owner, def) {
  const queue = await Queue.create({ owner: owner._id, ...def });
  const now = new Date();
  const docs = [];
  for (let d = 6; d >= 0; d--) {
    const day = new Date(now); day.setDate(day.getDate() - d); day.setHours(0, 0, 0, 0);
    const count = d === 0 ? Math.round(rnd(14, 20)) : Math.round(rnd(14, 28));
    const times = Array.from({ length: count }, () =>
      d === 0 ? new Date(now.getTime() - rnd(1, 9) * 3600000) : new Date(day.getTime() + rnd(8, 17) * 3600000)
    ).sort((a, b) => a - b);
    let freeAt = 0; // single counter: the next person is called after the previous one finishes
    times.forEach((createdAt) => {
      const calledAt = new Date(Math.max(createdAt.getTime() + rnd(2, 6) * MIN, freeAt));
      const doneAt = new Date(calledAt.getTime() + rnd(4, 11) * MIN);
      const t = { createdAt, name: NAMES[Math.floor(Math.random() * NAMES.length)] };
      if (Math.random() < 0.12) {
        const at = new Date(createdAt.getTime() + rnd(3, 15) * MIN);
        if (at <= now) Object.assign(t, { status: 'cancelled', cancelledAt: at, leftWaitingAt: at });
      } else if (calledAt <= now) {
        Object.assign(t, { calledAt, leftWaitingAt: calledAt, counter: queue.counter });
        if (doneAt <= now) Object.assign(t, { status: 'completed', completedAt: doneAt });
        else t.status = 'serving';
        freeAt = doneAt.getTime();
      }
      docs.push(t);
    });
  }
  docs.sort((a, b) => a.createdAt - b.createdAt);
  const tokens = docs.map((t, i) => ({
    queue: queue._id, owner: owner._id, number: i + 1, order: i + 1,
    code: `${queue.prefix}-${String(i + 1).padStart(3, '0')}`, status: 'waiting', ...t,
  }));
  await Token.insertMany(tokens);
  queue.lastNumber = tokens.length;
  await queue.save();
  return tokens.length;
}

(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI missing in backend/.env');
  await mongoose.connect(process.env.MONGODB_URI);
  await Token.syncIndexes();
  const email = 'demo@queuepilot.com';
  const old = await User.findOne({ email });
  if (old) {
    await Token.deleteMany({ owner: old._id });
    await Queue.deleteMany({ owner: old._id });
    await old.deleteOne();
    console.log('Removed previous demo data.');
  }
  const user = await User.create({ name: 'Demo Manager', email, password: await bcrypt.hash('demo1234', 10) });
  const a = await seedQueue(user, { name: 'Passport Services', counter: 'Counter 3', prefix: 'P' });
  const b = await seedQueue(user, { name: 'Clinic Reception', counter: 'Desk 1', prefix: 'C' });
  console.log(`Seeded ${a + b} tokens. Login: ${email} / demo1234`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
