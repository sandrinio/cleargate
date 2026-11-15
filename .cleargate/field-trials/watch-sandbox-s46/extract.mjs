// Condense new transcript lines of a watched Claude Code session into a readable chunk.
// Read-only over the transcripts. Usage: node extract.mjs <sessionJsonl> <watchDir>
// Keeps per-file byte offsets in <watchDir>/state.json; writes <watchDir>/chunks/chunk-NNN.txt.
import fs from 'node:fs';
import path from 'node:path';

const [sessionJsonl, watchDir] = process.argv.slice(2);
const sessionDir = sessionJsonl.replace(/\.jsonl$/, '');
const statePath = path.join(watchDir, 'state.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { offsets: {}, chunk: 0 };

function walk(dir, out) {
  let es;
  try { es = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of es) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && e.name.endsWith('.jsonl')) out.push(p);
  }
}
const files = [sessionJsonl];
walk(sessionDir, files);

const cut = (s, n) => {
  s = String(s ?? '').replace(/\s+\n/g, '\n');
  return s.length > n ? s.slice(0, n) + ` …[+${s.length - n} chars]` : s;
};
const hhmm = (ts) => (typeof ts === 'string' ? ts.slice(11, 19) : '--:--:--');
const textOf = (c) => {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map((b) => (b && b.type === 'text' ? b.text : b && b.type === 'image' ? '[image]' : '')).join('\n');
  return '';
};

let out = [];
let any = false;
for (const f of files) {
  const size = fs.statSync(f).size;
  const from = state.offsets[f] || 0;
  if (size <= from) continue;
  const fd = fs.openSync(f, 'r');
  const buf = Buffer.alloc(size - from);
  fs.readSync(fd, buf, 0, buf.length, from);
  fs.closeSync(fd);
  let s = buf.toString('utf8');
  const lastNl = s.lastIndexOf('\n');
  if (lastNl < 0) continue; // no complete line yet
  s = s.slice(0, lastNl + 1);
  state.offsets[f] = from + Buffer.byteLength(s, 'utf8');

  let label = path.relative(path.dirname(sessionJsonl), f);
  const meta = f.replace(/\.jsonl$/, '.meta.json');
  if (fs.existsSync(meta)) {
    try {
      const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
      label += `  [agentType=${m.agentType ?? '?'}${m.description ? ` · ${m.description}` : ''}]`;
    } catch {}
  }
  const lines = [];
  const seenMsg = new Set();
  let outTok = 0, cacheRead = 0, cacheCreate = 0, inTok = 0, turns = 0;
  for (const line of s.split('\n')) {
    if (!line.trim()) continue;
    let o;
    try { o = JSON.parse(line); } catch { continue; }
    const t = hhmm(o.timestamp);
    const msg = o.message;
    if (o.type === 'assistant' && msg) {
      if (msg.id && !seenMsg.has(msg.id)) {
        seenMsg.add(msg.id);
        const u = msg.usage || {};
        outTok += u.output_tokens || 0; inTok += u.input_tokens || 0;
        cacheRead += u.cache_read_input_tokens || 0; cacheCreate += u.cache_creation_input_tokens || 0;
        turns++;
      }
      for (const b of msg.content || []) {
        if (b.type === 'text' && b.text.trim()) lines.push(`${t} ASSISTANT: ${cut(b.text, 1500)}`);
        else if (b.type === 'tool_use') {
          const inp = b.input || {};
          let brief;
          if (b.name === 'Bash') brief = inp.command;
          else if (b.name === 'Agent' || b.name === 'Task') brief = `[${inp.subagent_type ?? ''}${inp.model ? ' model=' + inp.model : ''}] ${inp.description ?? ''} :: ${inp.prompt ?? ''}`;
          else if (b.name === 'Write') brief = `${inp.file_path} (${String(inp.content ?? '').length} chars)`;
          else if (b.name === 'Edit') brief = `${inp.file_path} :: -${cut(inp.old_string, 150)} +${cut(inp.new_string, 150)}`;
          else brief = JSON.stringify(inp);
          lines.push(`${t} TOOL ${b.name}: ${cut(brief, b.name === 'Agent' || b.name === 'Task' ? 900 : 500)}`);
        }
      }
    } else if (o.type === 'user' && msg) {
      const c = msg.content;
      if (typeof c === 'string') {
        lines.push(`${t} USER: ${cut(c, 2500)}`);
      } else if (Array.isArray(c)) {
        for (const b of c) {
          if (b.type === 'tool_result') {
            const txt = textOf(b.content);
            lines.push(`${t} RESULT${b.is_error ? ' [ERROR]' : ''}: ${cut(txt, b.is_error ? 1200 : 600)}`);
          } else if (b.type === 'text' && b.text.trim()) {
            lines.push(`${t} USER: ${cut(b.text, 2500)}`);
          }
        }
      }
    } else if (o.type === 'attachment' && o.attachment) {
      const a = o.attachment;
      if (/_delta$|_record$|^environment$|^model$|listing|^todo|^date|^instructions$|^session_context$|^credential_org$|^remote_session_change$|^prompt_snapshot$|^silent_turn_reminder$|^edited_text_file$/.test(String(a.type))) continue;
      if (a.type === 'queued_command') {
        const p = String(a.prompt ?? '');
        const sum = /<summary>([\s\S]*?)<\/summary>/.exec(p);
        lines.push(`${t} NOTIFY: ${cut(sum ? sum[1] : p, 300)}`);
        continue;
      }
      const body = a.content ?? a.stdout ?? a.stderr ?? a.text ?? JSON.stringify(a);
      if (typeof body === 'string' && !body.trim()) continue;
      lines.push(`${t} ATTACH ${a.type}${a.hookName ? ' ' + a.hookName : ''}: ${cut(typeof body === 'string' ? body : JSON.stringify(body), 600)}`);
    } else if (o.type === 'system') {
      lines.push(`${t} SYSTEM ${o.subtype ?? ''}: ${cut(o.content ?? '', 400)}`);
    }
  }
  if (lines.length === 0) continue;
  any = true;
  out.push(`\n===== FILE ${label}`);
  out.push(`----- usage this chunk: turns=${turns} input=${inTok} output=${outTok} cache_read=${cacheRead} cache_creation=${cacheCreate}`);
  out.push(...lines);
}

if (any) {
  state.chunk += 1;
  const dir = path.join(watchDir, 'chunks');
  fs.mkdirSync(dir, { recursive: true });
  const name = path.join(dir, `chunk-${String(state.chunk).padStart(3, '0')}.txt`);
  fs.writeFileSync(name, out.join('\n') + '\n');
  console.log(`CHUNK ${name} ${fs.statSync(name).size} bytes`);
} else {
  console.log('NO-NEW-CONTENT');
}
fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
// Reset the waiter's growth baseline to what was just read, so a manual run does not re-trigger it.
fs.writeFileSync(path.join(watchDir, 'last_total'), String(files.reduce((s, f) => s + fs.statSync(f).size, 0)));
