// VPS流量监控面板 v3
// 固定显示上下行，0也显示，保证对齐

const API_URL = "http://23.94.70.211:8899/?token=vps-traffic-2026";
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
  $httpClient.get({ url: url, timeout: 10 }, (err, resp, data) => {
    if (err || !resp || resp.status !== 200) cb(null);
    else cb(data);
  });
}

function render(data) {
  try {
    const j = JSON.parse(data);
    let lines = [];
    lines.push("更新: " + j.updated);
    lines.push("");
    for (const m of j.machines) {
      if (m.status !== "ok") {
        lines.push(padRight(m.name + ":", 9) + "离线");
        continue;
      }
      // 名称固定8字符+冒号
      let line = padRight(m.name + ":", 9);
      // 下行/上行固定宽度，右对齐数字
      line += "↓" + padLeft(m.rx_gb + "G", 7);
      line += " ↑" + padLeft(m.tx_gb + "G", 7);
      // GCP特殊显示：配额+警告放右边
      if (m.name === "GCP-OR") {
        line += " (200G " + (m.tx_gb >= 150 ? "⚠️" : "✓") + ")";
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
