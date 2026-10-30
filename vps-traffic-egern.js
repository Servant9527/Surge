// VPS流量监控 (Egern版)
// 从聚合器HTTP接口拉取19台数据

export default async function (ctx) {
  const API_URL = "http://23.94.70.211:8899/?token=vps-traffic-2026";
  const API_BACKUP = "http://39.98.71.108:8899/?token=vps-traffic-2026";

  const padRight = (s, n) => {
    s = String(s);
    while (s.length < n) s += " ";
    return s;
  };
  const padLeft = (s, n) => {
    s = String(s);
    while (s.length < n) s = " " + s;
    return s;
  };

  async function fetchData(url) {
    try {
      const resp = await ctx.http.get(url, { timeout: 10000 });
      if (resp.statusCode === 200) return JSON.parse(resp.body);
    } catch (e) {}
    return null;
  }

  let data = await fetchData(API_URL);
  if (!data) data = await fetchData(API_BACKUP);
  if (!data) {
    return { title: "VPS流量", content: "主备均不可达" };
  }

  let lines = [];
  lines.push("更新: " + data.updated);
  lines.push("");
  for (const m of data.machines) {
    if (m.status !== "ok") {
      lines.push(padRight(m.name + ":", 9) + "离线");
      continue;
    }
    let line = padRight(m.name + ":", 9);
    line += "↓" + padLeft(m.rx_gb + "G", 7);
    line += " ↑" + padLeft(m.tx_gb + "G", 7);
    if (m.name === "GCP-OR") {
      line += " (200G " + (m.tx_gb >= 180 ? "⚠️" : "✓") + ")";
    }
    lines.push(line);
  }

  return {
    title: "VPS流量(月)",
    content: lines.join("\n")
  };
}
