const fs = require('fs');
const path = require('path');

const localIp = '192.168.111.75';
const port = 3001;
const localUrl = `http://${localIp}:${port}`;
const publicUrl = 'https://cpps-plant-spares.loca.lt';
const tunnelPassword = '125.20.80.102';

// QR codes via quickchart / google chart
const localQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(localUrl)}`;
const publicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicUrl)}`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CPPS Dashboard — Phone Access Links & QR Codes</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 30px 20px; display: flex; flex-direction: column; align-items: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 24px; max-width: 600px; width: 100%; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; margin-bottom: 24px; }
    h1 { font-size: 22px; color: #38bdf8; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 14px; margin-bottom: 20px; }
    .method { background: #0f172a; border: 1px solid #475569; border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: center; }
    .method-title { font-size: 16px; font-weight: 700; color: #facc15; margin-bottom: 6px; }
    .link-box { display: inline-block; background: #1e3a8a; color: #93c5fd; padding: 10px 16px; border-radius: 8px; font-family: monospace; font-size: 16px; font-weight: bold; margin: 10px 0; text-decoration: none; word-break: break-all; }
    .link-box:hover { background: #2563eb; color: #fff; }
    .qr-img { border-radius: 10px; background: white; padding: 10px; margin: 15px auto; display: block; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
    .tag { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: #065f46; color: #6ee7b7; margin-bottom: 10px; }
    .note { font-size: 12px; color: #cbd5e1; background: #334155; padding: 10px; border-radius: 8px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Cab Panel Press Shop (CPPS)</h1>
    <p>Open the Critical Parts & Procurement Dashboard on your mobile phone</p>

    <!-- Option 1: Local Wi-Fi -->
    <div class="method">
      <div class="tag">RECOMMENDED • FASTEST</div>
      <div class="method-title">Option 1: If Phone is on Same Wi-Fi</div>
      <p style="margin-bottom: 8px;">Scan with your phone camera or click link:</p>
      <a href="${localUrl}" target="_blank" class="link-box">${localUrl}</a>
      <img src="${localQrUrl}" alt="Wi-Fi QR Code" class="qr-img" width="220" height="220" />
      <div class="note">Make sure your phone Wi-Fi is connected to the same network as this PC.</div>
    </div>

    <!-- Option 2: Mobile Data / Any Network -->
    <div class="method">
      <div class="tag" style="background:#7c2d12; color:#fdba74;">WORKS EVERYWHERE (4G/5G/INTERNET)</div>
      <div class="method-title">Option 2: Anywhere via Public HTTPS Link</div>
      <p style="margin-bottom: 8px;">Works on mobile cellular data without Wi-Fi:</p>
      <a href="${publicUrl}" target="_blank" class="link-box" style="background: #065f46; color: #a7f3d0;">${publicUrl}</a>
      <img src="${publicQrUrl}" alt="Public URL QR Code" class="qr-img" width="220" height="220" />
      <div class="note">If asked for a <b>Tunnel Password</b> on your phone, enter: <br><strong style="font-size:16px; color:#facc15;">${tunnelPassword}</strong> (Click "Click to Submit")</div>
    </div>
  </div>
</body>
</html>`;

const desktopPath = path.join(require('os').homedir(), 'Desktop', 'Phone_Dashboard_Link.html');
fs.writeFileSync(desktopPath, html, 'utf8');
console.log('Saved phone dashboard link to:', desktopPath);

const packagePath = path.join(require('os').homedir(), 'Desktop', 'Plant_Inventory_Procurement_Package', 'Phone_Dashboard_Link.html');
if (fs.existsSync(path.dirname(packagePath))) {
  fs.writeFileSync(packagePath, html, 'utf8');
  console.log('Saved copy inside package folder too!');
}
