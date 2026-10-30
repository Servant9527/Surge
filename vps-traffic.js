// VPS流量监控面板 v2
// 参数: show_tx=1 显示上传, show_rx=1 显示下载
// 数据来源: RN-SJC聚合器

const API_URL = "http://23.94.70.211:8899/?token=vps-traffic-2026";

// 解析参数
const args = {};
if (typeof $argument !== "undefined" && $argument) {
  $argument.split("&").forEach(p => {
    const [k, v] = p.split("=");
    args[k] = v;
  });
}
const showRx = args.show_rx !== "0";
const showTx = args.show_tx !== "0";

function pad(s, n) {
  s = String(s);
  while (s.length < n) s += " ";
  return s;
}

$httpClient.get(API_URL, (err, resp, data) => {
  if (err || resp.status !== 200) {
    $done({ title: "VPS流量", content: "获取失败" });
    return;
  }
  try {
    const j = JSON.parse(data);
    let lines = [];
    lines.push("更新: " + j.updated);
    lines.push("");
    for (const m of j.machines) {
      if (m.status !== "ok") {
        lines.push(pad(m.name, 8) + " 离线");
        continue;
      }
      let line = pad(m.name, 8);
      if (showRx) line += " ↓" + m.rx_gb + "G";
      if (showTx) line += " ↑" + m.tx_gb + "G";
      // GCP警告放右边
      if (m.name === "GCP-OR" && m.tx_gb > 150) line += " ⚠️";
      else if (m.name === "GCP-OR") line += " ✓";
      lines.push(line);
    }
    $done({ title: "VPS流量(月)", content: lines.join("\n") });
  } catch (e) {
    $done({ title: "VPS流量", content: "解析失败" });
  }
});
