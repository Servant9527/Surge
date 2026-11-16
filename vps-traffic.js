// VPS流量监控面板 v4
// 固定显示上下行，0也显示，保证对齐
// v4 新增：国内免流合计（15 台 CN 机）与国外免流合计（SG01/02/03）

const API_URL = "http://23.238.91.5:8900/?token=vps-traffic-2026";
const API_BACKUP = "http://39.98.71.108:8899/?token=vps-traffic-2026";

function padRight(s, n) {
  s = String(s);
  while (s.length < n) s += " ";
  return s;
}

function padLeft(s, n) {
  s = String(s);
  while (s.length < n) s = " " + s;
  return s;
}

function fetchUrl(url, cb) {
  $httpClient.get({ url: url, timeout: 15 }, (err, resp, data) => {
    if (err || !resp || resp.status !== 200) cb(null);
    else cb(data);
  });
}

const FLAGS = {
  "RN-LA01": "🇺🇸", "RN-LA02": "🇺🇸", "GCP-OR": "🇺🇸",
  "SG01": "🇸🇬", "SG02": "🇸🇬", "SG03": "🇸🇬",
};
function flagFor(name) {
  if (name.startsWith("CN")) return "🇨🇳";
  return FLAGS[name] || "";
}

function render(data) {
  try {
    const j = JSON.parse(data);
    let lines = [];
    lines.push("更新: " + j.updated);
    // 国内外免流合计：国内 = 15 台 CN 机，国外 = SG01/02/03（LA 很少用来免流且另有服务，不计入）
    let cn = { total: 0, rx: 0, tx: 0, off: 0 };
    let sg = { total: 0, rx: 0, tx: 0, off: 0 };
    for (const m of j.machines) {
      const g = m.name.startsWith("CN") ? cn : (m.name.startsWith("SG") ? sg : null);
      if (!g) continue;
      if (m.status !== "ok") { g.off++; continue; }
      g.rx += m.rx_gb; g.tx += m.tx_gb; g.total += m.rx_gb + m.tx_gb;
    }
    lines.push("🇨🇳 国内免流:" + padLeft(cn.total.toFixed(1) + "G", 8) + "↓" + padLeft(cn.rx.toFixed(1) + "G", 7) + " ↑" + padLeft(cn.tx.toFixed(1) + "G", 7) + (cn.off ? " (" + cn.off + "台离线)" : ""));
    lines.push("🇸🇬 国外免流:" + padLeft(sg.total.toFixed(1) + "G", 8) + "↓" + padLeft(sg.rx.toFixed(1) + "G", 7) + " ↑" + padLeft(sg.tx.toFixed(1) + "G", 7) + (sg.off ? " (" + sg.off + "台离线)" : ""));
    lines.push("");
    for (const m of j.machines) {
      if (m.status !== "ok") {
        lines.push(flagFor(m.name) + " " + padRight(m.name + ":", 9) + "离线");
        continue;
      }
      // 名称固定8字符+冒号
      const total = (m.rx_gb + m.tx_gb).toFixed(1);
      let line = flagFor(m.name) + " " + padRight(m.name + ":", 9);
      // 下行/上行固定宽度，右对齐数字
      line += padLeft(total + "G", 8);
      line += "↓" + padLeft(m.rx_gb + "G", 7);
      line += " ↑" + padLeft(m.tx_gb + "G", 7);
      // GCP特殊显示：配额+警告放右边
      if (m.name === "GCP-OR") {
        line += " (200G " + (m.tx_gb >= 180 ? "⚠️" : "✓") + ")";
      }
      lines.push(line);
    }
    $done({ title: "VPS流量(月)", content: lines.join("\n") });
  } catch (e) {
    $done({ title: "VPS流量", content: "解析失败" });
  }
}

// 主→备 failover
fetchUrl(API_URL, (data) => {
  if (data) render(data);
  else fetchUrl(API_BACKUP, (data2) => {
    if (data2) render(data2);
    else $done({ title: "VPS流量", content: "主备均不可达" });
  });
});
