const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const sshDir = path.join(os.homedir(), '.ssh');
if (!fs.existsSync(sshDir)) {
  fs.mkdirSync(sshDir, { recursive: true });
}

const keyPath = path.join(sshDir, 'id_ed25519');
const pubKeyPath = keyPath + '.pub';

if (!fs.existsSync(keyPath)) {
  console.log('Generating new ED25519 SSH key...');
  execSync(`ssh-keygen -t ed25519 -C "saravana-cpps" -f "${keyPath}" -N ""`, { stdio: 'inherit' });
} else {
  console.log('SSH key already exists.');
}

const pubKey = fs.readFileSync(pubKeyPath, 'utf8').trim();
console.log('\n==================== YOUR GITHUB SSH PUBLIC KEY ====================');
console.log(pubKey);
console.log('====================================================================\n');
