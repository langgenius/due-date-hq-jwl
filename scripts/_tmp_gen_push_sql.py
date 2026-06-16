import json, subprocess, glob, os

DB = subprocess.run(
    "ls apps/server/.wrangler/state/v3/d1/miniflare-D1DatabaseObject/*.sqlite | grep -v metadata | head -1",
    shell=True, capture_output=True, text=True).stdout.strip()

COLS = ["id","firm_id","user_id","kind","prompt_version","model","input_context_ref",
        "input_hash","output_text","citations_json","guard_result","refusal_code",
        "generated_at","tokens_in","tokens_out","latency_ms","cost_usd"]

for f in glob.glob("/tmp/push_batch_*.sql"):
    os.remove(f)

ids = [x.strip() for x in open("/tmp/push_ai_ids.txt") if x.strip()]
assert ids, "no ids"

SOURCETEXT_CAP = 40000   # keep each row well under D1's ~100KB per-statement limit
WINDOW = 18000           # context kept on each side of the excerpt

def window_citations(cj):
    """Shrink citations_json.sourceText to a window around sourceExcerpt (kept verbatim)."""
    if not cj:
        return cj
    try:
        c = json.loads(cj)
    except Exception:
        return cj
    st = c.get("sourceText")
    if not isinstance(st, str) or len(st) <= SOURCETEXT_CAP:
        return cj
    ex = c.get("sourceExcerpt") if isinstance(c.get("sourceExcerpt"), str) else None
    idx = st.find(ex) if ex else -1
    if idx >= 0:
        start = max(0, idx - WINDOW)
        c["sourceText"] = st[start: idx + len(ex) + WINDOW]
    else:
        c["sourceText"] = st[:SOURCETEXT_CAP]
    return json.dumps(c, ensure_ascii=False)

def lit(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "1" if v else "0"
    if isinstance(v, (int, float)): return repr(v)
    return "'" + str(v).replace("'", "''") + "'"

in_clause = ",".join("'" + i.replace("'", "''") + "'" for i in ids)
sql = f"select {', '.join(COLS)} from ai_output where id in ({in_clause})"
rows = json.loads(subprocess.run(["sqlite3", "-json", DB, sql], capture_output=True, text=True).stdout)
assert len(rows) == len(ids), f"row mismatch: got {len(rows)} for {len(ids)} ids"

collist = "(" + ",".join(COLS) + ")"
STMT_CAP = 95_000   # D1 per-statement limit is ~100KB; skip pathological oversized rows
stmts, skipped = [], []
for r in rows:
    r = dict(r)
    r["citations_json"] = window_citations(r.get("citations_json"))
    vals = ",".join(lit(r.get(c)) for c in COLS)
    s = f"INSERT OR IGNORE INTO ai_output {collist} VALUES ({vals});"
    if len(s) > STMT_CAP:
        skipped.append({"ref": r.get("input_context_ref"), "bytes": len(s),
                        "ot_len": len(r.get("output_text") or "")})
        continue
    stmts.append(s)

# batch by cumulative bytes (<= ~600KB/file) and <= 25 statements/file
MAX_BYTES, MAX_STMTS = 600_000, 25
batches, cur, cur_bytes = [], [], 0
for s in stmts:
    if cur and (cur_bytes + len(s) > MAX_BYTES or len(cur) >= MAX_STMTS):
        batches.append(cur); cur, cur_bytes = [], 0
    cur.append(s); cur_bytes += len(s) + 1
if cur: batches.append(cur)

for n, b in enumerate(batches, 1):
    open(f"/tmp/push_batch_{n:02d}.sql", "w").write("\n".join(b) + "\n")

print(json.dumps({
    "rows": len(rows),
    "statements": len(stmts),
    "batches": len(batches),
    "maxStmtChars": max(len(s) for s in stmts),
    "totalChars": sum(len(s) for s in stmts),
    "skipped": skipped,
}, indent=2))
