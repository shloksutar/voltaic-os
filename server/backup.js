import fs from 'fs';
import path from 'path';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { db } from './db.js';
import { log, reportCritical } from './observability.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function backupDatabase() {
  const backupDir = path.resolve(process.env.DB_BACKUP_DIR || path.join(process.cwd(), 'backups'));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const encryptionKey = process.env.DB_BACKUP_ENCRYPTION_KEY;
  if (process.env.NODE_ENV === 'production' && !encryptionKey) {
    const error = new Error('DB_BACKUP_ENCRYPTION_KEY is required for encrypted production backups');
    void reportCritical('Database backup configuration is incomplete', { error: error.message });
    throw error;
  }
  const encrypted = Boolean(encryptionKey);
  const destination = path.join(backupDir, `database-${stamp}.json${encrypted ? '.enc' : ''}`);
  try {
    fs.mkdirSync(backupDir, { recursive: true });
    let output;
    if (encrypted) {
      const key = createHash('sha256').update(encryptionKey).digest();
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      const plaintext = fs.readFileSync(db.getFilePath());
      const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
      const envelope = JSON.stringify({ version: 1, algorithm: 'aes-256-gcm', iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: ciphertext.toString('base64') });
      fs.writeFileSync(destination, envelope, { encoding: 'utf8', mode: 0o600 });
      output = destination;
    } else {
      output = db.backupTo(destination);
    }
    log('info', 'Database backup created', { file: output });

    const retentionDays = Math.max(1, Number(process.env.DB_BACKUP_RETENTION_DAYS) || 14);
    const cutoff = Date.now() - retentionDays * DAY_MS;
    for (const file of fs.readdirSync(backupDir)) {
      if (!/^database-.*\.json(?:\.enc)?$/.test(file)) continue;
      const fullPath = path.join(backupDir, file);
      if (fs.statSync(fullPath).mtimeMs < cutoff) fs.unlinkSync(fullPath);
    }
    return output;
  } catch (error) {
    void reportCritical('Database backup failed', { error: error?.message });
    throw error;
  }
}

export function scheduleDailyBackup() {
  // A persistent Node process gets an automatic daily backup. Serverless
  // deployments must invoke `npm run db:backup` from a provider cron job.
  if (process.env.DISABLE_DB_BACKUP === 'true') return null;
  try { backupDatabase(); } catch { /* reportCritical already logged it */ }
  const timer = setInterval(() => {
    try { backupDatabase(); } catch { /* reportCritical already logged it */ }
  }, DAY_MS);
  timer.unref?.();
  return timer;
}
