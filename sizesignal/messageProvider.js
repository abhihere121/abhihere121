const fs = require("fs");
const path = require("path");

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function appendJsonl(filePath, obj) {
  ensureDirForFile(filePath);
  fs.appendFileSync(filePath, `${JSON.stringify(obj)}\n`, "utf8");
}

function createLocalProvider({ messagesFile }) {
  if (!messagesFile) throw new Error("messagesFile is required");
  return {
    sendWhatsApp({ to, body, meta }) {
      const msg = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        channel: "whatsapp",
        provider: "local",
        to,
        body,
        meta: meta || {},
        timestamp: new Date().toISOString()
      };
      appendJsonl(messagesFile, msg);
      return msg;
    }
  };
}

module.exports = { createLocalProvider };

