import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { formatISO, subDays } from "date-fns";

// In-memory data store
const today = new Date();

let transactions = [
  {
    id: 't1',
    amount: 32.5,
    type: 'expense',
    category: 'coffee',
    date: formatISO(today),
    note: '星巴克拿铁',
    source: 'shortcut',
  },
  {
    id: 't2',
    amount: 15.0,
    type: 'expense',
    category: 'transport',
    date: formatISO(today),
    note: '打车',
    source: 'shortcut',
  },
  {
    id: 't3',
    amount: 120.0,
    type: 'expense',
    category: 'food',
    date: formatISO(subDays(today, 1)),
    note: '外卖晚餐',
    source: 'shortcut',
  },
  {
    id: 't4',
    amount: 50.0,
    type: 'expense',
    category: 'shopping',
    date: formatISO(subDays(today, 1)),
    note: '便利店',
    source: 'manual',
  },
  {
    id: 't5',
    amount: 15000.0,
    type: 'income',
    category: 'salary',
    date: formatISO(subDays(today, 2)),
    note: '本月工资',
    source: 'manual',
  },
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/transactions", (req, res) => {
    res.json(transactions);
  });

  app.post("/api/transactions", (req, res) => {
    const newTx = {
      id: Date.now().toString(),
      ...req.body,
      date: req.body.date || formatISO(new Date()),
    };
    transactions.unshift(newTx);
    res.json(newTx);
  });

  app.delete("/api/transactions/:id", (req, res) => {
    transactions = transactions.filter((t) => t.id !== req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
