// VPS流量监控面板
// 数据来源: RN-SJC聚合器, 每10分钟更新

const API_URL = "http://23.94.70.211:8899/?token=vps-traffic-2026";

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
        lines.push(m.name + ": 离线");
        continue;
      }
      // 重点标出GCP
      const mark = m.name === "GCP-OR" ? "⚠️ " : "";
      lines.push(`${mark}${m.name}: ↓${m.rx_gb}G ↑${m.tx_gb}G`);
    }
    $done({
      title: "VPS流量(月)",
      content: lines.join("\n"),
    });
  } catch (e) {
    $done({ title: "VPS流量", content: "解析失败" });
  }
});
