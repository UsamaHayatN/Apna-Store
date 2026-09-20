import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config();

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || "";

async function seed() {
  console.log("------------------------------------------------------------");
  console.log("🌱 E-Commerce Platform Database Seeder (Development)");
  console.log("------------------------------------------------------------");

  if (
    !connectionString ||
    connectionString.includes("YOUR_DATABASE_PASSWORD") ||
    !connectionString.startsWith("postgres")
  ) {
    console.warn(
      "⚠️  Notice: DATABASE_URL is not configured with valid production/remote credentials."
    );
    console.warn(
      "   To seed a live database, update DATABASE_URL in .env with your actual PostgreSQL password."
    );
    console.log(
      "   Database models, relationships, Drizzle migrations, and seed definitions are compiled and ready."
    );
    return;
  }

  const client = postgres(connectionString, { max: 1, prepare: false, ssl: { rejectUnauthorized: false } });
  const db = drizzle(client, { schema });

  try {
    console.log("Connecting to PostgreSQL...");

    // 1. Store Settings
    console.log("Seeding Store Settings...");
    await db
      .insert(schema.storeSettings)
      .values([
        {
          key: "store_name",
          value: { name: "Atelier Menswear & Footwear" },
          description: "Public brand name of the e-commerce store",
          isPublic: true,
        },
        {
          key: "store_currency",
          value: { code: "USD", symbol: "$", decimalPlaces: 2 },
          description: "Primary store currency ISO code",
          isPublic: true,
        },
        {
          key: "shipping_rules",
          value: { freeShippingThreshold: 150.0, standardRate: 15.0 },
          description: "Global delivery pricing rules",
          isPublic: true,
        },
      ])
      .onConflictDoNothing();

    // 2. Roles & Permissions
    console.log("Seeding Roles & Permissions...");
    const [ownerRole] = await db
      .insert(schema.roles)
      .values([
        {
          name: "Store Owner",
          slug: "owner",
          description: "Full administrative and financial access",
          isSystem: true,
        },
        {
          name: "Store Administrator",
          slug: "admin",
          description: "Catalog, orders, and customer management",
          isSystem: true,
        },
        {
          name: "Support Staff",
          slug: "staff",
          description: "Order fulfillment and customer support",
          isSystem: true,
        },
        {
          name: "Customer",
          slug: "customer",
          description: "Standard registered shopping account",
          isSystem: true,
        },
      ])
      .onConflictDoNothing()
      .returning();

    // 3. Product Types (Footwear today, full menswear ready)
    console.log("Seeding Product Types...");
    const [footwearType, apparelType, accessoryType] = await db
      .insert(schema.productTypes)
      .values([
        {
          name: "Footwear",
          slug: "footwear",
          description: "Men's boots, sneakers, loafers, and formal dress shoes",
          hasVariants: true,
          isShippable: true,
        },
        {
          name: "Apparel",
          slug: "apparel",
          description: "Men's shirts, knitwear, trousers, and outerwear",
          hasVariants: true,
          isShippable: true,
        },
        {
          name: "Accessories",
          slug: "accessories",
          description: "Leather goods, belts, wallets, and lifestyle accessories",
          hasVariants: true,
          isShippable: true,
        },
      ])
      .onConflictDoNothing()
      .returning();

    // 4. Flexible Attributes & Values
    console.log("Seeding Attributes & Values...");
    const [shoeSizeAttr, colorAttr, apparelSizeAttr, materialAttr] = await db
      .insert(schema.attributes)
      .values([
        {
          code: "shoe_size",
          name: "Shoe Size (EU)",
          type: "button_pill",
          displayOrder: 1,
        },
        {
          code: "color",
          name: "Color",
          type: "color_swatch",
          displayOrder: 2,
        },
        {
          code: "apparel_size",
          name: "Size",
          type: "button_pill",
          displayOrder: 3,
        },
        {
          code: "material",
          name: "Material",
          type: "select",
          displayOrder: 4,
        },
      ])
      .onConflictDoNothing()
      .returning();

    if (shoeSizeAttr && colorAttr) {
      // Attribute values for shoe sizes
      await db
        .insert(schema.attributeValues)
        .values([
          {
            attributeId: shoeSizeAttr.id,
            value: "41",
            label: "EU 41 / US 8",
            sortOrder: 1,
            metadata: { us: "8", uk: "7.5", cm: "26.0" },
          },
          {
            attributeId: shoeSizeAttr.id,
            value: "42",
            label: "EU 42 / US 9",
            sortOrder: 2,
            metadata: { us: "9", uk: "8.5", cm: "26.5" },
          },
          {
            attributeId: shoeSizeAttr.id,
            value: "43",
            label: "EU 43 / US 10",
            sortOrder: 3,
            metadata: { us: "10", uk: "9.5", cm: "27.5" },
          },
          {
            attributeId: shoeSizeAttr.id,
            value: "44",
            label: "EU 44 / US 11",
            sortOrder: 4,
            metadata: { us: "11", uk: "10.5", cm: "28.0" },
          },
        ])
        .onConflictDoNothing();

      // Attribute values for colors
      await db
        .insert(schema.attributeValues)
        .values([
          {
            attributeId: colorAttr.id,
            value: "cognac_brown",
            label: "Cognac Brown",
            colorHex: "#7B3F00",
            sortOrder: 1,
          },
          {
            attributeId: colorAttr.id,
            value: "onyx_black",
            label: "Onyx Black",
            colorHex: "#111111",
            sortOrder: 2,
          },
          {
            attributeId: colorAttr.id,
            value: "vintage_white",
            label: "Vintage White",
            colorHex: "#F5F5F0",
            sortOrder: 3,
          },
        ])
        .onConflictDoNothing();
    }

    // 5. Hierarchical Categories
    console.log("Seeding Categories...");
    const [menRoot] = await db
      .insert(schema.categories)
      .values([
        {
          name: "Men",
          slug: "men",
          description: "All menswear and footwear categories",
          level: 0,
          path: "/men",
          sortOrder: 1,
        },
      ])
      .onConflictDoNothing()
      .returning();

    if (menRoot) {
      const [footwearCat, apparelCat] = await db
        .insert(schema.categories)
        .values([
          {
            parentId: menRoot.id,
            name: "Footwear",
            slug: "footwear",
            description: "Handcrafted leather dress shoes, boots, and sneakers",
            level: 1,
            path: "/men/footwear",
            sortOrder: 1,
          },
          {
            parentId: menRoot.id,
            name: "Apparel",
            slug: "clothing",
            description: "Tailored shirts, trousers, and knitwear",
            level: 1,
            path: "/men/clothing",
            sortOrder: 2,
          },
        ])
        .onConflictDoNothing()
        .returning();

      if (footwearCat) {
        const [sneakersCat, dressShoesCat] = await db
          .insert(schema.categories)
          .values([
            {
              parentId: footwearCat.id,
              name: "Sneakers",
              slug: "sneakers",
              description: "Italian leather low-top and runner sneakers",
              level: 2,
              path: "/men/footwear/sneakers",
              sortOrder: 1,
            },
            {
              parentId: footwearCat.id,
              name: "Dress Shoes",
              slug: "dress-shoes",
              description: "Goodyear welted Oxfords and Derbies",
              level: 2,
              path: "/men/footwear/dress-shoes",
              sortOrder: 2,
            },
          ])
          .onConflictDoNothing()
          .returning();

        // 6. Sample Products & Variants
        if (footwearType && dressShoesCat) {
          console.log("Seeding Products and Variants...");
          const [oxfordProduct] = await db
            .insert(schema.products)
            .values([
              {
                productTypeId: footwearType.id,
                primaryCategoryId: dressShoesCat.id,
                brand: "Atelier Artisans",
                title: "The Heritage Cap-Toe Oxford",
                slug: "the-heritage-cap-toe-oxford",
                modelCode: "OXF-HERITAGE-V1",
                shortDescription: "Handcrafted Goodyear-welted French calfskin dress shoe.",
                description:
                  "Constructed using traditional English benchcraft techniques, featuring full-grain French calfskin leather, vegetable-tanned leather soles, and cork-filled footbeds that mold to your feet over time.",
                basePrice: "295.00",
                compareAtPrice: "350.00",
                costPrice: "110.00",
                status: "active",
                isFeatured: true,
                isNewArrival: false,
                isOnSale: false,
                seoTitle: "Men's Heritage Cap-Toe Oxford Shoe | Atelier",
                seoDescription: "Shop handcrafted Goodyear-welted dress shoes in full-grain French calfskin.",
              },
            ])
            .onConflictDoNothing()
            .returning();

          if (oxfordProduct) {
            // Seed Oxford Variants with deterministic combination hash & inventory
            const variantsData = [
              {
                sku: "OXF-COG-41",
                combinationHash: "color:cognac_brown|shoe_size:41",
                title: "Cognac Brown / EU 41",
                stock: 12,
              },
              {
                sku: "OXF-COG-42",
                combinationHash: "color:cognac_brown|shoe_size:42",
                title: "Cognac Brown / EU 42",
                stock: 18,
              },
              {
                sku: "OXF-COG-43",
                combinationHash: "color:cognac_brown|shoe_size:43",
                title: "Cognac Brown / EU 43",
                stock: 10,
              },
              {
                sku: "OXF-BLK-42",
                combinationHash: "color:onyx_black|shoe_size:42",
                title: "Onyx Black / EU 42",
                stock: 15,
              },
            ];

            for (const v of variantsData) {
              const [variant] = await db
                .insert(schema.productVariants)
                .values({
                  productId: oxfordProduct.id,
                  sku: v.sku,
                  combinationHash: v.combinationHash,
                  title: v.title,
                  attributesSummary: {
                    color: v.combinationHash.includes("cognac_brown")
                      ? "Cognac Brown"
                      : "Onyx Black",
                    shoe_size: v.sku.slice(-2),
                  },
                })
                .onConflictDoNothing()
                .returning();

              if (variant) {
                await db
                  .insert(schema.inventoryLevels)
                  .values({
                    variantId: variant.id,
                    stockQuantity: v.stock,
                    reservedQuantity: 0,
                    lowStockThreshold: 3,
                  })
                  .onConflictDoNothing();
              }
            }
          }
        }
      }
    }

    // 7. Seed Sample Coupons
    console.log("Seeding Coupons...");
    await db
      .insert(schema.coupons)
      .values([
        {
          code: "GENTLEMAN15",
          description: "15% off first order for registered gentlemen",
          discountType: "percentage",
          discountValue: "15.00",
          minimumOrderAmount: "100.00",
          usageLimitPerCustomer: 1,
          startsAt: new Date(),
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      ])
      .onConflictDoNothing();

    console.log("✅ Seed completed successfully!");
  } catch (err) {
    console.error("❌ Seed encountered an error:", err);
  } finally {
    await client.end();
  }
}

seed();
