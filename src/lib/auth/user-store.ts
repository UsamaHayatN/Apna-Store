import { AuthUser, UserRole, AccountStatus, UserAddress } from "@/types";
import { isDatabaseConfigured, getDb, schema, markDatabaseConnectionFailed } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import {
  DEV_ADMIN_EMAIL,
  DEV_ADMIN_USER_ID,
  getDevAdminSeedFromDisk,
  createOrUpdateDevAdminUser,
} from "./dev-admin";

/**
 * Pre-computed PBKDF2 hashes for default seeded administrative and testing accounts.
 * Passwords comply with enterprise strength rules:
 * - Owner: 'OwnerPass123!'
 * - Admin: 'AdminPass123!'
 * - Staff: 'StaffPass123!'
 * - Customer: 'ClientPass123!'
 * - Disabled: 'DisabledPass123!'
 */
const SEED_USERS: AuthUser[] = [
  {
    id: DEV_ADMIN_USER_ID,
    email: DEV_ADMIN_EMAIL,
    passwordHash:
      "cd4d56a0c51307a7551f4845b8a0d8f0:996c3825053d91ece505844903c926f0cbe6671c3c6e7a9d2d024b8b7d35f9c232bde47bf50ee29a54dadc35bfad92018a45e66cfee323fba82a1a74da6942ce",
    firstName: "Usama",
    lastName: "Nissoana",
    phone: "+1 555-0100",
    role: "owner",
    status: "active",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-owner-00000001",
    email: "owner@atelier.internal",
    passwordHash:
      "cd4d56a0c51307a7551f4845b8a0d8f0:996c3825053d91ece505844903c926f0cbe6671c3c6e7a9d2d024b8b7d35f9c232bde47bf50ee29a54dadc35bfad92018a45e66cfee323fba82a1a74da6942ce",
    firstName: "Julian",
    lastName: "Vance",
    phone: "+1 555-0190",
    role: "owner",
    status: "active",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-admin-00000002",
    email: "admin@atelier.internal",
    passwordHash:
      "b660dfaafbf6cf8f50edb5d49e287a23:e3b6e878b87aeae6de1607232d456f83984ba0548777d551cdded8566ac6ff1719ea63b68c67b74e67867bcd37a16b4a7242b12c6257c767c275ce4e211dd640",
    firstName: "Elena",
    lastName: "Rostova",
    phone: "+1 555-0191",
    role: "admin",
    status: "active",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-staff-00000003",
    email: "staff@atelier.internal",
    passwordHash:
      "8363b35bcec2852a7ec5e586879af499:791a70dc85aee06267055cd2fa6b604e478170fc2ea9100d2b197dd9e878328bba05ef561abe3d9004070fcf98bbcb8d44a48c63a3905fa578d2506e3c904b99",
    firstName: "Marcus",
    lastName: "Kaye",
    phone: "+1 555-0192",
    role: "staff",
    status: "active",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-client-00000004",
    email: "client@atelier.internal",
    passwordHash:
      "4b774a1fac9bebd08784a106504a3caa:88876ea828a0243cfc40f250ab9b754d6a6217102259aa582af3750c9941673bf2b566099b8d90bf67dc00a4d001c6fb0904ad7123833f624ecef92c6e1fc7d4",
    firstName: "Arthur",
    lastName: "Pendleton",
    phone: "+1 555-0193",
    role: "customer",
    status: "active",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "usr-disabled-00000005",
    email: "disabled@atelier.internal",
    passwordHash:
      "852b7eb1fcdba9a4018172b387cfa677:9aa71ac6b638c410fed23c2420ad48a5cc2201072f18bcc4c41a7ca8944f3792a100e94d39cece3f4d5ef3ca38002d7b65ea87e018986f86a660e3993f8682b4",
    firstName: "Suspended",
    lastName: "Account",
    phone: "+1 555-0199",
    role: "customer",
    status: "disabled",
    emailVerifiedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

// In-Memory state caches for development / test fallback
declare global {
  // eslint-disable-next-line no-var
  var _authUsersStore: Map<string, AuthUser> | undefined;
  // eslint-disable-next-line no-var
  var _authAddressesStore: Map<string, UserAddress[]> | undefined;
  // eslint-disable-next-line no-var
  var _authResetTokensStore:
    | Map<
        string,
        {
          id: string;
          userId: string;
          tokenHash: string;
          expiresAt: Date;
          usedAt: Date | null;
        }
      >
    | undefined;
  // eslint-disable-next-line no-var
  var _authVerificationTokensStore:
    | Map<
        string,
        {
          id: string;
          userId: string;
          tokenHash: string;
          expiresAt: Date;
          usedAt: Date | null;
        }
      >
    | undefined;
}

const memoryUsers: Map<string, AuthUser> =
  global._authUsersStore ||
  (global._authUsersStore = new Map(SEED_USERS.map((u) => [u.id, { ...u }])));

const memoryAddresses: Map<string, UserAddress[]> =
  global._authAddressesStore ||
  (global._authAddressesStore = new Map([
    [
      "usr-client-00000004",
      [
        {
          id: "addr-001",
          userId: "usr-client-00000004",
          recipientName: "Arthur Pendleton",
          company: "Pendleton & Associates",
          addressLine1: "740 Park Avenue",
          addressLine2: "Apt 12B",
          city: "New York",
          stateProvince: "NY",
          postalCode: "10021",
          countryCode: "US",
          phone: "+1 555-0193",
          isDefault: true,
          createdAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    ],
  ]));

const memoryResetTokens: Map<
  string,
  {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }
> = global._authResetTokensStore || (global._authResetTokensStore = new Map());

const memoryVerificationTokens: Map<
  string,
  {
    id: string;
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    usedAt: Date | null;
  }
> =
  global._authVerificationTokensStore ||
  (global._authVerificationTokensStore = new Map());

// Orders store for customer order history and IDOR protection verification
export interface ProtectedOrderSummary {
  id: string;
  orderNumber: string;
  userId: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  itemsCount: number;
  items: Array<{
    id: string;
    title: string;
    sku: string;
    price: number;
    quantity: number;
  }>;
}

const memoryOrders: Map<string, ProtectedOrderSummary> = new Map([
  [
    "ord-10001",
    {
      id: "ord-10001",
      orderNumber: "ORD-2026-8091",
      userId: "usr-client-00000004",
      customerEmail: "client@atelier.internal",
      totalAmount: 495.0,
      currency: "USD",
      orderStatus: "delivered",
      paymentStatus: "paid",
      createdAt: "2026-02-14T14:30:00.000Z",
      itemsCount: 1,
      items: [
        {
          id: "oi-101",
          title: "The Sovereign Oxford - Onyx Black",
          sku: "SOV-OXF-BLK-42",
          price: 495.0,
          quantity: 1,
        },
      ],
    },
  ],
  [
    "ord-10002",
    {
      id: "ord-10002",
      orderNumber: "ORD-2026-9211",
      userId: "usr-client-00000004",
      customerEmail: "client@atelier.internal",
      totalAmount: 380.0,
      currency: "USD",
      orderStatus: "processing",
      paymentStatus: "paid",
      createdAt: "2026-03-02T11:15:00.000Z",
      itemsCount: 1,
      items: [
        {
          id: "oi-102",
          title: "The Minimalist Court Sneaker - Blanc",
          sku: "CRT-SNK-WHT-42",
          price: 380.0,
          quantity: 1,
        },
      ],
    },
  ],
  [
    "ord-99999",
    {
      id: "ord-99999",
      orderNumber: "ORD-2026-SECRET-99",
      userId: "usr-owner-00000001", // BELONGS TO OWNER ONLY
      customerEmail: "owner@atelier.internal",
      totalAmount: 1250.0,
      currency: "USD",
      orderStatus: "processing",
      paymentStatus: "paid",
      createdAt: "2026-03-05T09:00:00.000Z",
      itemsCount: 2,
      items: [
        {
          id: "oi-901",
          title: "Custom Bespoke Chelsea Boot",
          sku: "BESP-CHL-BRN-43",
          price: 1250.0,
          quantity: 1,
        },
      ],
    },
  ],
]);

// =============================================================================
// REPOSITORY METHODS
// =============================================================================

export async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const normalized = email.trim().toLowerCase();

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, normalized))
        .limit(1);

      if (user) {
        return {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role as UserRole,
          status: user.status as AccountStatus,
          emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      markDatabaseConnectionFailed(err);
    }
  }

  // Memory fallback lookup
  for (const user of memoryUsers.values()) {
    if (user.email.toLowerCase() === normalized) {
      return { ...user };
    }
  }

  // Development OWNER account resolution (local/dev testing only)
  if (normalized === DEV_ADMIN_EMAIL.toLowerCase()) {
    const diskUser = getDevAdminSeedFromDisk();
    if (diskUser) {
      memoryUsers.set(diskUser.id, diskUser);
      return { ...diskUser };
    }

    const envPass = process.env.INITIAL_ADMIN_PASSWORD?.trim();
    if (envPass && envPass.length >= 8) {
      const devOwner = await createOrUpdateDevAdminUser(envPass);
      memoryUsers.set(devOwner.id, devOwner);
      return { ...devOwner };
    }
  }

  return null;
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const [user] = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);

      if (user) {
        return {
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role as UserRole,
          status: user.status as AccountStatus,
          emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
          lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      }
    } catch (err) {
      markDatabaseConnectionFailed(err);
    }
  }

  const user = memoryUsers.get(id);
  if (user) return { ...user };

  if (id === DEV_ADMIN_USER_ID) {
    const diskUser = getDevAdminSeedFromDisk();
    if (diskUser) {
      memoryUsers.set(diskUser.id, diskUser);
      return { ...diskUser };
    }

    const envPass = process.env.INITIAL_ADMIN_PASSWORD?.trim();
    if (envPass && envPass.length >= 8) {
      const devOwner = await createOrUpdateDevAdminUser(envPass);
      memoryUsers.set(devOwner.id, devOwner);
      return { ...devOwner };
    }
  }

  return null;
}

export async function createUser(data: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  status: AccountStatus;
  emailVerifiedAt?: string | null;
}): Promise<AuthUser> {
  const normalizedEmail = data.email.trim().toLowerCase();
  const id = `usr-${crypto.randomUUID()}`;
  const nowIso = new Date().toISOString();

  const newUser: AuthUser = {
    id,
    email: normalizedEmail,
    passwordHash: data.passwordHash,
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    phone: data.phone?.trim() || null,
    role: data.role,
    status: data.status,
    emailVerifiedAt: data.emailVerifiedAt || null,
    lastLoginAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const [inserted] = await db
        .insert(schema.users)
        .values({
          email: newUser.email,
          passwordHash: newUser.passwordHash,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
          emailVerifiedAt: data.emailVerifiedAt ? new Date(data.emailVerifiedAt) : null,
        })
        .returning();

      if (inserted) {
        newUser.id = inserted.id;
      }
    } catch (err) {
      console.warn("Postgres user creation fallback to memory store:", err);
    }
  }

  memoryUsers.set(newUser.id, newUser);
  return { ...newUser };
}

export async function updateUser(
  id: string,
  updates: Partial<AuthUser>
): Promise<AuthUser | null> {
  const existing = await findUserById(id);
  if (!existing) return null;

  const nowIso = new Date().toISOString();
  const updatedUser: AuthUser = {
    ...existing,
    ...updates,
    updatedAt: nowIso,
  };

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db
        .update(schema.users)
        .set({
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          phone: updatedUser.phone,
          passwordHash: updatedUser.passwordHash,
          role: updatedUser.role,
          status: updatedUser.status,
          emailVerifiedAt: updatedUser.emailVerifiedAt
            ? new Date(updatedUser.emailVerifiedAt)
            : null,
          lastLoginAt: updatedUser.lastLoginAt
            ? new Date(updatedUser.lastLoginAt)
            : null,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, id));
    } catch (err) {
      console.warn("Postgres update fallback to memory store:", err);
    }
  }

  memoryUsers.set(id, updatedUser);
  return { ...updatedUser };
}

export interface UserQueryFilters {
  role?: UserRole | "all";
  status?: AccountStatus | "all";
  search?: string;
  limit?: number;
  offset?: number;
}

export interface UserStatsSummary {
  totalUsers: number;
  customerCount: number;
  staffCount: number;
  adminCount: number;
  ownerCount: number;
  activeCount: number;
  suspendedCount: number;
  disabledCount: number;
}

export async function listAllUsers(filters: UserQueryFilters = {}): Promise<{
  users: AuthUser[];
  total: number;
  stats: UserStatsSummary;
}> {
  const allUsers: AuthUser[] = [];
  for (const u of memoryUsers.values()) {
    allUsers.push({ ...u });
  }

  // Calculate high-level stats across all registered accounts
  const stats: UserStatsSummary = {
    totalUsers: allUsers.length,
    customerCount: allUsers.filter((u) => u.role === "customer").length,
    staffCount: allUsers.filter((u) => u.role === "staff").length,
    adminCount: allUsers.filter((u) => u.role === "admin").length,
    ownerCount: allUsers.filter((u) => u.role === "owner").length,
    activeCount: allUsers.filter((u) => u.status === "active").length,
    suspendedCount: allUsers.filter((u) => u.status === "suspended").length,
    disabledCount: allUsers.filter((u) => u.status === "disabled").length,
  };

  // Apply filters
  let filtered = allUsers;

  if (filters.role && filters.role !== "all") {
    filtered = filtered.filter((u) => u.role === filters.role);
  }

  if (filters.status && filters.status !== "all") {
    filtered = filtered.filter((u) => u.status === filters.status);
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        (u.phone && u.phone.toLowerCase().includes(q))
    );
  }

  // Sort by createdAt descending
  filtered.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const total = filtered.length;
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;
  const paginated = filtered.slice(offset, offset + limit);

  return {
    users: paginated,
    total,
    stats,
  };
}

export async function listStaffAndAdminUsers(): Promise<AuthUser[]> {
  const users: AuthUser[] = [];
  for (const u of memoryUsers.values()) {
    if (u.role === "owner" || u.role === "admin" || u.role === "staff") {
      users.push({ ...u });
    }
  }
  return users;
}

// =============================================================================
// PASSWORD RESET TOKENS
// =============================================================================

export async function savePasswordResetToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  const id = `prt-${crypto.randomUUID()}`;

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db.insert(schema.passwordResetTokens).values({
        userId,
        tokenHash,
        expiresAt,
      });
    } catch (err) {
      console.warn("Postgres reset token save fallback to memory:", err);
    }
  }

  memoryResetTokens.set(tokenHash, {
    id,
    userId,
    tokenHash,
    expiresAt,
    usedAt: null,
  });
}

export async function findValidPasswordResetToken(tokenHash: string) {
  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const [token] = await db
        .select()
        .from(schema.passwordResetTokens)
        .where(
          and(
            eq(schema.passwordResetTokens.tokenHash, tokenHash),
            isNull(schema.passwordResetTokens.usedAt)
          )
        )
        .limit(1);

      if (token) {
        return {
          id: token.id,
          userId: token.userId,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
        };
      }
    } catch (err) {
      console.warn("Postgres query token fallback to memory:", err);
    }
  }

  const record = memoryResetTokens.get(tokenHash);
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}

export async function invalidatePasswordResetToken(idOrHash: string): Promise<void> {
  const now = new Date();

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db
        .update(schema.passwordResetTokens)
        .set({ usedAt: now })
        .where(eq(schema.passwordResetTokens.tokenHash, idOrHash));
    } catch (err) {
      console.warn("Postgres invalidate token fallback to memory:", err);
    }
  }

  for (const [hash, record] of memoryResetTokens.entries()) {
    if (record.id === idOrHash || hash === idOrHash) {
      record.usedAt = now;
      break;
    }
  }
}

// =============================================================================
// EMAIL VERIFICATION TOKENS
// =============================================================================

export async function saveEmailVerificationToken(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<void> {
  const id = `evt-${crypto.randomUUID()}`;

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db.insert(schema.emailVerificationTokens).values({
        userId,
        tokenHash,
        expiresAt,
      });
    } catch (err) {
      console.warn("Postgres email verification token save fallback:", err);
    }
  }

  memoryVerificationTokens.set(tokenHash, {
    id,
    userId,
    tokenHash,
    expiresAt,
    usedAt: null,
  });
}

export async function findValidEmailVerificationToken(tokenHash: string) {
  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const [token] = await db
        .select()
        .from(schema.emailVerificationTokens)
        .where(
          and(
            eq(schema.emailVerificationTokens.tokenHash, tokenHash),
            isNull(schema.emailVerificationTokens.usedAt)
          )
        )
        .limit(1);

      if (token) {
        return {
          id: token.id,
          userId: token.userId,
          expiresAt: token.expiresAt,
          usedAt: token.usedAt,
        };
      }
    } catch (err) {
      console.warn("Postgres query verification token fallback:", err);
    }
  }

  const record = memoryVerificationTokens.get(tokenHash);
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  return record;
}

export async function invalidateEmailVerificationToken(idOrHash: string): Promise<void> {
  const now = new Date();

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db
        .update(schema.emailVerificationTokens)
        .set({ usedAt: now })
        .where(eq(schema.emailVerificationTokens.tokenHash, idOrHash));
    } catch (err) {
      console.warn("Postgres invalidate verification token fallback:", err);
    }
  }

  for (const [hash, record] of memoryVerificationTokens.entries()) {
    if (record.id === idOrHash || hash === idOrHash) {
      record.usedAt = now;
      break;
    }
  }
}

// =============================================================================
// CUSTOMER ADDRESSES
// =============================================================================

export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.userAddresses)
        .where(eq(schema.userAddresses.userId, userId));

      if (rows.length > 0) {
        return rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          recipientName: r.recipientName,
          company: r.company || null,
          addressLine1: r.addressLine1,
          addressLine2: r.addressLine2 || null,
          city: r.city,
          stateProvince: r.stateProvince,
          postalCode: r.postalCode,
          countryCode: r.countryCode,
          phone: r.phone,
          isDefault: r.isDefaultShipping,
          isDefaultShipping: r.isDefaultShipping,
          isDefaultBilling: r.isDefaultBilling,
          addressType: r.addressType as "shipping" | "billing" | "both",
          createdAt: r.createdAt.toISOString(),
        }));
      }
    } catch (err) {
      console.warn("DB getUserAddresses error, fallback to memory:", err);
    }
  }

  const addresses = memoryAddresses.get(userId) || [];
  return [...addresses];
}

export async function createUserAddress(
  userIdOrData: string | (Omit<UserAddress, "id" | "createdAt"> & { userId: string }),
  addressData?: Omit<UserAddress, "id" | "userId" | "createdAt">
): Promise<UserAddress> {
  let userId: string;
  let address: Omit<UserAddress, "id" | "userId" | "createdAt">;

  if (typeof userIdOrData === "string") {
    userId = userIdOrData;
    address = addressData!;
  } else {
    const { userId: uid, ...rest } = userIdOrData;
    userId = uid;
    address = rest;
  }

  const id = `addr-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const isDefault = Boolean(address.isDefault || address.isDefaultShipping);

  const newAddress: UserAddress = {
    id,
    userId,
    ...address,
    isDefault,
    isDefaultShipping: isDefault,
    isDefaultBilling: Boolean(address.isDefaultBilling),
    createdAt: now,
  };

  const list = memoryAddresses.get(userId) || [];
  if (isDefault) {
    list.forEach((a) => {
      a.isDefault = false;
      a.isDefaultShipping = false;
    });
  }
  list.push(newAddress);
  memoryAddresses.set(userId, list);

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      if (isDefault) {
        await db
          .update(schema.userAddresses)
          .set({ isDefaultShipping: false })
          .where(eq(schema.userAddresses.userId, userId));
      }
      await db.insert(schema.userAddresses).values({
        userId,
        recipientName: newAddress.recipientName,
        company: newAddress.company || null,
        addressLine1: newAddress.addressLine1,
        addressLine2: newAddress.addressLine2 || null,
        city: newAddress.city,
        stateProvince: newAddress.stateProvince,
        postalCode: newAddress.postalCode,
        countryCode: newAddress.countryCode,
        phone: newAddress.phone,
        isDefaultShipping: isDefault,
        isDefaultBilling: Boolean(address.isDefaultBilling),
        addressType: address.addressType || "both",
      });
    } catch (err) {
      console.warn("DB createUserAddress fallback to memory:", err);
    }
  }

  return newAddress;
}

export async function updateUserAddress(
  userId: string,
  addressId: string,
  data: Partial<Omit<UserAddress, "id" | "userId" | "createdAt">>
): Promise<UserAddress | null> {
  const list = memoryAddresses.get(userId) || [];
  const index = list.findIndex((a) => a.id === addressId);

  const isDefault = data.isDefault !== undefined ? data.isDefault : data.isDefaultShipping;

  if (index !== -1) {
    if (isDefault) {
      list.forEach((a) => {
        a.isDefault = false;
        a.isDefaultShipping = false;
      });
    }

    const existing = list[index];
    list[index] = {
      ...existing,
      ...data,
      isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
      isDefaultShipping: isDefault !== undefined ? isDefault : existing.isDefaultShipping,
    };
    memoryAddresses.set(userId, list);
  }

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      if (isDefault) {
        await db
          .update(schema.userAddresses)
          .set({ isDefaultShipping: false })
          .where(eq(schema.userAddresses.userId, userId));
      }

      await db
        .update(schema.userAddresses)
        .set({
          recipientName: data.recipientName,
          company: data.company,
          addressLine1: data.addressLine1,
          addressLine2: data.addressLine2,
          city: data.city,
          stateProvince: data.stateProvince,
          postalCode: data.postalCode,
          countryCode: data.countryCode,
          phone: data.phone,
          isDefaultShipping: isDefault,
          isDefaultBilling: data.isDefaultBilling,
          addressType: data.addressType,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.userAddresses.id, addressId),
            eq(schema.userAddresses.userId, userId)
          )
        );
    } catch (err) {
      console.warn("DB updateUserAddress error:", err);
    }
  }

  const updatedList = await getUserAddresses(userId);
  return updatedList.find((a) => a.id === addressId) || (index !== -1 ? list[index] : null);
}

export async function deleteUserAddress(
  userId: string,
  addressId: string
): Promise<boolean> {
  const list = memoryAddresses.get(userId) || [];
  const initialLength = list.length;
  const filtered = list.filter((a) => a.id !== addressId);
  memoryAddresses.set(userId, filtered);

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db
        .delete(schema.userAddresses)
        .where(
          and(
            eq(schema.userAddresses.id, addressId),
            eq(schema.userAddresses.userId, userId)
          )
        );
      return true;
    } catch (err) {
      console.warn("DB deleteUserAddress error:", err);
    }
  }

  return filtered.length < initialLength;
}

export async function setDefaultUserAddress(
  userId: string,
  addressId: string
): Promise<boolean> {
  const list = memoryAddresses.get(userId) || [];
  let found = false;
  for (const addr of list) {
    if (addr.id === addressId) {
      addr.isDefault = true;
      addr.isDefaultShipping = true;
      found = true;
    } else {
      addr.isDefault = false;
      addr.isDefaultShipping = false;
    }
  }
  memoryAddresses.set(userId, list);

  if (isDatabaseConfigured()) {
    try {
      const db = getDb();
      await db
        .update(schema.userAddresses)
        .set({ isDefaultShipping: false })
        .where(eq(schema.userAddresses.userId, userId));

      await db
        .update(schema.userAddresses)
        .set({ isDefaultShipping: true })
        .where(
          and(
            eq(schema.userAddresses.id, addressId),
            eq(schema.userAddresses.userId, userId)
          )
        );
      return true;
    } catch (err) {
      console.warn("DB setDefaultUserAddress error:", err);
    }
  }

  return found;
}

export async function getUserWithDetails(userId: string) {
  const user = await findUserById(userId);
  if (!user) return null;

  const orders = await getOrdersByUserId(userId);
  const addresses = await getUserAddresses(userId);
  const totalSpend = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return {
    ...user,
    orders,
    addresses,
    ordersCount: orders.length,
    totalSpend,
  };
}

// =============================================================================
// PROTECTED CUSTOMER ORDERS & IDOR VERIFICATION
// =============================================================================

export async function getOrdersByUserId(userId: string): Promise<ProtectedOrderSummary[]> {
  try {
    const { orderService } = await import("@/lib/orders/order-service");
    const list = await orderService.getOrdersByUserId(userId);
    if (list.length > 0) {
      return list.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        userId: o.userId || userId,
        customerEmail: o.customerEmail,
        totalAmount: o.totalAmount,
        currency: o.currency,
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
        itemsCount: o.items.reduce((s, it) => s + it.quantity, 0),
        items: o.items.map((it) => ({
          id: it.id,
          title: it.productTitle,
          sku: it.sku,
          price: it.unitPrice,
          quantity: it.quantity,
        })),
      }));
    }
  } catch (err) {
    console.warn("orderService.getOrdersByUserId fallback:", err);
  }

  const results: ProtectedOrderSummary[] = [];
  for (const order of memoryOrders.values()) {
    if (order.userId === userId) {
      results.push({ ...order });
    }
  }
  return results;
}

export async function getOrderById(orderId: string): Promise<ProtectedOrderSummary | null> {
  try {
    const { orderService } = await import("@/lib/orders/order-service");
    const order = await orderService.getOrderById(orderId);
    if (order) {
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId || "",
        customerEmail: order.customerEmail,
        totalAmount: order.totalAmount,
        currency: order.currency,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt,
        itemsCount: order.items.reduce((s, it) => s + it.quantity, 0),
        items: order.items.map((it) => ({
          id: it.id,
          title: it.productTitle,
          sku: it.sku,
          price: it.unitPrice,
          quantity: it.quantity,
        })),
      };
    }
  } catch (err) {
    console.warn("orderService.getOrderById fallback:", err);
  }

  const order = memoryOrders.get(orderId);
  return order ? { ...order } : null;
}
