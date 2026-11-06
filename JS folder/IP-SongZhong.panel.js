// IP 送中检测面板 for Surge
// 检测方法：请求 google.com 首页并禁止跟随跳转
//   HTTP 200 = 谷歌认美国（正常），HTTP 302 = 跳 google.com.hk（送中）
// 同时显示出口 IP 与定位（ip-api.com）
// 参考：Servant9527/Surge JS folder/ip-api.js

const GOOGLE_URL = "https://www.google.com/";
const IP_API_URL = "http://ip-api.com/json/?fields=8450015&lang=zh-CN";

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

function render() {
  const ip = ipInfo ? ipInfo.query : "获取失败";
  const isp = ipInfo ? ipInfo.isp : "获取失败";
  const country = ipInfo ? ipInfo.country : "获取失败";
  const city = ipInfo ? ipInfo.city : "获取失败";
  const emoji = ipInfo ? getFlagEmoji(ipInfo.countryCode) : "";
  const loc = ipInfo ? `${emoji}${country} ${city}` : "获取失败";

  const body = {
    title: "IP 送中检测",
    content:
      `🌐 出口 IP：${ip}\n` +
      `🖥️ ISP：${isp}\n` +
      `🌍 定位：${loc}\n` +
      `${googleIcon} 谷歌：${googleStatus}`,
    icon: "globe",
    "icon-color": googleStatus.indexOf("送中") !== -1 ? "#ff3b30" : "#34c759",
  };
  $done(body);
}

// 1. 先查谷歌状态（禁跳转，直接看状态码）
$httpClient.get(
  { url: GOOGLE_URL, "auto-redirect": false, timeout: 10 },
  function (error, response, data) {
    if (!error && response) {
      if (response.status === 200) {
        googleStatus = "正常（美国）";
        googleIcon = "✅";
      } else if (response.status === 302) {
        googleStatus = "送中（跳 .hk）";
        googleIcon = "⚠️";
      } else {
        googleStatus = `异常（HTTP ${response.status}）`;
        googleIcon = "❓";
      }
    } else {
      googleStatus = "检测失败";
      googleIcon = "❌";
    }

    // 2. 再查 IP 定位
    $httpClient.get(IP_API_URL, function (err2, resp2, data2) {
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
