
const mineflayer = require('mineflayer');
const fs = require('fs');
const { spawn } = require('child_process');

let bot = mineflayer.createBot({
  host: 'server_ip',
  port: 25565,
  username: 'bot_name',
  version: 'version'
});

let sequenceRunning = false;
let admins = ['nuttle'];
let autoDropEnabled = false;
let chestMode = false;
let multiMode = false;
let miktarEnabled = false;
let chestCount = 1;
let totalDuped = 0;
let nearbyShulkers = 0;
let pendingCommand = null;
let pendingArgs = null;
let dupeAmount = null;
let initialShulkerCount = 0;
const SLOTS_PER_CHEST = 27;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

let logs = [];

function addLog(message) {
  const timestamp = new Date().toLocaleString('en-GB', { timeZone: 'Europe/Istanbul' });
  logs.push(`[${timestamp}] ${message}`);
  if (logs.length > 100) logs.shift();
  console.log(logs[logs.length - 1]);
}

function generateRandomString(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function safeChat(message) {
  const randomString = generateRandomString();
  const messageWithRandom = `${message} [${randomString}]`;
  bot.chat(messageWithRandom);
  addLog(`Chat sent: ${message}`);
}

function openChatWindow() {
  const cmd = spawn('cmd.exe', ['/K', 'echo Type commands (e.g., $start, $stop) to control the bot.']);
  cmd.stdout.on('data', (data) => {
    addLog(`CMD output: ${data.toString()}`);
  });
  cmd.stderr.on('data', (data) => {
    addLog(`CMD error: ${data.toString()}`);
  });
  cmd.stdin.setEncoding('utf8');
  cmd.stdout.setEncoding('utf8');

  let buffer = '';
  cmd.stdout.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\r\n');
    buffer = lines.pop();
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('ECHO is on.')) {
        addLog(`CMD input: ${trimmedLine}`);
        handleChat('nuttle', trimmedLine);
      }
    }
  });

  cmd.on('close', (code) => {
    addLog(`CMD window closed with code ${code}`);
  });
}

bot.once('login', () => {
  addLog('Bot logged in, opening chat window');
  openChatWindow();
});

try {
  if (fs.existsSync('admins.json')) {
    const data = fs.readFileSync('admins.json');
    admins = JSON.parse(data).admins || ['nuttle'];
  }
  if (fs.existsSync('dupe_count.json')) {
    const data = fs.readFileSync('dupe_count.json');
    totalDuped = JSON.parse(data).totalDuped || 0;
  }
} catch (err) {
  addLog(`Error loading files: ${err}`);
}

function saveAdmins() {
  try {
    fs.writeFileSync('admins.json', JSON.stringify({ admins }));
    addLog('Admin list saved');
  } catch (err) {
    addLog(`Error saving admin list: ${err}`);
  }
}

function saveState() {
  try {
    fs.writeFileSync('dupe_count.json', JSON.stringify({ totalDuped }));
    addLog('Dupe count saved');
  } catch (err) {
    addLog(`Error saving dupe count: ${err}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isInventoryFull(threshold = 36) {
  const items = bot.inventory.items();
  const uniqueSlots = new Set(items.map(item => item.slot));
  return uniqueSlots.size >= threshold;
}

function countShulkers(specificType = null) {
  return bot.inventory.items()
    .filter(item => item.name.includes('shulker_box') && (!specificType || item.name === specificType))
    .reduce((sum, item) => sum + item.count, 0);
}

function hasShulkerBox(specificType = null) {
  return bot.inventory.items().some(item => 
    item.name.includes('shulker_box') && (!specificType || item.name === specificType)
  );
}

module.exports = { bot, handleChat, logs };
