// Mock Prisma implementation for development/testing without database
// This temporarily disables all database calls and returns mock data

const mockUsers = new Map();
const mockMerchants = new Map();
const mockCustomers = new Map();
const mockCards = new Map();
const mockPayments = new Map();

let userIdCounter = 0;
let merchantIdCounter = 0;
let customerIdCounter = 0;

export const mockPrisma = {
  user: {
    create: async (data: any) => {
      const id = `user-${++userIdCounter}`;
      const user = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      mockUsers.set(id, user);
      mockUsers.set(data.data.email, user);
      if (data.data.walletAddress) mockUsers.set(data.data.walletAddress, user);
      return user;
    },
    findUnique: async (data: any) => {
      const where = data.where;
      if (where.id) return mockUsers.get(where.id);
      if (where.email) return mockUsers.get(where.email);
      if (where.walletAddress) return mockUsers.get(where.walletAddress);
      return null;
    },
    findMany: async () => Array.from(mockUsers.values()),
    update: async (data: any) => {
      const user = mockUsers.get(data.where.id);
      if (user) {
        const updated = { ...user, ...data.data, updatedAt: new Date() };
        mockUsers.set(data.where.id, updated);
        return updated;
      }
      return null;
    },
    delete: async (data: any) => mockUsers.delete(data.where.id),
  },

  merchant: {
    create: async (data: any) => {
      const id = `merchant-${++merchantIdCounter}`;
      const merchant = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      mockMerchants.set(id, merchant);
      mockMerchants.set(data.data.userId, merchant);
      return merchant;
    },
    findUnique: async (data: any) => {
      const where = data.where;
      if (where.id) return mockMerchants.get(where.id);
      if (where.userId) return mockMerchants.get(where.userId);
      return null;
    },
    findMany: async () => Array.from(mockMerchants.values()),
  },

  customer: {
    create: async (data: any) => {
      const id = `customer-${++customerIdCounter}`;
      const customer = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      mockCustomers.set(id, customer);
      mockCustomers.set(data.data.userId, customer);
      return customer;
    },
    findUnique: async (data: any) => {
      const where = data.where;
      if (where.id) return mockCustomers.get(where.id);
      if (where.userId) return mockCustomers.get(where.userId);
      return null;
    },
    findMany: async () => Array.from(mockCustomers.values()),
  },

  card: {
    create: async (data: any) => {
      const id = `card-${Date.now()}`;
      const card = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      mockCards.set(id, card);
      mockCards.set(data.data.cardNumber, card);
      return card;
    },
    findUnique: async (data: any) => {
      const where = data.where;
      if (where.id) return mockCards.get(where.id);
      if (where.cardNumber) return mockCards.get(where.cardNumber);
      return null;
    },
    findMany: async () => Array.from(mockCards.values()),
  },

  payment: {
    create: async (data: any) => {
      const id = `payment-${Date.now()}`;
      const payment = { id, ...data.data, createdAt: new Date(), updatedAt: new Date() };
      mockPayments.set(id, payment);
      return payment;
    },
    findMany: async (data: any) => {
      const payments = Array.from(mockPayments.values());
      if (data?.where?.merchantId) {
        return payments.filter(p => p.merchantId === data.where.merchantId);
      }
      if (data?.take) {
        return payments.slice(0, data.take);
      }
      return payments;
    },
    findUnique: async (data: any) => {
      const where = data.where;
      if (where.id) return mockPayments.get(where.id);
      return null;
    },
    count: async (data: any) => {
      const payments = Array.from(mockPayments.values());
      if (data?.where?.merchantId) {
        return payments.filter(p => p.merchantId === data.where.merchantId).length;
      }
      return payments.length;
    },
    aggregate: async (data: any) => {
      const payments = Array.from(mockPayments.values());
      if (data?.where?.merchantId) {
        const filtered = payments.filter(p => p.merchantId === data.where.merchantId);
        const sum = filtered.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        return { _sum: { amount: sum > 0 ? sum : null } };
      }
      return { _sum: { amount: null } };
    },
  },
};

export default mockPrisma;
