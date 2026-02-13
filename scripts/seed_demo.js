const { createPool } = require('../src/db');
const dbOps = require('../src/dbOps');

async function seed(shopDomain = 'demo-store.myshopify.com') {
    const pool = createPool(process.env.DATABASE_URL);
    console.log(`Seeding demo data for ${shopDomain}...`);

    try {
        // 1. Ensure Store Exists
        let store = await dbOps.getStoreByShop({ pool, shopDomain });
        if (!store) {
            const res = await pool.query(
                "INSERT INTO stores (shop_domain, plan, onboarding_step) VALUES ($1, $2, $3) RETURNING *",
                [shopDomain, 'growth', 3]
            );
            store = res.rows[0];
        }

        // 2. Default Widget Settings
        await dbOps.upsertWidgetSettings({
            pool,
            storeId: store.id,
            enabled: true,
            placement: 'floating',
            primary_color: '#0F172A',
            heading_text: 'Get restock alerts',
            button_text: 'Notify Me',
            border_radius: 12,
            font_size: 14,
            show_email: true,
            show_whatsapp: true,
            success_heading: "You're on the list!",
            success_text: "We'll notify you soon."
        });

        // 3. Products
        const products = [
            {
                id: 123456789,
                title: "Midnight Sapphire Silk Kurta",
                handle: "midnight-sapphire-kurta",
                image: "https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?q=80&w=600",
                variants: [
                    { id: 4001, title: "S", price: 249900, available: true, sku: 'KRT-SB-S', inv: 9001 },
                    { id: 4002, title: "M", price: 249900, available: false, sku: 'KRT-SB-M', inv: 9002 },
                    { id: 4003, title: "L", price: 249900, available: true, sku: 'KRT-SB-L', inv: 9003 }
                ]
            },
            {
                id: 987654321,
                title: "Classic White Chikan Kurta",
                handle: "classic-white-kurta",
                image: "https://images.unsplash.com/photo-1598418037146-5ec9de3f6955?q=80&w=600",
                variants: [
                    { id: 5001, title: "M", price: 189900, available: false, sku: 'KRT-WC-M', inv: 9004 },
                    { id: 5002, title: "L", price: 189900, available: false, sku: 'KRT-WC-L', inv: 9005 }
                ]
            },
            {
                id: 112233445,
                title: "Emerald Green Velvet Sherwani",
                handle: "emerald-velvet-sherwani",
                image: "https://images.unsplash.com/photo-1610030469617-380f78546b30?q=80&w=600",
                variants: [
                    { id: 6001, title: "L", price: 899900, available: false, sku: 'SHW-EV-L', inv: 9006 },
                    { id: 6002, title: "XL", price: 899900, available: true, sku: 'SHW-EV-XL', inv: 9007 }
                ]
            },
            {
                id: 556677889,
                title: "Royal Gold Zari Odhni",
                handle: "royal-gold-odhni",
                image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600",
                variants: [
                    { id: 7001, title: "One Size", price: 349900, available: false, sku: 'ACC-RGZ-OS', inv: 9008 }
                ]
            },
            {
                id: 998877665,
                title: "Indigo Block Print Nehru Jacket",
                handle: "indigo-nehru-jacket",
                image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=600",
                variants: [
                    { id: 8001, title: "M", price: 429900, available: true, sku: 'JKT-IBP-M', inv: 9009 },
                    { id: 8002, title: "L", price: 429900, available: false, sku: 'JKT-IBP-L', inv: 9010 }
                ]
            }
        ];

        for (const p of products) {
            const dbProduct = await dbOps.upsertProduct({
                pool,
                storeId: store.id,
                shopifyProductId: p.id,
                handle: p.handle,
                title: p.title,
                vendor: '',
                imageUrl: p.image
            });

            for (const v of p.variants) {
                await dbOps.upsertVariant({
                    pool,
                    storeId: store.id,
                    productId: dbProduct.id,
                    shopifyVariantId: v.id,
                    size: v.title,
                    pricePaise: v.price,
                    available: v.available,
                    sku: v.sku,
                    inventoryItemId: v.inv
                });
            }
        }

        console.log("Demo data seeded successfully.");
        return { ok: true };
    } catch (e) {
        console.error("Seeding failed:", e);
        throw e;
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    seed().catch(() => process.exit(1));
}

module.exports = { seed };
