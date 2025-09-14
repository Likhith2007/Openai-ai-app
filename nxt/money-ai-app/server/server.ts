import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: "http://localhost:5174", // IMPORTANT: The address of your React app
    methods: ["GET", "POST"]
  }
});
const port = Number(process.env.PORT) || 3000;

// Root route to avoid "Cannot GET /" when hitting server base URL
app.get('/', (_req: Request, res: Response) => {
  res.type('text/plain').send(
    'Money AI API is running. Try /api/health or see endpoints under /api/*' 
  );
});

// Razorpay setup
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/api/razorpay/payments', async (_req: Request, res: Response) => {
  try {
    const payments = await (razorpay as any).payments.all({ count: 20 });
    res.json(payments);
  } catch (error: any) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
  try {
    if (!razorpayKeyId || !razorpayKeySecret) {
      return res.status(500).json({ success: false, error: 'Razorpay keys not configured' });
    }
    const amountInRupees: number = Number(req.body.amount);
    if (!amountInRupees || amountInRupees <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    const options = {
      amount: Math.round(amountInRupees * 100),
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`
    } as const;

    const order = await (razorpay as any).orders.create(options);
    res.json({ success: true, order, key_id: razorpayKeyId });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

app.post('/api/razorpay/verify-payment', (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Missing fields' });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', razorpayKeySecret)
      .update(payload)
      .digest('hex');

    const isValid = expectedSignature === razorpay_signature;
    if (isValid) {
      io.emit('payment:verified', {
        razorpay_order_id,
        razorpay_payment_id
      });
    }
    res.json({ success: isValid });
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

app.post('/api/gemini/chat', async (req: Request, res: Response) => {
  try {
    const prompt: string = req.body.prompt;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    res.json({ text });
  } catch (error: any) {
    console.error('Gemini chat error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
});

// Streaming Gemini responses via Server-Sent Events (SSE)
app.post('/api/gemini/chat-stream', async (req: Request, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'GEMINI_API_KEY not configured' }));
    return;
  }

  const prompt: string = req.body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid prompt' }));
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    res.write('event: done\n');
    res.write('data: {}\n\n');
    res.end();
  } catch (error) {
    console.error('Gemini stream error:', error);
    try {
      res.write(`data: ${JSON.stringify({ error: 'Streaming failed' })}\n\n`);
    } finally {
      res.end();
    }
  }
});

httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});