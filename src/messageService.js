function createMessageService({ pool, provider }) {
  return {
    async sendWhatsApp({ storeId, toNumber, template, body, meta }) {
      const msg = {
        toNumber: String(toNumber || ""),
        template: String(template || ""),
        body: String(body || ""),
        provider: provider ? "local" : "none",
        status: "sent",
        meta: meta || {}
      };

      if (provider) provider.sendWhatsApp({ to: msg.toNumber, body: msg.body, meta: msg.meta });
      if (pool) {
        await pool.query(
          "INSERT INTO message_logs(store_id, to_number, template, body, provider, status, meta) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)",
          [storeId, msg.toNumber, msg.template, msg.body, msg.provider, msg.status, JSON.stringify(msg.meta)]
        );
      }
      return msg;
    }
  };
}

module.exports = { createMessageService };

