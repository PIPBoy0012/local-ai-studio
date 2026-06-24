import React, { useState } from 'react'
import type { SecurityReminder } from '@shared/types'

const REMINDERS: SecurityReminder[] = [
  {
    id: 'sql-injection',
    category: 'Database',
    title: 'SQL Injection',
    severity: 'high',
    description:
      'SQL injection occurs when untrusted data is sent to an interpreter as part of a command or query. An attacker can use this to access or manipulate your database without authorization.',
    codeExample: `// ❌ Vulnerable: string concatenation in query
const query = "SELECT * FROM users WHERE name = '" + userName + "'";
db.query(query);`,
    fixExample: `// ✅ Safe: parameterized query / prepared statement
const query = "SELECT * FROM users WHERE name = ?";
db.query(query, [userName]);`,
  },
  {
    id: 'rate-limiting',
    category: 'API Security',
    title: 'Missing Rate Limiting',
    severity: 'high',
    description:
      'Without rate limiting, attackers can make thousands of requests per second to your endpoints, causing denial-of-service, brute-force, or credential-stuffing attacks.',
    codeExample: `// ❌ No rate limiting on login endpoint
app.post('/login', async (req, res) => {
  const user = await authenticate(req.body);
  res.json(user);
});`,
    fixExample: `// ✅ Apply rate limiting middleware
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
app.post('/login', limiter, async (req, res) => {
  const user = await authenticate(req.body);
  res.json(user);
});`,
  },
  {
    id: 'xss',
    category: 'Web Security',
    title: 'Cross-Site Scripting (XSS)',
    severity: 'high',
    description:
      'XSS attacks inject malicious scripts into web pages viewed by other users. Always escape or sanitize user-supplied content before rendering it as HTML.',
    codeExample: `// ❌ Vulnerable: directly inserting user input as HTML
element.innerHTML = userInput;`,
    fixExample: `// ✅ Safe: use textContent or a sanitizer library
element.textContent = userInput;
// or with DOMPurify:
element.innerHTML = DOMPurify.sanitize(userInput);`,
  },
  {
    id: 'hardcoded-secrets',
    category: 'Secrets Management',
    title: 'Hardcoded Secrets & API Keys',
    severity: 'high',
    description:
      'Never hardcode passwords, API keys, or tokens in source code. They can be exposed in version control, logs, or error messages. Use environment variables or a secrets manager.',
    codeExample: `// ❌ Hardcoded secret in source code
const apiKey = "sk-abc123supersecretkey";
fetch("https://api.example.com", { headers: { Authorization: apiKey } });`,
    fixExample: `// ✅ Load from environment variable
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error("API_KEY not set");
fetch("https://api.example.com", { headers: { Authorization: apiKey } });`,
  },
  {
    id: 'insecure-deserialization',
    category: 'Data Handling',
    title: 'Insecure Deserialization',
    severity: 'high',
    description:
      'Deserializing untrusted data can lead to remote code execution. Validate and sanitize any data coming from external sources before processing.',
    codeExample: `// ❌ Deserializing user-supplied data without validation
const obj = JSON.parse(req.body.data);
eval(obj.code); // extremely dangerous!`,
    fixExample: `// ✅ Validate structure with a schema library (e.g. zod)
import { z } from 'zod';
const schema = z.object({ name: z.string(), age: z.number() });
const obj = schema.parse(JSON.parse(req.body.data));`,
  },
  {
    id: 'path-traversal',
    category: 'File System',
    title: 'Path Traversal',
    severity: 'high',
    description:
      'Path traversal attacks use sequences like ../ to access files outside the intended directory. Always resolve and validate file paths against an allowed base directory.',
    codeExample: `// ❌ User-controlled path passed directly to fs
const filePath = req.query.file;
fs.readFile(filePath, callback);`,
    fixExample: `// ✅ Resolve and validate within safe base directory
import path from 'path';
const BASE = '/var/www/uploads';
const safe = path.resolve(BASE, path.basename(req.query.file));
if (!safe.startsWith(BASE + path.sep)) throw new Error('Invalid path');
fs.readFile(safe, callback);`,
  },
  {
    id: 'insecure-deps',
    category: 'Dependencies',
    title: 'Outdated or Vulnerable Dependencies',
    severity: 'medium',
    description:
      'Using outdated dependencies with known vulnerabilities is a common attack vector. Regularly audit and update your dependencies.',
    fixExample: `# Audit and fix npm dependencies
npm audit
npm audit fix

# Or use a dedicated tool
npx snyk test`,
  },
  {
    id: 'cors',
    category: 'API Security',
    title: 'Misconfigured CORS',
    severity: 'medium',
    description:
      'An overly permissive CORS policy (e.g., allow all origins) can allow malicious websites to make authenticated requests to your API on behalf of a logged-in user.',
    codeExample: `// ❌ Allows any origin — dangerous for credentialed requests
app.use(cors({ origin: '*', credentials: true }));`,
    fixExample: `// ✅ Restrict to trusted origins only
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true,
}));`,
  },
  {
    id: 'input-validation',
    category: 'Data Handling',
    title: 'Missing Input Validation',
    severity: 'medium',
    description:
      'Always validate and sanitize user inputs on the server side. Client-side validation can be bypassed. Define strict schemas for every incoming request.',
    fixExample: `// ✅ Validate all incoming request data
import { z } from 'zod';
const CreateUser = z.object({
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
});
app.post('/users', (req, res) => {
  const data = CreateUser.parse(req.body); // throws if invalid
  createUser(data);
});`,
  },
  {
    id: 'error-handling',
    category: 'Information Disclosure',
    title: 'Verbose Error Messages',
    severity: 'low',
    description:
      'Detailed error messages (stack traces, database errors, file paths) can leak sensitive implementation details to an attacker. Return generic messages to clients and log details server-side.',
    codeExample: `// ❌ Leaks internal details to the client
app.use((err, req, res) => {
  res.status(500).json({ error: err.stack });
});`,
    fixExample: `// ✅ Generic message to client, full details in logs
app.use((err, req, res) => {
  console.error(err); // structured server log
  res.status(500).json({ error: 'Internal server error' });
});`,
  },
]

interface CardProps {
  reminder: SecurityReminder
}

function SecurityCard({ reminder }: CardProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="security-card">
      <div
        className="security-card-header"
        onClick={() => setOpen((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={`security-severity severity-${reminder.severity}`}>
          {reminder.severity}
        </span>
        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
          {reminder.category}
        </span>
        <span className="security-card-title">{reminder.title}</span>
        <span className={`security-card-chevron ${open ? 'open' : ''}`}>▾</span>
      </div>
      {open && (
        <div className="security-card-body">
          <p className="security-description">{reminder.description}</p>
          {reminder.codeExample && (
            <div className="security-code-block bad">
              <h4>⚠️ Vulnerable Pattern</h4>
              <pre>{reminder.codeExample}</pre>
            </div>
          )}
          {reminder.fixExample && (
            <div className="security-code-block fix">
              <h4>✅ Safe Pattern</h4>
              <pre>{reminder.fixExample}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function SecurityReminders() {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const filtered = REMINDERS.filter(
    (r) => filter === 'all' || r.severity === filter,
  )

  return (
    <div className="security-panel">
      <div className="panel-header">
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <h1>Security Reminders</h1>
        <div className="panel-header-actions">
          {(['all', 'high', 'medium', 'low'] as const).map((f) => (
            <button
              key={f}
              className={`btn ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: 12, padding: '4px 12px' }}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="security-list">
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 4 }}>
          Common security issues to watch for when building with AI-generated code.
          Click a card to expand details and examples.
        </p>
        {filtered.map((r) => (
          <SecurityCard key={r.id} reminder={r} />
        ))}
      </div>
    </div>
  )
}
