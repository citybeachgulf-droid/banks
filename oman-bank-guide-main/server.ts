import express from 'express';
import bodyParser from 'body-parser';
import initDB from './initDB.js'; // لاحظ الامتداد .js بعد transpile

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

let db: any;

async function startServer() {
  db = await initDB();

  // إضافة فرع جديد
  app.post('/add-branch', async (req, res) => {
    const { bank, branch, city, employee, phone } = req.body;
    await db.run(
      'INSERT INTO branches (bank, branch, city, employee, phone) VALUES (?, ?, ?, ?, ?)',
      [bank, branch, city, employee, phone]
    );
    res.send({ message: 'تمت الإضافة بنجاح!' });
  });

  // الحصول على جميع الفروع
  app.get('/branches', async (req, res) => {
    const branches = await db.all('SELECT * FROM branches');
    res.send(branches);
  });

  app.listen(PORT, () => {
    console.log(`السيرفر يعمل على http://localhost:${PORT}`);
  });
}

startServer();
