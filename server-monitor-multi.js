// Server Monitor Multi-Host for Egern
// env: hosts (格式 "名称:IP,名称:IP"), username, privateKey/password, port

export default async function (ctx) {
  const { hosts, username, password, privateKey, port } = ctx.env;

  if (!hosts) {
    return { title: "服务器监控", content: "请在模块设置里填写 hosts" };
  }

  // 解析 hosts: "RN-SJC:23.94.70.211,RN-LA:23.238.91.100"
  const hostList = hosts.split(",").map(h => {
    const [name, ip] = h.trim().split(":");
    return { name: name.trim(), ip: ip.trim() };
  }).filter(h => h.name && h.ip);

  const SEP = '<<SEP>>';
  const cmds = [
    'cat /proc/loadavg',
    'uptime -p 2>/dev/null || uptime',
    'free -b | head -2',
    'df -B1 / | tail -1',
    'nproc',
  ].join(` && echo '${SEP}' && `);

  let lines = [];
  for (const h of hostList) {
    try {
      const session = await ctx.ssh.connect({
        host: h.ip, port: Number(port || 22), username,
        ...(privateKey ? { privateKey } : { password }),
        timeout: 8000,
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
      const cores = p[4] || '?';

      lines.push(`${h.name}: CPU负载${load} 内存${memPct}% 磁盘${diskPct}%`);
      lines.push(`  运行: ${uptime} (${cores}核)`);
    } catch (e) {
      lines.push(`${h.name}: 连接失败`);
    }
  }

  return {
    title: `服务器监控 (${hostList.length}台)`,
    content: lines.join("\n")
  };
}
