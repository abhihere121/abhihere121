/**
 * Message Service (Growth Phase)
 * Handles WhatsApp, Email, and 3rd-party integrations like Klaviyo.
 */
function createMessageService({ pool, provider }) {
  return {
    /**
     * Sends a WhatsApp notification
     */
    async sendWhatsApp({ storeId, toNumber, template, body, meta }) {
      const msg = {
        toNumber: String(toNumber || ""),
        template: String(template || ""),
        body: String(body || ""),
        provider: provider ? "local" : "none",
        status: "sent",
        type: "whatsapp",
        meta: meta || {}
      };

      if (provider) await provider.sendWhatsApp({ to: msg.toNumber, body: msg.body, meta: msg.meta });

      if (pool) {
        await pool.query(
          "INSERT INTO message_logs(store_id, to_number, template, body, provider, status, meta) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)",
          [storeId, msg.toNumber, msg.template, msg.body, msg.provider, msg.status, JSON.stringify(msg.meta)]
        );
      }
      return msg;
    },

    /**
     * Sends an Email notification (Mock/Generic)
     */
    async sendEmail({ storeId, toEmail, subject, body, meta }) {
      const msg = {
        toEmail: String(toEmail || ""),
        subject: String(subject || ""),
        body: String(body || ""),
        provider: "internal_smtp",
        status: "sent",
        type: "email",
        meta: meta || {}
      };

      console.log(`[Email] To: ${msg.toEmail} | Subject: ${msg.subject}`);

      if (pool) {
        await pool.query(
          "INSERT INTO message_logs(store_id, to_number, template, body, provider, status, meta) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)",
          [storeId, msg.toEmail, "generic_email", msg.body, msg.provider, msg.status, JSON.stringify(msg.meta)]
        );
      }
      return msg;
    },

    /**
     * Tracks an event in Klaviyo (Mock)
     */
    async trackKlaviyoEvent({ storeId, email, eventName, properties }) {
      const event = {
        email: String(email || ""),
        eventName: String(eventName || ""),
        properties: properties || {},
        timestamp: new Date().toISOString()
      };

      console.log(`[Klaviyo] Event: ${event.eventName} for ${event.email}`);

      // In a real app, this would use the Klaviyo API. 
      // For this demo, we'll log it to a local file/db.
      if (pool) {
        await pool.query(
          "INSERT INTO message_logs(store_id, to_number, template, body, provider, status, meta) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)",
          [storeId, event.email, event.eventName, `Klaviyo Event: ${event.eventName}`, "klaviyo_mock", "tracked", JSON.stringify(event.properties)]
        );
      }
      return event;
    }
  };
}

module.exports = { createMessageService };
