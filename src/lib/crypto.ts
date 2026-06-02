import crypto from 'crypto';

const SECRET_KEY = process.env.JWT_SECRET || 'veriaudit-super-secret-key-123456';

export function hashPassword(password: string, salt: string): string {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

export function generateToken(payload: any): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64');
  return `${data}.${signature}`;
}

export function verifyToken(token: string): any | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('base64');
  if (signature !== expectedSignature) return null;
  
  try {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  } catch (e) {
    return null;
  }
}
