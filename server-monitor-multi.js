// Server Monitor Multi-Host for Egern (v2: +流量)
// env: hosts (格式 "名称:IP,名称:IP"), username, privateKey/password, port

export default async function (ctx) {
  const { hosts, username, password, privateKey, port } = ctx.env;

  if (!hosts) {
    return { title: "服务器监控", content: "请在模块设置里填写 hosts" };
  }

  const hostList = hosts.split(",").map(h => {
    const idx = h.trim().lastIndexOf(":");
    // 处理IPv6地址 (最后一个冒号才是分隔符)
    const name = h.trim().substring(0, idx).trim();
    const ip = h.trim().substring(idx + 1).trim();
    // 如果名称里还有冒号，说明是 IPv6 没有名称，用 IP 当名称
    if (!ip || name.includes(":")) {
      return { name: h.trim(), ip: h.trim() };
    }
    return { name, ip };
  }).filter(h => h.name && h.ip);

  const SEP = '<<SEP>>';
  const cmds = [
    'cat /proc/loadavg',
    'uptime -p 2>/dev/null || uptime',
    'free -b | head -2',
    'df -B1 / | tail -1',
    'nproc',
    // 流量：取 vnstat 最新一个月的 rx/tx (MB)
    `vnstat --json 2>/dev/null | python3 -c "
import json,sys
try:
    d=json.load(sys.stdin)
    best=None
    for iface in d.get('interfaces',[]):
        n=iface['name']
        if n.startswith('br-') or n=='docker0' or n=='lo': continue
        months=iface.get('traffic',{}).get('month',[])
        if not months: continue
        m=sorted(months,key=lambda x:(x['date']['year'],x['date']['month']))[-1]
        t=m['rx']+m['tx']
        if not best or t>best[0]: best=(t,m['rx']//1024//1024,m['tx']//1024//1024)
    if best: print(f'{best[1]} {best[2]}')
    else: print('0 0')
except: print('0 0')
" 2>/dev/null || echo "0 0"`,
  ].join(` && echo '${SEP}' && `);

  let lines = [];
  for (const h of hostList) {
    try {
      const session = await ctx.ssh.connect({
        host: h.ip, port: Number(port || 22), username,
        ...(privateKey ? { privateKey } : { password }),
        timeout: 10000,
      });
      const { stdout } = await session.exec(cmds);
      await session.close();

      const p = stdout.split(SEP).map(s => s.trim());
      const load = (p[0] || '0 0 0').split(' ')[0];
      const uptime = (p[1] || '').replace(/^up\s+/, '').replace(/,\s*$/, '');
      const memLine = (p[2] || '').split('\n').find(l => /^Mem:/.test(l)) || '';
      const mm = memLine.split(/\s+/);
      const memPct = Math.round((Number(mm[2]) || 0) / (Number(mm[1]) || 1) * 100);
      const df = (p[3] || '').split(/\s+/);
      const diskPct = parseInt(df[4]) || 0;
      const cores = (p[4] || '').trim() || '?';
      const t = (p[5] || '0 0').split(' ');
      const rxG = (Number(t[0]) / 1024).toFixed(1);
      const txG = (Number(t[1]) / 1024).toFixed(1);

      lines.push(`${h.name}: 负载${load} 内存${memPct}% 磁盘${diskPct}%`);
      lines.push(`  ↓${rxG}G ↑${txG}G | 运行:${uptime} (${cores}核)`);
    } catch (e) {
      lines.push(`${h.name}: 连接失败`);
    }
  }

  return {
    title: `服务器监控 (${hostList.length}台)`,
    content: lines.join("\n")
  };
}
