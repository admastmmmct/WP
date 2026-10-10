const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function startWhatsApp() {
  // Store session credentials locally in 'auth_info'
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Displays QR code in the console log
    logger: pino({ level: 'silent' }) // Keeps logs clean
  });

  // Save credentials when updated
  sock.ev.on('creds.update', saveCreds);

  // Handle connection events
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        startWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('WhatsApp background bot connected successfully!');
    }
  });

  // Handle incoming messages
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;

    const sender = m.key.remoteJid;
    const messageText = m.message.conversation || m.message.extendedTextMessage?.text;

    console.log(`Received message from ${sender}: ${messageText}`);

    // Simple reply logic
    if (messageText && messageText.toLowerCase() === 'hello') {
      await sock.sendMessage(sender, { text: 'Hello! I am running in the background.' });
    }
  });
}

startWhatsApp();