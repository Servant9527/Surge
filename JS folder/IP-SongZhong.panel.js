// IP 送中检测面板 for Surge
// 检测方法：请求 google.com 首页并禁止跟随跳转
//   HTTP 200 = 谷歌认美国（正常），HTTP 302 = 跳 google.com.hk（送中）
// 同时用 ip-api.com 显示出口 IP 与定位
// 模块参数 policy（sgmodule 的 #!arguments，默认 国外代理）：
//   脚本的两个请求都走该策略组当前选中的节点；
//   留空则走默认路由；填错组名时 Surge 会走默认路由。

const GOOGLE_URL = "https://www.google.com/";
const IP_API_URL = "http://ip-api.com/json/?fields=8450015&lang=zh-CN";

// 模块 argument 传入的策略组名
let POLICY = "";
try {
  if (typeof $argument !== "undefined" && $argument) {
    POLICY = String($argument).trim();
  }
} catch (e) {}
// 占位符未被替换（旧版 Surge 不支持模块参数）时按空处理
if (POLICY.indexOf("{{{") !== -1) POLICY = "";

// 该策略组当前选中的节点（select 组才有）
let currentNode = "";
try {
  if (POLICY && typeof $surge !== "undefined" && $surge.selectGroupDetails) {
    const d = $surge.selectGroupDetails();
    if (d && d.decisions && d.decisions[POLICY]) {
      currentNode = d.decisions[POLICY];
    }
  }
} catch (e) {}

let googleStatus = "检测中";
let googleIcon = "❓";
let ipInfo = null;

function getFlagEmoji(countryCode) {
  if (!countryCode) return "";
  if (countryCode.toUpperCase() == "TW") countryCode = "CN";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

// 两个请求都走指定策略组（policy 为空时不传，走默认路由）
function reqOpts(url) {
  const o = { url: url, "auto-redirect": false, timeout: 10 };
  if (POLICY) o.policy = POLICY;
  return o;
}

function render() {
  const ip = ipInfo ? ipInfo.query : "获取失败";
  const isp = ipInfo ? ipInfo.isp : "未知";
  const country = ipInfo ? ipInfo.country : "未知";
  const city = ipInfo ? ipInfo.city : "未知";
  const emoji = ipInfo ? getFlagEmoji(ipInfo.countryCode) : "";
  const loc = ipInfo ? `${emoji}${country} ${city}` : "获取失败";

  const groupLine = POLICY
    ? `📡 策略组：${POLICY}${currentNode ? "（当前：" + currentNode + "）" : ""}\n`
    : "";

  const body = {
    title: "IP 送中检测",
    content:
      `🌐 出口 IP：${ip}\n` +
      `🖥️ ISP：${isp}\n` +
      `📍 定位：${loc}\n` +
      groupLine +
      `${googleIcon} 谷歌：${googleStatus}`,
    icon: "globe",
    "icon-color": googleStatus.indexOf("送中") !== -1 ? "#ff3b30" : "#34c759",
  };
  $done(body);
}

// 1. 测谷歌是否送中（走指定策略组）
$httpClient.get(
  reqOpts(GOOGLE_URL),
  function (error, response, data) {
    if (!error && response) {
      if (response.status === 200) {
        googleStatus = "正常（美国）";
        googleIcon = "✅";
      } else if (response.status === 302) {
        googleStatus = "送中（跳 .hk）";
        googleIcon = "🚨";
      } else {
        googleStatus = `异常（HTTP ${response.status}）`;
        googleIcon = "❓";
      }
    } else {
      googleStatus = "检测失败";
      googleIcon = "❌";
    }

    // 2. 查出口 IP 与定位（同样走指定策略组）
    $httpClient.get(reqOpts(IP_API_URL), function (err2, resp2, data2) {
      if (!err2 && data2) {
        try {
          ipInfo = JSON.parse(data2);
        } catch (e) {
          ipInfo = null;
        }
      }
      render();
    });
  }
);
