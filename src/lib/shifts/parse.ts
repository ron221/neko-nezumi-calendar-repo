// 解析 Tup 原岩班表頁（hr.tup.j91.me/shift?month=YYYY-MM）的 HTML。
// 每天一列 <tr>：
//   上班：<div class="info-shift-time">10:00~18:00</div><div class="info-shift-branch">新店</div>
//   休假：<div class="info-shift-kind">排休</div>（或 特休…）
//   日期：同一列按鈕上的 data-date="2026-11-05"
//   活動、排班備註：<div class="info-event-group">…</div>（有寫才有字）
// 只用正規表示式、不靠外部套件，伺服器和測試腳本都能直接跑。

export type Shift =
  | { date: string; kind: "work"; start: string; end: string; branch: string; notes: string[] }
  | { date: string; kind: "off"; label: string; notes: string[] };

export function parseShiftPage(html: string): Shift[] {
  const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1];
  if (!tbody || !/views-field-field-shift/.test(html)) {
    throw new Error("看不懂班表頁（可能沒登入成功，或網站改版了）");
  }
  const shifts: Shift[] = [];
  for (const [, row] of tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const date = row.match(/data-date="(\d{4}-\d{2}-\d{2})"/)?.[1];
    if (!date) continue;
    const notes = [...row.matchAll(/<div class="info-event-group[^"]*">([\s\S]*?)<\/div>\s*<div class="shift-editable-hide/g)]
      .map((m) => text(m[1]))
      .filter(Boolean);
    const time = row.match(/class="info-shift-time">([^<]*)</)?.[1];
    const t = time?.match(/(\d{1,2}):(\d{2})\s*[~～-]\s*(\d{1,2}):(\d{2})/);
    if (t) {
      shifts.push({
        date,
        kind: "work",
        start: `${t[1].padStart(2, "0")}:${t[2]}`,
        end: `${t[3].padStart(2, "0")}:${t[4]}`,
        branch: text(row.match(/class="info-shift-branch">([^<]*)</)?.[1] ?? ""),
        notes,
      });
      continue;
    }
    const kind = text(row.match(/class="info-shift-kind">([^<]*)</)?.[1] ?? "");
    if (kind) shifts.push({ date, kind: "off", label: kind, notes });
    // 什麼都沒寫的日子（還沒排班）就跳過
  }
  return shifts;
}

function text(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}
