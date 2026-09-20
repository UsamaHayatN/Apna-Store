import { eq, desc, asc, and, or, sql, like, ilike, isNull, isNotNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import {
  products,
  categories,
  productTypes,
  productMedia,
  productVariants,
  inventoryLevels,
} from "@/lib/db/schema";
import {
  Product,
  Category,
  ProductType,
  ProductMedia,
  PaginatedResult,
} from "@/types";
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQueryInput,
} from "@/lib/validation/product";
import { recordAuditLog } from "@/lib/audit";
import { generateSlug } from "@/lib/utils/slug";
import { variantService } from "./variant-service";
import { attributeService } from "./attribute-service";

// =============================================================================
// LOOKUP TABLE CACHE (Categories + Types rarely change — cache for 5 minutes)
// =============================================================================
const LOOKUP_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let _catCache: { data: Map<string, Category>; ts: number } | null = null;
let _typeCache: { data: Map<string, ProductType>; ts: number } | null = null;

async function getCachedCategoryMap(db: ReturnType<typeof getDb>): Promise<Map<string, Category>> {
  const now = Date.now();
  if (_catCache && now - _catCache.ts < LOOKUP_CACHE_TTL) return _catCache.data;
  const rows = await db.select().from(categories);
  const map = new Map<string, Category>(
    rows.map((c) => [
      c.id,
      {
        id: c.id,
        parentId: c.parentId,
        name: c.name,
        slug: c.slug,
        description: c.description,
        imageUrl: c.imageUrl,
        imageAlt: c.imageAlt,
        sortOrder: c.sortOrder,
        isActive: c.isActive,
        isFeatured: c.isFeatured,
        level: c.level,
        path: c.path,
        seoTitle: c.seoTitle,
        seoDescription: c.seoDescription,
        metadata: c.metadata as Record<string, unknown> || {},
        deletedAt: c.deletedAt ? c.deletedAt.toISOString() : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      },
    ])
  );
  _catCache = { data: map, ts: now };
  return map;
}

async function getCachedTypeMap(db: ReturnType<typeof getDb>): Promise<Map<string, ProductType>> {
  const now = Date.now();
  if (_typeCache && now - _typeCache.ts < LOOKUP_CACHE_TTL) return _typeCache.data;
  const rows = await db.select().from(productTypes);
  const map = new Map<string, ProductType>(
    rows.map((t) => [
      t.id,
      {
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        hasVariants: t.hasVariants,
        isShippable: t.isShippable,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      },
    ])
  );
  _typeCache = { data: map, ts: now };
  return map;
}

// =============================================================================
// SEED TAXONOMY & PRODUCTS DATA (For in-memory development & initial DB seeding)
// =============================================================================

export const SEED_PRODUCT_TYPES: ProductType[] = [
  {
    id: "pt-footwear-01",
    name: "Footwear",
    slug: "footwear",
    description: "Men's boots, dress shoes, loafers, and sneakers",
    hasVariants: true,
    isShippable: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "pt-apparel-02",
    name: "Apparel",
    slug: "apparel",
    description: "Men's tailored shirts, knitwear, trousers, and outerwear",
    hasVariants: true,
    isShippable: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "pt-accessories-03",
    name: "Accessories",
    slug: "accessories",
    description: "Handmade leather belts, wallets, bags, and fine accessories",
    hasVariants: true,
    isShippable: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const SEED_CATEGORIES: Category[] = [
  {
    id: "cat-men-root",
    parentId: null,
    name: "Men's Collection",
    slug: "men",
    description: "All menswear, footwear, and accessories",
    imageUrl: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Men's Sartorial Collection",
    sortOrder: 1,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-boots",
    parentId: "cat-men-root",
    name: "Boots",
    slug: "boots",
    description: "Handcrafted Chelsea boots, service boots, and combat boots",
    imageUrl: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Handcrafted Men's Boots Collection",
    sortOrder: 2,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-dress-shoes",
    parentId: "cat-men-root",
    name: "Dress Shoes",
    slug: "dress-shoes",
    description: "Goodyear welted Oxfords, Derbies, and wholecuts",
    imageUrl: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Goodyear-Welted Dress Shoes",
    sortOrder: 3,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-sneakers",
    parentId: "cat-men-root",
    name: "Sneakers",
    slug: "sneakers",
    description: "Minimalist Italian leather sneakers and runners",
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Minimalist Italian Leather Sneakers",
    sortOrder: 4,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-loafers",
    parentId: "cat-men-root",
    name: "Loafers",
    slug: "loafers",
    description: "Classic penny loafers and tassel loafers in calfskin",
    imageUrl: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Handsewn Calfskin Loafers",
    sortOrder: 5,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-knitwear",
    parentId: "cat-men-root",
    name: "Knitwear",
    slug: "knitwear",
    description: "Cashmere and extrafine merino wool sweaters",
    imageUrl: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Merino & Cashmere Knitwear",
    sortOrder: 6,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-outerwear",
    parentId: "cat-men-root",
    name: "Outerwear",
    slug: "outerwear",
    description: "Wool overcoats, tailored trench coats, and jackets",
    imageUrl: "https://images.unsplash.com/photo-1544923246-77307dd654cb?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Tailored Menswear Outerwear",
    sortOrder: 7,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-leather-goods",
    parentId: "cat-men-root",
    name: "Leather Goods",
    slug: "leather-goods",
    description: "Bridle leather belts, cardholders, and weekenders",
    imageUrl: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Bridle Leather Goods & Belts",
    sortOrder: 8,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-casual-shoes",
    parentId: "cat-men-root",
    name: "Casual Shoes",
    slug: "casual-shoes",
    description: "Handcrafted driving moccasins, canvas slip-ons, and relaxed leather footwear",
    imageUrl: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Casual Footwear & Moccasins",
    sortOrder: 9,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-sports-shoes",
    parentId: "cat-men-root",
    name: "Sports Shoes",
    slug: "sports-shoes",
    description: "High-performance road runners, carbon trail runners, and athletic trainers",
    imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop",
    imageAlt: "High Performance Sports Shoes",
    sortOrder: 10,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-sandals",
    parentId: "cat-men-root",
    name: "Sandals",
    slug: "sandals",
    description: "Italian calfskin slides, woven fisherman sandals, and refined summer footwear",
    imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Italian Leather Sandals & Slides",
    sortOrder: 11,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-clothing",
    parentId: "cat-men-root",
    name: "Clothing",
    slug: "clothing",
    description: "Fine menswear, tailored shirts, knitwear, and trousers",
    imageUrl: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Tailored Menswear & Apparel",
    sortOrder: 12,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "cat-accessories",
    parentId: "cat-men-root",
    name: "Accessories",
    slug: "accessories",
    description: "Bridle leather belts, cardholders, and fine accessories",
    imageUrl: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?q=80&w=800&auto=format&fit=crop",
    imageAlt: "Luxury Leather Accessories",
    sortOrder: 13,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-oxford-001",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-dress-shoes",
    brand: "Atelier Artisans",
    title: "The Heritage Cap-Toe Oxford",
    slug: "the-heritage-cap-toe-oxford",
    modelCode: "OXF-HERITAGE-V1",
    shortDescription: "Handcrafted Goodyear-welted French calfskin dress shoe.",
    description:
      "Constructed using traditional English benchcraft techniques, featuring full-grain French calfskin leather, vegetable-tanned leather soles, and cork-filled footbeds that mold to your feet over time.",
    basePrice: 295.0,
    compareAtPrice: 350.0,
    costPrice: 110.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Men's Heritage Cap-Toe Oxford Shoe | Atelier Artisans",
    seoDescription:
      "Shop handcrafted Goodyear-welted dress shoes in full-grain French calfskin. Unmatched comfort and enduring elegance.",
    variantCount: 4,
    stockCount: 55,
    media: [
      {
        id: "media-oxf-01",
        productId: "prod-oxford-001",
        url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
        altText: "Heritage Cap-Toe Oxford in French calfskin leather",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-15T12:00:00.000Z",
  },
  {
    id: "prod-boot-002",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-boots",
    brand: "Atelier Artisans",
    title: "Goodyear-Welted Chelsea Boot",
    slug: "goodyear-welted-chelsea-boot",
    modelCode: "BOOT-CHL-001",
    shortDescription: "Sleek European silhouette Chelsea boot in waterproof oiled suede.",
    description:
      "An impeccably proportioned Chelsea boot cut from water-resistant reverse kudu suede. Features twin pull tabs, heavy-duty elastic webbing, and a durable Vibram rubber-injected half sole.",
    basePrice: 395.0,
    compareAtPrice: null,
    costPrice: 145.0,
    status: "active",
    isFeatured: true,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Goodyear-Welted Chelsea Boot | Atelier Artisans",
    seoDescription:
      "Versatile luxury Chelsea boot in oiled suede with Vibram half sole. Designed for all-day comfort.",
    variantCount: 8,
    stockCount: 64,
    media: [
      {
        id: "media-boot-01",
        productId: "prod-boot-002",
        url: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80",
        altText: "Goodyear-Welted Chelsea Boot in espresso suede",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-02T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-12T14:30:00.000Z",
    updatedAt: "2026-01-18T09:15:00.000Z",
  },
  {
    id: "prod-sneaker-003",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sneakers",
    brand: "Atelier Artisans",
    title: "Minimalist Calfskin Court Sneaker",
    slug: "minimalist-calfskin-court-sneaker",
    modelCode: "SNK-CRT-001",
    shortDescription: "Understated low-top sneaker made in Civitanova Marche, Italy.",
    description:
      "A testament to reductive Italian design. Clean lines, discreet tonal stitching, buttery soft calfskin lining, and an ultra-durable Margom rubber cupsole.",
    basePrice: 265.0,
    compareAtPrice: 310.0,
    costPrice: 95.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Minimalist Calfskin Court Sneaker | Atelier Artisans",
    seoDescription:
      "Italian low-top leather sneaker with Margom cupsole. Premium everyday luxury.",
    variantCount: 10,
    stockCount: 82,
    media: [
      {
        id: "media-snk-01",
        productId: "prod-sneaker-003",
        url: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?auto=format&fit=crop&w=800&q=80",
        altText: "Minimalist Court Sneaker in pristine white Italian calfskin",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-03T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-15T11:00:00.000Z",
    updatedAt: "2026-01-20T16:45:00.000Z",
  },
  {
    id: "prod-loafer-004",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-loafers",
    brand: "Atelier Artisans",
    title: "Handsewn French Calfskin Penny Loafer",
    slug: "handsewn-penny-loafer",
    modelCode: "LFR-PNY-001",
    shortDescription: "Unlined penny loafer with hand-stitched apron and flexible leather sole.",
    description:
      "Crafted from supple French boxcalf leather. The unlined vamp provides instant slipper-like comfort straight out of the box, resting on a single oak-bark tanned leather outsole.",
    basePrice: 320.0,
    compareAtPrice: null,
    costPrice: 120.0,
    status: "active",
    isFeatured: false,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Handsewn Penny Loafer in Boxcalf | Atelier Artisans",
    seoDescription: "Classic penny loafer with handsewn moccasin stitch and leather sole.",
    variantCount: 6,
    stockCount: 42,
    media: [
      {
        id: "media-lfr-01",
        productId: "prod-loafer-004",
        url: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80",
        altText: "Handsewn Penny Loafer in rich burgundy",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-04T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-18T08:20:00.000Z",
    updatedAt: "2026-01-22T10:00:00.000Z",
  },
  {
    id: "prod-knitwear-005",
    productTypeId: "pt-apparel-02",
    primaryCategoryId: "cat-knitwear",
    brand: "Atelier Knitwear",
    title: "Merino Wool Cashmere Rollneck",
    slug: "merino-wool-cashmere-rollneck",
    modelCode: "KNT-RLN-001",
    shortDescription: "Ultra-fine gauge knit spun from 90% Australian merino and 10% Mongolian cashmere.",
    description:
      "A versatile cold-weather staple with a relaxed tailored silhouette. Seamless construction with ribbed collar, cuffs, and hem. Breathable, thermoregulating, and exceptionally soft.",
    basePrice: 210.0,
    compareAtPrice: null,
    costPrice: 75.0,
    status: "draft",
    isFeatured: false,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Merino Wool & Cashmere Rollneck Sweater",
    seoDescription: "Luxury knitwear combining merino wool softness with Mongolian cashmere warmth.",
    variantCount: 4,
    stockCount: 30,
    media: [
      {
        id: "media-knt-01",
        productId: "prod-knitwear-005",
        url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80",
        altText: "Merino Wool Cashmere Rollneck Sweater in heather charcoal",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-05T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-20T15:00:00.000Z",
    updatedAt: "2026-01-25T11:30:00.000Z",
  },
  {
    id: "prod-coat-006",
    productTypeId: "pt-apparel-02",
    primaryCategoryId: "cat-outerwear",
    brand: "Atelier Tailoring",
    title: "Double-Breasted Cashmere Blend Overcoat",
    slug: "double-breasted-cashmere-blend-overcoat",
    modelCode: "OUT-OVC-001",
    shortDescription: "Hand-finished double-breasted overcoat in heavy melton wool and cashmere.",
    description:
      "Designed with broad peak lapels, deep horn buttons, and an unstructured shoulder for natural drape over tailoring. Fully lined with cupro silk.",
    basePrice: 680.0,
    compareAtPrice: 750.0,
    costPrice: 260.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Double-Breasted Wool & Cashmere Overcoat | Atelier",
    seoDescription: "Impeccably tailored double-breasted winter overcoat in navy melton wool.",
    variantCount: 5,
    stockCount: 18,
    media: [
      {
        id: "media-coat-01",
        productId: "prod-coat-006",
        url: "https://images.unsplash.com/photo-1544923246-77307dd654cb?auto=format&fit=crop&w=800&q=80",
        altText: "Double-Breasted Cashmere Blend Overcoat in Midnight Navy",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-06T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-22T09:30:00.000Z",
    updatedAt: "2026-01-28T14:10:00.000Z",
  },
  {
    id: "prod-belt-007",
    productTypeId: "pt-accessories-03",
    primaryCategoryId: "cat-leather-goods",
    brand: "Atelier Leather",
    title: "English Bridle Leather Dress Belt",
    slug: "english-bridle-leather-dress-belt",
    modelCode: "ACC-BLT-001",
    shortDescription: "Sedgwick bridle leather belt with solid brass buckle.",
    description:
      "Cut by hand from genuine J&E Sedgwick English bridle leather. Edge-creased, burnished with beeswax, and secured with solid brass hardware in a brushed palladium finish.",
    basePrice: 115.0,
    compareAtPrice: null,
    costPrice: 40.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "English Bridle Leather Dress Belt | Atelier Accessories",
    seoDescription: "Handmade English bridle leather belt with solid brass buckle.",
    variantCount: 5,
    stockCount: 75,
    media: [
      {
        id: "media-blt-01",
        productId: "prod-belt-007",
        url: "https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=800&q=80",
        altText: "English Bridle Leather Dress Belt in Havana Brown",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-07T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-24T12:00:00.000Z",
    updatedAt: "2026-01-29T16:00:00.000Z",
  },
  {
    id: "prod-brogue-008",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-dress-shoes",
    brand: "Atelier Artisans",
    title: "Archived Wholecut Oxford Dress Shoe",
    slug: "archived-wholecut-oxford-dress-shoe",
    modelCode: "OXF-WHL-ARCHIVED",
    shortDescription: "Historic wholecut model retired from active seasonal rotation.",
    description:
      "Masterfully cut from a single continuous piece of museum calf leather. Retired from active retail production for archival reference.",
    basePrice: 425.0,
    compareAtPrice: null,
    costPrice: 160.0,
    status: "archived",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Archived Wholecut Oxford Dress Shoe",
    seoDescription: "Archival record of wholecut oxford.",
    deletedAt: "2026-02-01T10:00:00.000Z",
    variantCount: 2,
    stockCount: 0,
    media: [
      {
        id: "media-brogue-01",
        productId: "prod-brogue-008",
        url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80",
        altText: "Wholecut Oxford in Museum Calf",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-08T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-08T10:00:00.000Z",
    updatedAt: "2026-02-01T10:00:00.000Z",
  },
  {
    id: "prod-boot-008",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-boots",
    brand: "Atelier Workwear",
    title: "Horween Chromexcel Service Boot",
    slug: "horween-chromexcel-service-boot",
    modelCode: "BOOT-SRV-008",
    shortDescription: "Rugged 8-eyelet combat silhouette on Commando rubber soles.",
    description:
      "Engineered from full-grain Horween Chromexcel pull-up leather with Goodyear storm welt construction, brass eyelets, and rugged Commando rubber outsoles.",
    basePrice: 420.0,
    compareAtPrice: null,
    costPrice: 155.0,
    status: "active",
    isFeatured: true,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Horween Chromexcel Service Boot | Atelier Footwear",
    seoDescription: "Rugged 8-eyelet service boot in genuine Horween Chromexcel pull-up leather.",
    variantCount: 6,
    stockCount: 45,
    media: [
      {
        id: "m-srv-01",
        productId: "prod-boot-008",
        url: "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=800&q=80",
        altText: "Horween Chromexcel Service Boot",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-10T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-10T10:00:00.000Z",
    updatedAt: "2026-01-20T10:00:00.000Z",
  },
  {
    id: "prod-snk-009",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sneakers",
    brand: "Atelier Sport",
    title: "Vintage Retro Runner 77",
    slug: "vintage-retro-runner-77",
    modelCode: "SNK-RETRO-009",
    shortDescription: "Low-profile retro trainer combining calfskin suede and nylon mesh.",
    description:
      "A tribute to classic 1970s running silhouettes. Features Italian suede overlays, featherlight technical mesh, and an EVA cushioned midsole with gum waffle tread.",
    basePrice: 185.0,
    compareAtPrice: 220.0,
    costPrice: 65.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Vintage Retro Runner 77 | Atelier Sport",
    seoDescription: "Iconic 1970s running silhouette in Italian suede and technical mesh.",
    variantCount: 5,
    stockCount: 60,
    media: [
      {
        id: "m-retro-01",
        productId: "prod-snk-009",
        url: "https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80",
        altText: "Vintage Retro Runner 77",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-11T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-11T12:00:00.000Z",
    updatedAt: "2026-01-22T14:00:00.000Z",
  },
  {
    id: "prod-dress-010",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-dress-shoes",
    brand: "Atelier Artisans",
    title: "Museum Calf Wholecut Oxford",
    slug: "museum-calf-wholecut-oxford",
    modelCode: "OXF-WHL-010",
    shortDescription: "Masterfully sculpted wholecut oxford cut from a single piece of calfskin.",
    description:
      "Handcrafted without external seams from hand-mottled Ilcea museum calfskin. Goodyear-welted with closed-channel oak bark tanned leather soles.",
    basePrice: 445.0,
    compareAtPrice: null,
    costPrice: 175.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Museum Calf Wholecut Oxford | Atelier Dress Shoes",
    seoDescription: "Seamless wholecut dress shoe in marbled Italian museum calfskin.",
    variantCount: 6,
    stockCount: 30,
    media: [
      {
        id: "m-whl-01",
        productId: "prod-dress-010",
        url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
        altText: "Museum Calf Wholecut Oxford",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-12T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-12T09:00:00.000Z",
    updatedAt: "2026-01-25T11:00:00.000Z",
  },
  {
    id: "prod-lfr-011",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-loafers",
    brand: "Atelier Leisure",
    title: "Belgian Loafer in Snuff Suede",
    slug: "belgian-loafer-snuff-suede",
    modelCode: "LFR-BEL-011",
    shortDescription: "Unlined snuff suede Belgian loafer with petite leather bow accent.",
    description:
      "Crafted with unlined Repello suede for glove-like softness. Flexible single leather sole with Blake-stitched waist and distinctive apron piping.",
    basePrice: 280.0,
    compareAtPrice: null,
    costPrice: 95.0,
    status: "active",
    isFeatured: false,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Belgian Loafer in Snuff Suede | Atelier Loafers",
    seoDescription: "Unlined Belgian loafer in butter-soft snuff suede.",
    variantCount: 5,
    stockCount: 40,
    media: [
      {
        id: "m-bel-01",
        productId: "prod-lfr-011",
        url: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80",
        altText: "Belgian Loafer in Snuff Suede",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-13T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-13T10:00:00.000Z",
    updatedAt: "2026-01-26T15:00:00.000Z",
  },
  {
    id: "prod-boot-012",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-boots",
    brand: "Atelier Footwear",
    title: "Handmade Kudu Suede Chukka Boot",
    slug: "handmade-kudu-suede-chukka-boot",
    modelCode: "BOOT-CHK-012",
    shortDescription: "Versatile 3-eyelet desert boot in rugged South African kudu reverse suede.",
    description:
      "Natural scars and character marks make every pair unique. Features water-resistant reverse kudu suede, storm welting, and plantation crepe soles.",
    basePrice: 345.0,
    compareAtPrice: 390.0,
    costPrice: 125.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Handmade Kudu Suede Chukka Boot | Atelier Boots",
    seoDescription: "Rugged kudu suede chukka boot on natural plantation crepe soles.",
    variantCount: 4,
    stockCount: 25,
    media: [
      {
        id: "m-chk-01",
        productId: "prod-boot-012",
        url: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?auto=format&fit=crop&w=800&q=80",
        altText: "Handmade Kudu Suede Chukka Boot",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-14T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-14T11:00:00.000Z",
    updatedAt: "2026-01-27T16:00:00.000Z",
  },
  {
    id: "prod-casual-013",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-casual-shoes",
    brand: "Atelier Leisure",
    title: "Supple Deerskin Driving Moccasin",
    slug: "supple-deerskin-driving-moccasin",
    modelCode: "CAS-DRV-013",
    shortDescription: "Hand-stitched driving moccasin with segmented rubber pebble sole.",
    description:
      "Crafted from ultra-pliable wild deerskin that breathes naturally. Features rubber pebble grips extending through the heel for automotive precision.",
    basePrice: 240.0,
    compareAtPrice: null,
    costPrice: 85.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Supple Deerskin Driving Moccasin | Atelier Casual",
    seoDescription: "Italian deerskin driving shoe with rubber pebble sole.",
    variantCount: 5,
    stockCount: 35,
    media: [
      {
        id: "m-drv-01",
        productId: "prod-casual-013",
        url: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80",
        altText: "Supple Deerskin Driving Moccasin",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-15T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-15T12:00:00.000Z",
    updatedAt: "2026-01-28T17:00:00.000Z",
  },
  {
    id: "prod-casual-014",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-casual-shoes",
    brand: "Atelier Everyday",
    title: "Heavyweight Waxed Canvas Slip-On",
    slug: "heavyweight-waxed-canvas-slip-on",
    modelCode: "CAS-SLP-014",
    shortDescription: "Weather-resistant 18oz waxed canvas slip-on shoe with vulcanized foxing.",
    description:
      "Constructed from British Millerain waxed cotton canvas with elastic side gores and a vulcanized natural rubber siped sole.",
    basePrice: 145.0,
    compareAtPrice: 175.0,
    costPrice: 48.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Heavyweight Waxed Canvas Slip-On | Atelier Casual",
    seoDescription: "Weather-resistant waxed canvas slip-on with vulcanized siped sole.",
    variantCount: 4,
    stockCount: 50,
    media: [
      {
        id: "m-slp-01",
        productId: "prod-casual-014",
        url: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=800&q=80",
        altText: "Heavyweight Waxed Canvas Slip-On",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-16T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-16T13:00:00.000Z",
    updatedAt: "2026-01-29T10:00:00.000Z",
  },
  {
    id: "prod-sports-015",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sports-shoes",
    brand: "Atelier Tech",
    title: "AeroStride Carbon Trail Runner",
    slug: "aerostride-carbon-trail-runner",
    modelCode: "SPT-TRL-015",
    shortDescription: "Propulsive trail running shoe with full-length curved carbon fiber plate.",
    description:
      "Designed for technical mountain terrain with supercritical nitrogen-infused foam, a tuned carbon composite plate, and 5mm multi-directional Vibram Megagrip lugs.",
    basePrice: 195.0,
    compareAtPrice: null,
    costPrice: 72.0,
    status: "active",
    isFeatured: true,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "AeroStride Carbon Trail Runner | Atelier Athletic",
    seoDescription: "Technical trail runner with full-length carbon plate and Vibram Megagrip.",
    variantCount: 6,
    stockCount: 55,
    media: [
      {
        id: "m-trl-01",
        productId: "prod-sports-015",
        url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
        altText: "AeroStride Carbon Trail Runner",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-17T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-17T08:00:00.000Z",
    updatedAt: "2026-01-30T09:00:00.000Z",
  },
  {
    id: "prod-sports-016",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sports-shoes",
    brand: "Atelier Tech",
    title: "Performance Court Cross-Trainer",
    slug: "performance-court-cross-trainer",
    modelCode: "SPT-CRS-016",
    shortDescription: "High-stability cross-trainer with lateral TPU outrigger and dual-density foam.",
    description:
      "Engineered for high-intensity lifting and agile court movements. Non-marking gum rubber flat platform with reinforced Kevlar side guards.",
    basePrice: 160.0,
    compareAtPrice: 185.0,
    costPrice: 58.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Performance Court Cross-Trainer | Atelier Sports",
    seoDescription: "Gym and agility training shoe with lateral outrigger stability.",
    variantCount: 5,
    stockCount: 42,
    media: [
      {
        id: "m-crs-01",
        productId: "prod-sports-016",
        url: "https://images.unsplash.com/photo-1579338559194-a162d19bf842?auto=format&fit=crop&w=800&q=80",
        altText: "Performance Court Cross-Trainer",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-18T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-18T10:00:00.000Z",
    updatedAt: "2026-01-30T11:00:00.000Z",
  },
  {
    id: "prod-sandal-017",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sandals",
    brand: "Atelier Riviera",
    title: "Tuscan Vachetta Leather Slide",
    slug: "tuscan-vachetta-leather-slide",
    modelCode: "SAN-SLD-017",
    shortDescription: "Hand-molded vegetable-tanned leather slide sandal with ergonomic arch bed.",
    description:
      "Made by master artisans in Florence using pure vegetable-tanned Tuscan vachetta that patinas richly over time. Anatomical cork-latex footbed covered in glove leather.",
    basePrice: 175.0,
    compareAtPrice: null,
    costPrice: 62.0,
    status: "active",
    isFeatured: false,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Tuscan Vachetta Leather Slide | Atelier Sandals",
    seoDescription: "Artisanal Tuscan leather slide sandal with anatomical footbed.",
    variantCount: 4,
    stockCount: 38,
    media: [
      {
        id: "m-sld-01",
        productId: "prod-sandal-017",
        url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=800&q=80",
        altText: "Tuscan Vachetta Leather Slide",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-19T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-19T11:00:00.000Z",
    updatedAt: "2026-01-31T14:00:00.000Z",
  },
  {
    id: "prod-sandal-018",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sandals",
    brand: "Atelier Riviera",
    title: "Artisanal Woven Fisherman Sandal",
    slug: "artisanal-woven-fisherman-sandal",
    modelCode: "SAN-FSH-018",
    shortDescription: "Closed-toe woven leather sandal with solid brass buckle closure.",
    description:
      "Interlocking straps of vegetable-tanned calfskin protect toes while promoting maximum summer airflow. Hand-stitched to a flexible water-resistant leather sole.",
    basePrice: 225.0,
    compareAtPrice: 260.0,
    costPrice: 80.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Artisanal Woven Fisherman Sandal | Atelier Footwear",
    seoDescription: "Traditional woven leather fisherman sandal in rich cognac calfskin.",
    variantCount: 4,
    stockCount: 28,
    media: [
      {
        id: "m-fsh-01",
        productId: "prod-sandal-018",
        url: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80",
        altText: "Artisanal Woven Fisherman Sandal",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-20T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-20T12:00:00.000Z",
    updatedAt: "2026-02-01T15:00:00.000Z",
  },
  {
    id: "prod-dress-019",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-dress-shoes",
    brand: "Atelier Footwear",
    title: "Cap-Toe Adelaide Oxford in Espresso",
    slug: "cap-toe-adelaide-oxford-espresso",
    modelCode: "OXF-ADL-019",
    shortDescription: "Distinctive Adelaide u-throat oxford in burnished deep espresso calfskin.",
    description:
      "Showcasing a classic Adelaide u-throat framing fine punch-hole brogue detailing. Goodyear welted on a beveled fiddleback waist leather sole.",
    basePrice: 360.0,
    compareAtPrice: null,
    costPrice: 130.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Cap-Toe Adelaide Oxford in Espresso | Atelier Dress Shoes",
    seoDescription: "Classic Adelaide brogue oxford with fiddleback waist leather sole.",
    variantCount: 5,
    stockCount: 32,
    media: [
      {
        id: "m-adl-01",
        productId: "prod-dress-019",
        url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
        altText: "Cap-Toe Adelaide Oxford in Espresso",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-21T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-21T14:00:00.000Z",
    updatedAt: "2026-02-02T16:00:00.000Z",
  },
  {
    id: "prod-dress-020",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-dress-shoes",
    brand: "Atelier Artisans",
    title: "Double Monk Strap in Parisian Museum Calf",
    slug: "double-monk-strap-parisian-calf",
    modelCode: "MNK-DBL-020",
    shortDescription: "Elegant double monk strap with silver palladium buckles and cap toe.",
    description:
      "Meticulously lasted from French museum calfskin with dual functional buckles and hidden elastic gussets for effortless slip-on comfort.",
    basePrice: 385.0,
    compareAtPrice: 420.0,
    costPrice: 140.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Double Monk Strap in Parisian Museum Calf | Atelier Footwear",
    seoDescription: "Goodyear-welted double monk strap dress shoes with palladium buckles.",
    variantCount: 6,
    stockCount: 22,
    media: [
      {
        id: "m-mnk-01",
        productId: "prod-dress-020",
        url: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=800&q=80",
        altText: "Double Monk Strap in Parisian Museum Calf",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-22T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-22T15:00:00.000Z",
    updatedAt: "2026-02-03T17:00:00.000Z",
  },
  {
    id: "prod-snk-021",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sneakers",
    brand: "Atelier Street",
    title: "High-Top Padded Leather Basketball Sneaker",
    slug: "high-top-padded-leather-basketball-sneaker",
    modelCode: "SNK-HGT-021",
    shortDescription: "Architectural padded high-top court sneaker in full-grain Italian nappa leather.",
    description:
      "Plush padded collar, stitched cupsole construction, reinforced ankle harness, and wax-coated cotton laces for elevated metropolitan street style.",
    basePrice: 235.0,
    compareAtPrice: 275.0,
    costPrice: 85.0,
    status: "active",
    isFeatured: true,
    isNewArrival: true,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "High-Top Padded Leather Basketball Sneaker | Atelier Street",
    seoDescription: "Italian nappa leather padded high-top court sneaker.",
    variantCount: 5,
    stockCount: 36,
    media: [
      {
        id: "m-hgt-01",
        productId: "prod-snk-021",
        url: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
        altText: "High-Top Padded Leather Basketball Sneaker",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-23T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-23T16:00:00.000Z",
    updatedAt: "2026-02-04T18:00:00.000Z",
  },
  {
    id: "prod-casual-022",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-casual-shoes",
    brand: "Atelier Coastal",
    title: "Nautical Two-Eye Boat Shoe in Horween Dublin",
    slug: "nautical-two-eye-boat-shoe",
    modelCode: "CAS-BOT-022",
    shortDescription: "True moccasin construction boat shoe cut from rich wax-finished Horween Dublin.",
    description:
      "Features 360-degree rawhide lacing system, non-corrosive brass eyelets, and non-marking razor-siped rubber outsoles for wet deck traction.",
    basePrice: 195.0,
    compareAtPrice: null,
    costPrice: 70.0,
    status: "active",
    isFeatured: false,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Nautical Two-Eye Boat Shoe | Atelier Casual",
    seoDescription: "Handsewn boat shoe in Horween Dublin leather with razor-siped deck soles.",
    variantCount: 4,
    stockCount: 44,
    media: [
      {
        id: "m-bot-01",
        productId: "prod-casual-022",
        url: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?auto=format&fit=crop&w=800&q=80",
        altText: "Nautical Two-Eye Boat Shoe",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-24T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-24T10:00:00.000Z",
    updatedAt: "2026-02-05T12:00:00.000Z",
  },
  {
    id: "prod-sports-023",
    productTypeId: "pt-footwear-01",
    primaryCategoryId: "cat-sports-shoes",
    brand: "Atelier Tech",
    title: "Ultra-Lightweight Distance Road Runner",
    slug: "ultra-lightweight-distance-road-runner",
    modelCode: "SPT-RUN-023",
    shortDescription: "Featherweight marathon road running shoe with dual Zoom air cushioning units.",
    description:
      "Engineered single-layer engineered monomesh upper paired with responsive supercritical rebound foam for effortless long-distance road miles.",
    basePrice: 170.0,
    compareAtPrice: null,
    costPrice: 60.0,
    status: "active",
    isFeatured: false,
    isNewArrival: true,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Ultra-Lightweight Distance Road Runner | Atelier Sports",
    seoDescription: "Featherweight marathon road running trainer with supercritical rebound foam.",
    variantCount: 5,
    stockCount: 50,
    media: [
      {
        id: "m-run-01",
        productId: "prod-sports-023",
        url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80",
        altText: "Ultra-Lightweight Distance Road Runner",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-25T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-25T11:00:00.000Z",
    updatedAt: "2026-02-06T13:00:00.000Z",
  },
  {
    id: "prod-apparel-024",
    productTypeId: "pt-apparel-02",
    primaryCategoryId: "cat-clothing",
    brand: "Atelier Sartorial",
    title: "Heavyweight Selvedge Raw Denim Jean",
    slug: "heavyweight-selvedge-raw-denim-jean",
    modelCode: "APP-DNM-024",
    shortDescription: "15.5oz Japanese shuttle-loom selvedge denim woven in Okayama.",
    description:
      "Rope-dyed indigo pure cotton yarn woven on vintage Toyoda shuttle looms with classic pink selvedge ID line, copper hardware, and hidden rear pocket rivets.",
    basePrice: 220.0,
    compareAtPrice: null,
    costPrice: 75.0,
    status: "active",
    isFeatured: true,
    isNewArrival: false,
    isOnSale: false,
    hasVariants: true,
    seoTitle: "Heavyweight Selvedge Raw Denim Jean | Atelier Clothing",
    seoDescription: "15.5oz Japanese shuttle-loom selvedge raw denim jean in vintage indigo.",
    variantCount: 6,
    stockCount: 40,
    media: [
      {
        id: "m-dnm-01",
        productId: "prod-apparel-024",
        url: "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=800&q=80",
        altText: "Heavyweight Selvedge Raw Denim Jean",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-26T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-26T12:00:00.000Z",
    updatedAt: "2026-02-07T14:00:00.000Z",
  },
  {
    id: "prod-apparel-025",
    productTypeId: "pt-apparel-02",
    primaryCategoryId: "cat-clothing",
    brand: "Atelier Tailoring",
    title: "Fine Cotton Oxford Button-Down Shirt",
    slug: "fine-cotton-oxford-button-down-shirt",
    modelCode: "APP-SHT-025",
    shortDescription: "Substantial two-ply pinpoint Oxford cloth shirt with generous collar roll.",
    description:
      "Tailored with single-needle stitching throughout, mother-of-pearl buttons, and a classic unlined 3.5-inch button-down collar with natural s-curve roll.",
    basePrice: 140.0,
    compareAtPrice: 165.0,
    costPrice: 48.0,
    status: "active",
    isFeatured: false,
    isNewArrival: true,
    isOnSale: true,
    hasVariants: true,
    seoTitle: "Fine Cotton Oxford Button-Down Shirt | Atelier Sartorial",
    seoDescription: "Classic Oxford cloth button-down shirt with mother-of-pearl buttons.",
    variantCount: 6,
    stockCount: 50,
    media: [
      {
        id: "m-sht-01",
        productId: "prod-apparel-025",
        url: "https://images.unsplash.com/photo-1490114538077-0a7f8cb49891?auto=format&fit=crop&w=800&q=80",
        altText: "Fine Cotton Oxford Button-Down Shirt",
        mimeType: "image/jpeg",
        sortOrder: 0,
        isPrimary: true,
        createdAt: "2026-01-27T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-27T13:00:00.000Z",
    updatedAt: "2026-02-08T15:00:00.000Z",
  },
];

// In-memory persistent cache for development mode
declare global {
  // eslint-disable-next-line no-var
  var _memoryProductStore: Map<string, Product> | undefined;
  // eslint-disable-next-line no-var
  var _memoryCategoryStore: Map<string, Category> | undefined;
  // eslint-disable-next-line no-var
  var _memoryProductTypeStore: Map<string, ProductType> | undefined;
}

const memoryProducts: Map<string, Product> =
  global._memoryProductStore ||
  (global._memoryProductStore = new Map(
    INITIAL_PRODUCTS.map((p) => [p.id, { ...p }])
  ));

const memoryCategories: Map<string, Category> =
  global._memoryCategoryStore ||
  (global._memoryCategoryStore = new Map(
    SEED_CATEGORIES.map((c) => [c.id, { ...c }])
  ));

const memoryProductTypes: Map<string, ProductType> =
  global._memoryProductTypeStore ||
  (global._memoryProductTypeStore = new Map(
    SEED_PRODUCT_TYPES.map((t) => [t.id, { ...t }])
  ));

// =============================================================================
// HELPER UTILITIES
// =============================================================================

export { generateSlug };

export function populateProductRelations(product: Product): Product {
  const primaryCategory =
    memoryCategories.get(product.primaryCategoryId) || undefined;
  const productType =
    memoryProductTypes.get(product.productTypeId) || undefined;

  return {
    ...product,
    primaryCategory,
    category: primaryCategory,
    productType,
  };
}

// =============================================================================
// PRODUCT SERVICE (Postgres Drizzle with Memory Fallback)
// =============================================================================

export const productService = {
  /**
   * Returns all active, unarchived categories
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { categoryService } = await import("@/lib/categories/category-service");
      return await categoryService.listCategories({ includeInactive: false, includeArchived: false });
    } catch {
      return Array.from(memoryCategories.values()).filter((c) => c.isActive);
    }
  },

  /**
   * Returns all product types
   */
  async getProductTypes(): Promise<ProductType[]> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const records = await db
          .select()
          .from(productTypes)
          .orderBy(asc(productTypes.name));

        return records.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          description: r.description,
          hasVariants: r.hasVariants,
          isShippable: r.isShippable,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      } catch (err) {
        console.warn("DB getProductTypes failed, falling back to memory:", err);
      }
    }

    return Array.from(memoryProductTypes.values());
  },

  /**
   * Checks whether a slug is available. Returns true if unique.
   */
  async isSlugUnique(slug: string, excludeProductId?: string): Promise<boolean> {
    const normalized = slug.trim().toLowerCase();

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, normalized))
          .limit(1);

        if (existing.length > 0) {
          if (excludeProductId && existing[0].id === excludeProductId) {
            return true;
          }
          return false;
        }
        return true;
      } catch (err) {
        console.warn("DB isSlugUnique check failed, checking memory:", err);
      }
    }

    for (const prod of memoryProducts.values()) {
      if (prod.slug === normalized) {
        if (excludeProductId && prod.id === excludeProductId) {
          continue;
        }
        return false;
      }
    }
    return true;
  },

  /**
   * Query products with filtering, search, sorting, and pagination
   */
  async getProducts(
    query: Partial<ProductQueryInput> = {}
  ): Promise<PaginatedResult<Product>> {
    const {
      search,
      category,
      productType,
      status = "all",
      featured,
      newArrival,
      onSale,
      sort = "newest",
      page = 1,
      limit = 10,
    } = query;

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const conditions = [];

        // Status filter
        if (status === "all") {
          // By default, exclude archived unless explicitly requested
          conditions.push(isNull(products.deletedAt));
        } else if (status === "archived") {
          conditions.push(or(eq(products.status, "archived"), isNotNull(products.deletedAt)));
        } else {
          conditions.push(and(eq(products.status, status), isNull(products.deletedAt)));
        }

        // Category filter
        if (category && category !== "all") {
          conditions.push(eq(products.primaryCategoryId, category));
        }

        // Product Type filter
        if (productType && productType !== "all") {
          conditions.push(eq(products.productTypeId, productType));
        }

        // Flags
        if (typeof featured === "boolean") {
          conditions.push(eq(products.isFeatured, featured));
        }
        if (typeof newArrival === "boolean") {
          conditions.push(eq(products.isNewArrival, newArrival));
        }
        if (typeof onSale === "boolean") {
          conditions.push(eq(products.isOnSale, onSale));
        }

        // Search text
        if (search && search.trim()) {
          const term = `%${search.trim().toLowerCase()}%`;
          conditions.push(
            or(
              ilike(products.title, term),
              ilike(products.brand, term),
              ilike(products.slug, term),
              ilike(products.modelCode, term)
            )
          );
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Total count
        const countRes = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(whereClause);
        const total = countRes[0]?.count || 0;

        // Sorting
        let orderByClause = desc(products.createdAt);
        if (sort === "oldest") orderByClause = asc(products.createdAt);
        else if (sort === "name_asc") orderByClause = asc(products.title);
        else if (sort === "name_desc") orderByClause = desc(products.title);
        else if (sort === "price_asc") orderByClause = asc(products.basePrice);
        else if (sort === "price_desc") orderByClause = desc(products.basePrice);
        else if (sort === "updated") orderByClause = desc(products.updatedAt);

        const offset = (page - 1) * limit;

        const rows = await db
          .select()
          .from(products)
          .where(whereClause)
          .orderBy(orderByClause)
          .limit(limit)
          .offset(offset);

        // Fetch media for returned products
        const productIds = rows.map((r) => r.id);
        const mediaRows =
          productIds.length > 0
            ? await db
                .select()
                .from(productMedia)
                .where(sql`${productMedia.productId} IN ${productIds}`)
                .orderBy(asc(productMedia.sortOrder))
            : [];

        const catMap = await getCachedCategoryMap(db);
        const typeMap = await getCachedTypeMap(db);

        const data: Product[] = rows.map((r) => {
          const pMedia: ProductMedia[] = mediaRows
            .filter((m) => m.productId === r.id)
            .map((m) => ({
              id: m.id,
              productId: m.productId,
              variantId: m.variantId,
              url: m.url,
              storageKey: m.storageKey,
              altText: m.altText,
              mimeType: m.mimeType,
              width: m.width,
              height: m.height,
              sortOrder: m.sortOrder,
              isPrimary: m.isPrimary,
              createdAt: m.createdAt.toISOString(),
            }));

          const cat = catMap.get(r.primaryCategoryId);
          const type = typeMap.get(r.productTypeId);

          return {
            id: r.id,
            productTypeId: r.productTypeId,
            productType: type
              ? {
                  id: type.id,
                  name: type.name,
                  slug: type.slug,
                  description: type.description,
                  hasVariants: type.hasVariants,
                  isShippable: type.isShippable,
                  createdAt: type.createdAt,
                  updatedAt: type.updatedAt,
                }
              : undefined,
            primaryCategoryId: r.primaryCategoryId,
            category: cat
              ? {
                  id: cat.id,
                  parentId: cat.parentId,
                  name: cat.name,
                  slug: cat.slug,
                  description: cat.description,
                  imageUrl: cat.imageUrl,
                  sortOrder: cat.sortOrder,
                  isActive: cat.isActive,
                  createdAt: cat.createdAt,
                }
              : undefined,
            primaryCategory: cat
              ? {
                  id: cat.id,
                  parentId: cat.parentId,
                  name: cat.name,
                  slug: cat.slug,
                  description: cat.description,
                  imageUrl: cat.imageUrl,
                  sortOrder: cat.sortOrder,
                  isActive: cat.isActive,
                  createdAt: cat.createdAt,
                }
              : undefined,
            brand: r.brand,
            title: r.title,
            slug: r.slug,
            modelCode: r.modelCode,
            shortDescription: r.shortDescription,
            description: r.description,
            basePrice: parseFloat(r.basePrice),
            compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
            costPrice: r.costPrice ? parseFloat(r.costPrice) : null,
            status: r.status as "draft" | "active" | "archived",
            isFeatured: r.isFeatured,
            isNewArrival: r.isNewArrival,
            isOnSale: r.isOnSale,
            hasVariants: r.hasVariants,
            seoTitle: r.seoTitle,
            seoDescription: r.seoDescription,
            metadata: (r.metadata as Record<string, unknown>) || {},
            deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            media: pMedia,
          };
        });

        return {
          data,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        };
      } catch (err) {
        console.warn("DB getProducts failed, falling back to memory:", err);
      }
    }

    // In-memory filtering, search, and pagination
    let items = Array.from(memoryProducts.values()).map(populateProductRelations);

    // Filter status
    if (status === "all") {
      items = items.filter((p) => p.status !== "archived" && !p.deletedAt);
    } else if (status === "archived") {
      items = items.filter((p) => p.status === "archived" || Boolean(p.deletedAt));
    } else {
      items = items.filter((p) => p.status === status && !p.deletedAt);
    }

    // Filter Category
    if (category && category !== "all") {
      items = items.filter(
        (p) =>
          p.primaryCategoryId === category ||
          p.primaryCategory?.slug === category ||
          p.category?.slug === category
      );
    }

    // Filter Product Type
    if (productType && productType !== "all") {
      items = items.filter(
        (p) =>
          p.productTypeId === productType ||
          p.productType?.slug === productType
      );
    }

    // Filter Flags
    if (typeof featured === "boolean") {
      items = items.filter((p) => p.isFeatured === featured);
    }
    if (typeof newArrival === "boolean") {
      items = items.filter((p) => p.isNewArrival === newArrival);
    }
    if (typeof onSale === "boolean") {
      items = items.filter((p) => p.isOnSale === onSale);
    }

    // Filter Search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.modelCode && p.modelCode.toLowerCase().includes(q))
      );
    }

    // Sorting
    items.sort((a, b) => {
      if (sort === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === "name_asc") {
        return a.title.localeCompare(b.title);
      }
      if (sort === "name_desc") {
        return b.title.localeCompare(a.title);
      }
      if (sort === "price_asc") {
        return a.basePrice - b.basePrice;
      }
      if (sort === "price_desc") {
        return b.basePrice - a.basePrice;
      }
      if (sort === "updated") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      // default: newest
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const total = items.length;
    const offset = (page - 1) * limit;
    const paginated = items.slice(offset, offset + limit);

    return {
      data: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  },

  /**
   * Optimized single-query fetch for homepage: returns both featured and new arrival
   * products in one DB query instead of two separate getProducts() calls.
   * Returns { featured: Product[], newArrivals: Product[] }
   */
  async getHomepageProducts(limit: number = 4): Promise<{ featured: Product[]; newArrivals: Product[] }> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const catMap = await getCachedCategoryMap(db);
        const typeMap = await getCachedTypeMap(db);

        // Single query: active products that are either featured OR new arrivals
        const rows = await db
          .select()
          .from(products)
          .where(
            and(
              or(eq(products.isFeatured, true), eq(products.isNewArrival, true)),
              eq(products.status, "active"),
              isNull(products.deletedAt)
            )
          )
          .orderBy(desc(products.createdAt))
          .limit(limit * 2); // get up to 2x limit to ensure we have enough of each

        // Fetch media for all returned products in one query
        const productIds = rows.map((r) => r.id);
        const mediaRows =
          productIds.length > 0
            ? await db
                .select()
                .from(productMedia)
                .where(sql`${productMedia.productId} IN ${productIds}`)
                .orderBy(asc(productMedia.sortOrder))
            : [];

        const mapped: Product[] = rows.map((r) => {
          const pMedia = mediaRows
            .filter((m) => m.productId === r.id)
            .map((m) => ({
              id: m.id,
              productId: m.productId,
              variantId: m.variantId,
              url: m.url,
              storageKey: m.storageKey,
              altText: m.altText,
              mimeType: m.mimeType,
              width: m.width,
              height: m.height,
              sortOrder: m.sortOrder,
              isPrimary: m.isPrimary,
              createdAt: m.createdAt.toISOString(),
            }));

          const cat = catMap.get(r.primaryCategoryId);
          const type = typeMap.get(r.productTypeId);

          return {
            id: r.id,
            productTypeId: r.productTypeId,
            productType: type
              ? { id: type.id, name: type.name, slug: type.slug, description: type.description, hasVariants: type.hasVariants, isShippable: type.isShippable, createdAt: type.createdAt, updatedAt: type.updatedAt }
              : undefined,
            primaryCategoryId: r.primaryCategoryId,
            category: cat ? { id: cat.id, parentId: cat.parentId, name: cat.name, slug: cat.slug, description: cat.description, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder, isActive: cat.isActive, createdAt: cat.createdAt } : undefined,
            primaryCategory: cat ? { id: cat.id, parentId: cat.parentId, name: cat.name, slug: cat.slug, description: cat.description, imageUrl: cat.imageUrl, sortOrder: cat.sortOrder, isActive: cat.isActive, createdAt: cat.createdAt } : undefined,
            brand: r.brand,
            title: r.title,
            slug: r.slug,
            modelCode: r.modelCode,
            shortDescription: r.shortDescription,
            description: r.description,
            basePrice: parseFloat(r.basePrice),
            compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
            costPrice: r.costPrice ? parseFloat(r.costPrice) : null,
            status: r.status as "draft" | "active" | "archived",
            isFeatured: r.isFeatured,
            isNewArrival: r.isNewArrival,
            isOnSale: r.isOnSale,
            hasVariants: r.hasVariants,
            seoTitle: r.seoTitle,
            seoDescription: r.seoDescription,
            metadata: (r.metadata as Record<string, unknown>) || {},
            deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            media: pMedia,
          };
        });

        // Split into featured and new arrivals
        const featured = mapped.filter((p) => p.isFeatured).slice(0, limit);
        const newArrivals = mapped.filter((p) => p.isNewArrival).slice(0, limit);

        return { featured, newArrivals };
      } catch (err) {
        console.warn("ProductService.getHomepageProducts DB query failed:", err);
      }
    }

    // In-memory fallback
    const all = INITIAL_PRODUCTS.filter((p) => p.status === "active");
    return {
      featured: all.filter((p) => p.isFeatured).slice(0, limit),
      newArrivals: all.filter((p) => p.isNewArrival).slice(0, limit),
    };
  },

  /**
   * Retrieves single product by ID with full relations & media
   */
  async getProductById(id: string): Promise<Product | null> {
    let productObj: Product | null = null;
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(products)
          .where(eq(products.id, id))
          .limit(1);

        if (rows.length > 0) {
          const r = rows[0];
          const mediaRows = await db
            .select()
            .from(productMedia)
            .where(eq(productMedia.productId, id))
            .orderBy(asc(productMedia.sortOrder));

          const cat = (
            await db
              .select()
              .from(categories)
              .where(eq(categories.id, r.primaryCategoryId))
              .limit(1)
          )[0];

          const pType = (
            await db
              .select()
              .from(productTypes)
              .where(eq(productTypes.id, r.productTypeId))
              .limit(1)
          )[0];

          const pMedia: ProductMedia[] = mediaRows.map((m) => ({
            id: m.id,
            productId: m.productId,
            variantId: m.variantId,
            url: m.url,
            storageKey: m.storageKey,
            altText: m.altText,
            mimeType: m.mimeType,
            width: m.width,
            height: m.height,
            sortOrder: m.sortOrder,
            isPrimary: m.isPrimary,
            createdAt: m.createdAt.toISOString(),
          }));

          productObj = {
            id: r.id,
            productTypeId: r.productTypeId,
            productType: pType
              ? {
                  id: pType.id,
                  name: pType.name,
                  slug: pType.slug,
                  description: pType.description,
                  hasVariants: pType.hasVariants,
                  isShippable: pType.isShippable,
                  createdAt: pType.createdAt.toISOString(),
                  updatedAt: pType.updatedAt.toISOString(),
                }
              : undefined,
            primaryCategoryId: r.primaryCategoryId,
            category: cat
              ? {
                  id: cat.id,
                  parentId: cat.parentId,
                  name: cat.name,
                  slug: cat.slug,
                  description: cat.description,
                  imageUrl: cat.imageUrl,
                  sortOrder: cat.sortOrder,
                  isActive: cat.isActive,
                  createdAt: cat.createdAt.toISOString(),
                }
              : undefined,
            primaryCategory: cat
              ? {
                  id: cat.id,
                  parentId: cat.parentId,
                  name: cat.name,
                  slug: cat.slug,
                  description: cat.description,
                  imageUrl: cat.imageUrl,
                  sortOrder: cat.sortOrder,
                  isActive: cat.isActive,
                  createdAt: cat.createdAt.toISOString(),
                }
              : undefined,
            brand: r.brand,
            title: r.title,
            slug: r.slug,
            modelCode: r.modelCode,
            shortDescription: r.shortDescription,
            description: r.description,
            basePrice: parseFloat(r.basePrice),
            compareAtPrice: r.compareAtPrice ? parseFloat(r.compareAtPrice) : null,
            costPrice: r.costPrice ? parseFloat(r.costPrice) : null,
            status: r.status as "draft" | "active" | "archived",
            isFeatured: r.isFeatured,
            isNewArrival: r.isNewArrival,
            isOnSale: r.isOnSale,
            hasVariants: r.hasVariants,
            seoTitle: r.seoTitle,
            seoDescription: r.seoDescription,
            metadata: (r.metadata as Record<string, unknown>) || {},
            deletedAt: r.deletedAt ? r.deletedAt.toISOString() : null,
            createdAt: r.createdAt.toISOString(),
            updatedAt: r.updatedAt.toISOString(),
            media: pMedia,
          };
        }
      } catch (err) {
        console.warn("DB getProductById failed, checking memory:", err);
      }
    }

    if (!productObj) {
      const memoryItem = memoryProducts.get(id);
      if (!memoryItem) return null;
      productObj = populateProductRelations(memoryItem);
    }

    // Attach variants & assignedAttributes
    try {
      const [variants, assignedAttributes] = await Promise.all([
        variantService.listVariantsByProductId(id, { includeArchived: true }),
        attributeService.getProductAttributes(id),
      ]);
      productObj.variants = variants;
      productObj.variantCount = variants.filter((v) => !v.deletedAt).length;
      productObj.assignedAttributes = assignedAttributes;
    } catch (err) {
      console.warn("Failed to attach variants to product:", err);
    }

    return productObj;
  },

  /**
   * Retrieves single product by URL slug with full relations
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const rows = await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.slug, slug), isNull(products.deletedAt)))
          .limit(1);

        if (rows.length > 0) {
          return this.getProductById(rows[0].id);
        }
      } catch (err) {
        console.warn("DB getProductBySlug failed, checking memory:", err);
      }
    }

    for (const item of memoryProducts.values()) {
      if (item.slug === slug && !item.deletedAt) {
        return this.getProductById(item.id);
      }
    }

    return null;
  },

  /**
   * Creates a brand new product
   */
  async createProduct(
    input: CreateProductInput,
    userId: string
  ): Promise<Product> {
    const isUnique = await this.isSlugUnique(input.slug);
    if (!isUnique) {
      throw new Error(`The slug "${input.slug}" is already in use by another product. Please choose a unique URL slug.`);
    }

    const productId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const newProduct: Product = {
      id: productId,
      productTypeId: input.productTypeId,
      primaryCategoryId: input.primaryCategoryId,
      brand: input.brand,
      title: input.title,
      slug: input.slug,
      modelCode: input.modelCode || null,
      shortDescription: input.shortDescription || null,
      description: input.description,
      basePrice: input.basePrice,
      compareAtPrice: input.compareAtPrice || null,
      costPrice: input.costPrice || null,
      status: input.status,
      isFeatured: input.isFeatured,
      isNewArrival: input.isNewArrival,
      isOnSale: input.isOnSale,
      hasVariants: true,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      deletedAt: input.status === "archived" ? nowIso : null,
      createdAt: nowIso,
      updatedAt: nowIso,
      media: (input.media || []).map((m, idx) => ({
        id: `media-${Date.now()}-${idx}`,
        productId,
        url: m.url,
        altText: m.altText || input.title,
        mimeType: "image/jpeg",
        sortOrder: m.sortOrder ?? idx,
        isPrimary: m.isPrimary ?? idx === 0,
        createdAt: nowIso,
      })),
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        const [inserted] = await db
          .insert(products)
          .values({
            productTypeId: input.productTypeId,
            primaryCategoryId: input.primaryCategoryId,
            brand: input.brand,
            title: input.title,
            slug: input.slug,
            modelCode: input.modelCode || null,
            shortDescription: input.shortDescription || null,
            description: input.description,
            basePrice: input.basePrice.toFixed(2),
            compareAtPrice: input.compareAtPrice ? input.compareAtPrice.toFixed(2) : null,
            costPrice: input.costPrice ? input.costPrice.toFixed(2) : null,
            status: input.status,
            isFeatured: input.isFeatured,
            isNewArrival: input.isNewArrival,
            isOnSale: input.isOnSale,
            hasVariants: true,
            seoTitle: input.seoTitle || null,
            seoDescription: input.seoDescription || null,
            deletedAt: input.status === "archived" ? new Date() : null,
          })
          .returning();

        if (inserted && input.media && input.media.length > 0) {
          for (let i = 0; i < input.media.length; i++) {
            const m = input.media[i];
            await db.insert(productMedia).values({
              productId: inserted.id,
              url: m.url,
              altText: m.altText || input.title,
              sortOrder: m.sortOrder ?? i,
              isPrimary: m.isPrimary ?? i === 0,
            });
          }
        }

        newProduct.id = inserted.id;
      } catch (err) {
        console.warn("DB createProduct insert failed, saving to memory:", err);
      }
    }

    // Persist in memory store
    memoryProducts.set(newProduct.id, newProduct);

    // Audit log
    await recordAuditLog({
      userId,
      action: "create",
      entityType: "product",
      entityId: newProduct.id,
      changes: { after: newProduct },
    });

    return populateProductRelations(newProduct);
  },

  /**
   * Updates an existing product
   */
  async updateProduct(
    id: string,
    input: UpdateProductInput,
    userId: string
  ): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID "${id}" was not found.`);
    }

    const isUnique = await this.isSlugUnique(input.slug, id);
    if (!isUnique) {
      throw new Error(`The slug "${input.slug}" is already in use by another product. Please choose a unique URL slug.`);
    }

    const nowIso = new Date().toISOString();

    const updatedMedia: ProductMedia[] = (input.media || []).map((m, idx) => ({
      id: m.id || `media-${Date.now()}-${idx}`,
      productId: id,
      url: m.url,
      altText: m.altText || input.title,
      mimeType: "image/jpeg",
      sortOrder: m.sortOrder ?? idx,
      isPrimary: m.isPrimary ?? idx === 0,
      createdAt: nowIso,
    }));

    const updatedProduct: Product = {
      ...existing,
      productTypeId: input.productTypeId,
      primaryCategoryId: input.primaryCategoryId,
      brand: input.brand,
      title: input.title,
      slug: input.slug,
      modelCode: input.modelCode || null,
      shortDescription: input.shortDescription || null,
      description: input.description,
      basePrice: input.basePrice,
      compareAtPrice: input.compareAtPrice || null,
      costPrice: input.costPrice || null,
      status: input.status,
      isFeatured: input.isFeatured,
      isNewArrival: input.isNewArrival,
      isOnSale: input.isOnSale,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      deletedAt:
        input.status === "archived"
          ? existing.deletedAt || nowIso
          : null,
      updatedAt: nowIso,
      media: updatedMedia,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(products)
          .set({
            productTypeId: input.productTypeId,
            primaryCategoryId: input.primaryCategoryId,
            brand: input.brand,
            title: input.title,
            slug: input.slug,
            modelCode: input.modelCode || null,
            shortDescription: input.shortDescription || null,
            description: input.description,
            basePrice: input.basePrice.toFixed(2),
            compareAtPrice: input.compareAtPrice ? input.compareAtPrice.toFixed(2) : null,
            costPrice: input.costPrice ? input.costPrice.toFixed(2) : null,
            status: input.status,
            isFeatured: input.isFeatured,
            isNewArrival: input.isNewArrival,
            isOnSale: input.isOnSale,
            seoTitle: input.seoTitle || null,
            seoDescription: input.seoDescription || null,
            deletedAt:
              input.status === "archived"
                ? (existing.deletedAt ? new Date(existing.deletedAt) : new Date())
                : null,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));

        // Re-sync media
        await db.delete(productMedia).where(eq(productMedia.productId, id));
        if (input.media && input.media.length > 0) {
          for (let i = 0; i < input.media.length; i++) {
            const m = input.media[i];
            await db.insert(productMedia).values({
              productId: id,
              url: m.url,
              altText: m.altText || input.title,
              sortOrder: m.sortOrder ?? i,
              isPrimary: m.isPrimary ?? i === 0,
            });
          }
        }
      } catch (err) {
        console.warn("DB updateProduct failed, updating memory:", err);
      }
    }

    memoryProducts.set(id, updatedProduct);

    // Audit log
    await recordAuditLog({
      userId,
      action: "update",
      entityType: "product",
      entityId: id,
      changes: { before: existing, after: updatedProduct },
    });

    return populateProductRelations(updatedProduct);
  },

  /**
   * Archives a product (soft delete)
   */
  async archiveProduct(id: string, userId: string): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID "${id}" was not found.`);
    }

    const nowIso = new Date().toISOString();
    const archivedProduct: Product = {
      ...existing,
      status: "archived",
      deletedAt: nowIso,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(products)
          .set({
            status: "archived",
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));
      } catch (err) {
        console.warn("DB archiveProduct failed, updating memory:", err);
      }
    }

    memoryProducts.set(id, archivedProduct);

    await recordAuditLog({
      userId,
      action: "archive",
      entityType: "product",
      entityId: id,
      changes: { before: existing, after: archivedProduct },
    });

    return populateProductRelations(archivedProduct);
  },

  /**
   * Restores an archived product back to draft status
   */
  async restoreProduct(id: string, userId: string): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID "${id}" was not found.`);
    }

    const nowIso = new Date().toISOString();
    const restoredProduct: Product = {
      ...existing,
      status: "draft",
      deletedAt: null,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(products)
          .set({
            status: "draft",
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));
      } catch (err) {
        console.warn("DB restoreProduct failed, updating memory:", err);
      }
    }

    memoryProducts.set(id, restoredProduct);

    await recordAuditLog({
      userId,
      action: "restore",
      entityType: "product",
      entityId: id,
      changes: { before: existing, after: restoredProduct },
    });

    return populateProductRelations(restoredProduct);
  },

  /**
   * Toggles publish state (active vs draft)
   */
  async setProductStatus(
    id: string,
    status: "draft" | "active",
    userId: string
  ): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID "${id}" was not found.`);
    }

    const nowIso = new Date().toISOString();
    const updated: Product = {
      ...existing,
      status,
      deletedAt: null,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(products)
          .set({
            status,
            deletedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));
      } catch (err) {
        console.warn("DB setProductStatus failed, updating memory:", err);
      }
    }

    memoryProducts.set(id, updated);

    await recordAuditLog({
      userId,
      action: status === "active" ? "publish" : "unpublish",
      entityType: "product",
      entityId: id,
      changes: { before: existing, after: updated },
    });

    return populateProductRelations(updated);
  },

  /**
   * Fast toggle for merchandising flags (isFeatured, isNewArrival, isOnSale)
   */
  async updateMerchandisingFlag(
    id: string,
    flag: "isFeatured" | "isNewArrival" | "isOnSale",
    value: boolean,
    userId: string
  ): Promise<Product> {
    const existing = await this.getProductById(id);
    if (!existing) {
      throw new Error(`Product with ID "${id}" was not found.`);
    }

    const nowIso = new Date().toISOString();
    const updated: Product = {
      ...existing,
      [flag]: value,
      updatedAt: nowIso,
    };

    if (isDatabaseConfigured()) {
      try {
        const db = getDb();
        await db
          .update(products)
          .set({
            [flag]: value,
            updatedAt: new Date(),
          })
          .where(eq(products.id, id));
      } catch (err) {
        console.warn("DB updateMerchandisingFlag failed, updating memory:", err);
      }
    }

    memoryProducts.set(id, updated);

    await recordAuditLog({
      userId,
      action: `update_flag_${flag}`,
      entityType: "product",
      entityId: id,
      changes: { before: { [flag]: existing[flag] }, after: { [flag]: value } },
    });

    return populateProductRelations(updated);
  },
};
