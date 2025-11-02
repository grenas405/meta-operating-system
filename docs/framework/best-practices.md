# 🚀 DenoGenesis Framework Best Practices

_Comprehensive guide for building world-class applications with consistency, scalability, and clean architecture._  
**Version:** 2.1  
**Last Updated:** August 19, 2025

---

## 🎯 **Core Philosophy**

DenoGenesis follows the principle of **"Elegant Simplicity"** - sophisticated architecture implemented through simple, consistent patterns. We avoid over-engineering while maintaining enterprise-grade quality.

### **Fundamental Principles:**
- ✅ **Thin routers, fat controllers**
- ✅ **Service layer for business logic**
- ✅ **Models for data access patterns**
- ✅ **No redundant code patterns**
- ✅ **AI-augmented development workflow**
- ✅ **Local-first architecture**
- ✅ **Business sovereignty through technology**

---

## 📋 **1. Router Architecture**

### ✅ **Core Principle**
**Routers should be thin → map routes to controllers → nothing else.**

Controllers handle:
- Request/response formatting
- Input validation
- Service orchestration
- Error handling

Routers only map `HTTP Method + Path` → `Controller Function`.

### 🧠 **Controller Function Signature**

✅ **Best Practice:**
```ts
export const myController = async (ctx: Context) => {
  // Your logic here
  ctx.response.status = 200;
  ctx.response.body = { success: true, data: result };
};
```

**Controller must accept `ctx: Context` as its first parameter.**  
👉 This allows router to cleanly map:
```ts
router.get("/", myController);
```

### ❌ **Anti-Patterns to Avoid**

**DON'T wrap controllers in routers:**
```ts
// ❌ BAD - Creates wrapper functions
export const getAnalyticsData = async () => {
  return await db.query("SELECT * FROM analytics");
};

// Forces router wrapper:
router.get("/", async (ctx: Context) => {
  const data = await getAnalyticsData();
  ctx.response.body = data;
});
```

**DON'T duplicate ctx parameter:**
```ts
// ❌ BAD - Redundant ctx handling
router.get("/", async (ctx: Context) => {
  await myController(ctx); // Controller already takes ctx
});
```

### ✅ **Clean Router Example**
```ts
import { Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { 
  createInvoice,
  listInvoices,
  getInvoiceById 
} from "../controllers/invoiceController.ts";

const router = new Router();

// Clean, declarative mapping
router.post("/", createInvoice);
router.get("/", listInvoices);
router.get("/:id", getInvoiceById);

export default router;
```

### 🛡️ **Middleware Usage**
```ts
// Middleware first, controller second
router.post("/", verifyAdminToken, createInvoice);
router.put("/:id", verifyOwnership, updateInvoice);
```

**Order matters:** Middleware → Controller → Never the other way around.

---

## 🎛️ **2. Controller Patterns**

### ✅ **Standard Controller Structure**
```ts
import { InvoiceService } from "../services/invoiceService.ts";

export const createInvoice = async (ctx: Context) => {
  try {
    // 1. Input validation
    const body = await ctx.request.body().value;
    if (!body.client_name?.trim()) {
      ctx.response.status = 400;
      ctx.response.body = { error: "Client name is required" };
      return;
    }

    // 2. Delegate to service layer
    const invoice = await InvoiceService.create(body);

    // 3. Success response
    ctx.response.status = 201;
    ctx.response.body = {
      success: true,
      data: invoice,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    // 4. Error handling
    console.error(`Error in createInvoice:`, error);
    ctx.response.status = 500;
    ctx.response.body = {
      error: "Internal server error",
      message: error.message
    };
  }
};
```

### 🔍 **Controller Responsibilities**
- **Input validation** (basic format checks)
- **Request/response formatting**
- **HTTP status codes**
- **Error boundary handling**
- **Service orchestration** (calling services)

### ❌ **Controllers Should NOT:**
- Contain business logic
- Access database directly
- Perform complex calculations
- Handle data transformations

---

## 🏢 **3. Service Layer Patterns**

### ✅ **Service Structure**
```ts
// services/invoiceService.ts
import { InvoiceModel } from "../models/invoiceModel.ts";
import { Invoice, CreateInvoiceRequest } from "../types/interfaces.ts";

export class InvoiceService {
  /**
   * Create new invoice with business logic
   */
  static async create(data: CreateInvoiceRequest): Promise<Invoice> {
    // 1. Business validation
    this.validateBusinessRules(data);
    
    // 2. Generate invoice number
    const invoiceNumber = this.generateInvoiceNumber();
    
    // 3. Calculate totals
    const { subtotal, taxAmount, total } = this.calculateTotals(data.items, data.tax_rate);
    
    // 4. Prepare invoice data
    const invoiceData = {
      ...data,
      invoiceNumber,
      issueDate: new Date().toISOString().split('T')[0],
      subtotal,
      taxAmount,
      total,
      status: 'draft' as const
    };
    
    // 5. Save via model
    const invoice = await InvoiceModel.create(invoiceData);
    
    // 6. Business logic (notifications, etc.)
    await this.handleInvoiceCreated(invoice);
    
    return invoice;
  }

  /**
   * List invoices with business logic
   */
  static async list(filters: InvoiceFilters): Promise<InvoiceListResponse> {
    // Apply business rules to filters
    const sanitizedFilters = this.sanitizeFilters(filters);
    
    // Get data via model
    const result = await InvoiceModel.findMany(sanitizedFilters);
    
    // Apply business transformations
    const transformedInvoices = result.invoices.map(this.transformForClient);
    
    return {
      invoices: transformedInvoices,
      pagination: result.pagination
    };
  }

  /**
   * Private business logic methods
   */
  private static validateBusinessRules(data: CreateInvoiceRequest): void {
    if (data.items.length === 0) {
      throw new Error("At least one item is required");
    }
    
    if (data.items.some(item => item.rate <= 0)) {
      throw new Error("Item rates must be positive");
    }
  }

  private static generateInvoiceNumber(): string {
    const prefix = "INV";
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  private static calculateTotals(items: InvoiceItem[], taxRate: number = 0) {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.rate);
    }, 0);
    
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  }

  private static async handleInvoiceCreated(invoice: Invoice): Promise<void> {
    // Business logic: send notifications, update analytics, etc.
    console.log(`✅ Invoice ${invoice.invoiceNumber} created for ${invoice.clientName}`);
  }

  private static transformForClient(invoice: any): Invoice {
    // Transform database record for client consumption
    return {
      ...invoice,
      items: JSON.parse(invoice.items_json || '[]'),
      // Remove internal fields
      items_json: undefined
    };
  }

  private static sanitizeFilters(filters: InvoiceFilters): InvoiceFilters {
    return {
      ...filters,
      page: Math.max(1, filters.page || 1),
      limit: Math.min(100, Math.max(1, filters.limit || 10))
    };
  }
}
```

### 🎯 **Service Responsibilities**
- **Business logic** implementation
- **Business validation** rules
- **Data transformations**
- **Complex calculations**
- **Business process orchestration**
- **Integration with external services**
- **Caching strategies**

---

## 🗂️ **4. Model Layer Patterns**

### ✅ **Model Structure**
```ts
// models/invoiceModel.ts
import { executeQuery } from "../database/client.ts";
import { SITE_KEY } from "../config/env.ts";
import { Invoice, InvoiceFilters } from "../types/interfaces.ts";

export class InvoiceModel {
  /**
   * Create new invoice record
   */
  static async create(data: CreateInvoiceData): Promise<Invoice> {
    const sql = `
      INSERT INTO invoices (
        site_key, invoice_number, client_name, client_email, client_address,
        business_name, business_address, business_email, business_phone,
        issue_date, due_date, subtotal, tax_rate, tax_amount, total,
        notes, terms, items_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await executeQuery(sql, [
      SITE_KEY,
      data.invoiceNumber,
      data.clientName,
      data.clientEmail,
      data.clientAddress,
      data.businessName,
      data.businessAddress,
      data.businessEmail,
      data.businessPhone,
      data.issueDate,
      data.dueDate,
      data.subtotal,
      data.taxRate,
      data.taxAmount,
      data.total,
      data.notes,
      data.terms,
      JSON.stringify(data.items),
      data.status
    ]);

    return await this.findById(result.lastInsertId);
  }

  /**
   * Find invoice by ID
   */
  static async findById(id: number): Promise<Invoice | null> {
    const sql = `
      SELECT * FROM invoices 
      WHERE id = ? AND site_key = ?
    `;

    const result = await executeQuery(sql, [id, SITE_KEY]);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * Find many invoices with filters
   */
  static async findMany(filters: InvoiceFilters): Promise<{
    invoices: Invoice[];
    pagination: PaginationInfo;
  }> {
    const { page = 1, limit = 10, status } = filters;
    const offset = (page - 1) * limit;

    // Build query with optional filters
    let sql = `
      SELECT id, invoice_number, client_name, client_email, issue_date, 
             due_date, total, status, created_at
      FROM invoices 
      WHERE site_key = ?
    `;
    const params = [SITE_KEY];

    if (status) {
      sql += ` AND status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const invoices = await executeQuery(sql, params);

    // Get total count
    const countResult = await this.getCount(filters);
    const total = countResult.count;

    return {
      invoices: invoices || [],
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update invoice status
   */
  static async updateStatus(id: number, status: InvoiceStatus): Promise<boolean> {
    const sql = `
      UPDATE invoices 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND site_key = ?
    `;

    const result = await executeQuery(sql, [status, id, SITE_KEY]);
    return result.affectedRows > 0;
  }

  /**
   * Delete invoice
   */
  static async delete(id: number): Promise<boolean> {
    const sql = `
      DELETE FROM invoices 
      WHERE id = ? AND site_key = ?
    `;

    const result = await executeQuery(sql, [id, SITE_KEY]);
    return result.affectedRows > 0;
  }

  /**
   * Get count for pagination
   */
  private static async getCount(filters: InvoiceFilters): Promise<{ count: number }> {
    let sql = `SELECT COUNT(*) as count FROM invoices WHERE site_key = ?`;
    const params = [SITE_KEY];

    if (filters.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    const result = await executeQuery(sql, params);
    return result[0];
  }

  /**
   * Find invoices by status
   */
  static async findByStatus(status: InvoiceStatus): Promise<Invoice[]> {
    const sql = `
      SELECT * FROM invoices 
      WHERE site_key = ? AND status = ?
      ORDER BY created_at DESC
    `;

    return await executeQuery(sql, [SITE_KEY, status]);
  }

  /**
   * Find overdue invoices
   */
  static async findOverdue(): Promise<Invoice[]> {
    const sql = `
      SELECT * FROM invoices 
      WHERE site_key = ? AND due_date < CURDATE() AND status != 'paid'
      ORDER BY due_date ASC
    `;

    return await executeQuery(sql, [SITE_KEY]);
  }
}
```

### 🎯 **Model Responsibilities**
- **Database operations** (CRUD)
- **Query construction**
- **Multi-tenant isolation** (site_key)
- **Basic data validation** (database constraints)
- **Raw data retrieval/storage**

### ❌ **Models Should NOT:**
- Contain business logic
- Perform complex calculations
- Handle HTTP requests/responses
- Format data for presentation
- Implement business rules

---

## 📁 **5. File Organization**

### 🗂️ **Complete Directory Structure**
```
project/
├── config/
│   └── env.ts                    # Environment configuration
├── controllers/
│   ├── invoiceController.ts      # Request/response handling
│   ├── userController.ts         # User management
│   └── analyticsController.ts    # Analytics endpoints
├── services/
│   ├── invoiceService.ts         # Invoice business logic
│   ├── userService.ts            # User business logic
│   ├── emailService.ts           # Email notifications
│   └── analyticsService.ts       # Analytics calculations
├── models/
│   ├── invoiceModel.ts           # Invoice data access
│   ├── userModel.ts              # User data access
│   ├── siteModel.ts              # Site settings data access
│   └── baseModel.ts              # Common model functionality
├── database/
│   ├── client.ts                 # Database connection
│   ├── schema.sql                # Database schema
│   └── migrations/               # Database migrations
│       ├── 001_create_invoices.sql
│       └── 002_add_payments.sql
├── middleware/
│   ├── index.ts                  # Middleware orchestration
│   ├── security.ts               # Security middleware
│   ├── logging.ts                # Request logging
│   └── auth.ts                   # Authentication
├── routes/
│   ├── index.ts                  # Main router
│   ├── invoices.ts               # Invoice routes
│   ├── users.ts                  # User routes
│   └── analytics.ts              # Analytics routes
├── types/
│   ├── interfaces.ts             # TypeScript interfaces
│   ├── invoice.ts                # Invoice-specific types
│   └── user.ts                   # User-specific types
├── utils/
│   ├── validation.ts             # Input validation helpers
│   ├── formatting.ts             # Data formatting utilities
│   └── constants.ts              # Application constants
├── public/
│   ├── assets/                   # Static assets
│   └── components/               # Frontend components
└── main.ts                       # Application entry point
```

### 📝 **File Naming Conventions**
- **Controllers:** `{entity}Controller.ts` (e.g., `invoiceController.ts`)
- **Services:** `{entity}Service.ts` (e.g., `invoiceService.ts`)
- **Models:** `{entity}Model.ts` (e.g., `invoiceModel.ts`)
- **Routes:** `{entity}.ts` (e.g., `invoices.ts`)
- **Types:** `{entity}.ts` or `interfaces.ts` for shared types

---

## 🏗️ **6. Architecture Flow**

### ✅ **Request Flow Pattern**
```
1. Router        → Maps route to controller
2. Middleware    → Authentication, validation, logging
3. Controller    → Input validation, format request/response
4. Service       → Business logic, orchestration
5. Model         → Database operations
6. Database      → Data storage/retrieval
```

### 📊 **Example: Create Invoice Flow**
```ts
// 1. Router (routes/invoices.ts)
router.post("/", createInvoice);

// 2. Controller (controllers/invoiceController.ts)
export const createInvoice = async (ctx: Context) => {
  const body = await ctx.request.body().value;
  
  // Basic validation
  if (!body.client_name) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Client name required" };
    return;
  }
  
  // Delegate to service
  const invoice = await InvoiceService.create(body);
  
  // Format response
  ctx.response.status = 201;
  ctx.response.body = { success: true, data: invoice };
};

// 3. Service (services/invoiceService.ts)
static async create(data: CreateInvoiceRequest): Promise<Invoice> {
  // Business logic
  const invoiceNumber = this.generateInvoiceNumber();
  const totals = this.calculateTotals(data.items);
  
  // Prepare data
  const invoiceData = { ...data, invoiceNumber, ...totals };
  
  // Save via model
  return await InvoiceModel.create(invoiceData);
}

// 4. Model (models/invoiceModel.ts)
static async create(data: CreateInvoiceData): Promise<Invoice> {
  const sql = `INSERT INTO invoices (...) VALUES (...)`;
  const result = await executeQuery(sql, [...]);
  return await this.findById(result.lastInsertId);
}
```

---

## 🎯 **7. Type Definitions**

### ✅ **Interface Organization**
```ts
// types/interfaces.ts - Shared interfaces
export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

// types/invoice.ts - Invoice-specific types
export interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  total: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  createdAt: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface CreateInvoiceRequest {
  client_name: string;
  client_email: string;
  client_address?: string;
  due_date: string;
  items: InvoiceItem[];
  tax_rate?: number;
  notes?: string;
  terms?: string;
}

export interface InvoiceFilters {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
}
```

---

## 🤖 **8. AI-Augmented Development Workflow**

### ✅ **Effective AI Prompting Patterns**

**DO use architectural context:**
```
"Implement invoice creation following DenoGenesis architecture:
- Thin controller with ctx: Context signature
- Service layer for business logic (calculations, validation)
- Model layer for database operations
- Multi-tenant with site_key isolation
- Standard error handling patterns"
```

**DON'T over-specify implementation:**
```ts
// ❌ DON'T: "Implement using CQRS with event sourcing"
// ✅ DO: "Follow the existing Service → Model pattern"
```

### 📖 **Documentation-Driven Development**
```ts
/**
 * Invoice Service - Business Logic Layer
 * 
 * Handles:
 * - Invoice creation with automatic calculations
 * - Business validation rules
 * - Invoice number generation
 * - Status management workflows
 * 
 * Dependencies:
 * - InvoiceModel for data access
 * - EmailService for notifications
 */
export class InvoiceService {
  // Implementation follows...
}
```

---

## 🧪 **9. Testing Patterns**

### ✅ **Testing Each Layer**

**Controller Testing:**
```bash
# Test HTTP endpoints
curl -X POST "localhost:3003/api/invoices" \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Test", "items": [...]}' | jq '.'
```

**Service Testing:**
```ts
// Manual service testing
const testData = {
  client_name: "Test Client",
  client_email: "test@example.com",
  items: [{ description: "Test", quantity: 1, rate: 100 }]
};

const invoice = await InvoiceService.create(testData);
console.log("Created invoice:", invoice);
```

**Model Testing:**
```ts
// Direct model testing
const invoice = await InvoiceModel.findById(1);
console.log("Found invoice:", invoice);
```

---

## 🚀 **10. Performance Patterns**

### ⚡ **Service Layer Optimization**
```ts
export class InvoiceService {
  // Cache expensive calculations
  private static calculationCache = new Map();
  
  static async getMonthlyStats(month: string): Promise<MonthlyStats> {
    if (this.calculationCache.has(month)) {
      return this.calculationCache.get(month);
    }
    
    const stats = await InvoiceModel.getMonthlyStats(month);
    this.calculationCache.set(month, stats);
    
    // Clear cache after 1 hour
    setTimeout(() => this.calculationCache.delete(month), 3600000);
    
    return stats;
  }
}
```

## 🚀 **10. Performance Patterns**

### ⚡ **Service Layer Optimization**
```ts
export class InvoiceService {
  // Cache expensive calculations
  private static calculationCache = new Map();
  
  static async getMonthlyStats(month: string): Promise<MonthlyStats> {
    if (this.calculationCache.has(month)) {
      return this.calculationCache.get(month);
    }
    
    const stats = await InvoiceModel.getMonthlyStats(month);
    this.calculationCache.set(month, stats);
    
    // Clear cache after 1 hour
    setTimeout(() => this.calculationCache.delete(month), 3600000);
    
    return stats;
  }
}
```

### 📦 **Model Layer Optimization**
```ts
export class InvoiceModel {
  // Use database indexes effectively
  static async findRecentInvoices(limit = 50): Promise<Invoice[]> {
    const sql = `
      SELECT * FROM invoices 
      WHERE site_key = ?
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    // Leverages idx_site_created_at index
    return await executeQuery(sql, [SITE_KEY, limit]);
  }
}
```

---

## 🌟 **11. Anti-Patterns to Avoid**

### ❌ **Don't Mix Responsibilities**
```ts
// ❌ BAD: Controller with business logic
export const createInvoice = async (ctx: Context) => {
  const body = await ctx.request.body().value;
  
  // Business logic in controller (BAD!)
  const invoiceNumber = `INV-${Date.now()}`;
  const total = body.items.reduce((sum, item) => sum + item.total, 0);
  
  // Database access in controller (BAD!)
  const sql = "INSERT INTO invoices...";
  await executeQuery(sql, [...]);
};

// ✅ GOOD: Proper separation
export const createInvoice = async (ctx: Context) => {
  const body = await ctx.request.body().value;
  const invoice = await InvoiceService.create(body); // Delegate
  ctx.response.body = { success: true, data: invoice };
};
```

### ❌ **Don't Skip the Service Layer**
```ts
// ❌ BAD: Controller calling model directly
export const createInvoice = async (ctx: Context) => {
  const body = await ctx.request.body().value;
  const invoice = await InvoiceModel.create(body); // No business logic!
  ctx.response.body = { success: true, data: invoice };
};

// ✅ GOOD: Controller → Service → Model
export const createInvoice = async (ctx: Context) => {
  const body = await ctx.request.body().value;
  const invoice = await InvoiceService.create(body); // Business logic included
  ctx.response.body = { success: true, data: invoice };
};
```

### ❌ **Don't Put Business Logic in Models**
```ts
// ❌ BAD: Business logic in model
export class InvoiceModel {
  static async create(data) {
    // Business logic in model (BAD!)
    const invoiceNumber = this.generateInvoiceNumber();
    const total = this.calculateTotal(data.items);
    
    // Should only handle data access
    return await executeQuery(...);
  }
}

// ✅ GOOD: Business logic in service
export class InvoiceService {
  static async create(data) {
    // Business logic in service (GOOD!)
    const invoiceNumber = this.generateInvoiceNumber();
    const total = this.calculateTotal(data.items);
    
    // Delegate data access to model
    return await InvoiceModel.create({ ...data, invoiceNumber, total });
  }
}
```

---

## 🎯 **Summary Checklist**

### ✅ **For Every New Feature:**
- [ ] Thin router with direct controller mapping
- [ ] Controller handles request/response formatting only
- [ ] Service layer contains all business logic
- [ ] Model layer handles database operations only
- [ ] Multi-tenant isolation with `site_key`
- [ ] Proper TypeScript interfaces defined
- [ ] Input validation with clear error messages
- [ ] Consistent response formatting
- [ ] Error handling at appropriate layers
- [ ] Documentation for complex logic

### ✅ **Architecture Flow Verification:**
- [ ] Router → Controller → Service → Model → Database
- [ ] No layer-skipping (Controller → Model directly)
- [ ] No business logic in wrong layers
- [ ] Consistent error propagation
- [ ] Proper separation of concerns

---

## 💡 **Philosophy Reminder**

> **"Architecture is about the important stuff. Whatever that is."** - Ralph Johnson

DenoGenesis architecture prioritizes:
1. **Clear separation** of concerns
2. **Consistent patterns** across all features
3. **Maintainable code** over clever tricks
4. **Business logic** in the right place
5. **Testable components** at every layer

## 🚀 **Keep Building**

You're implementing a clean, scalable architecture that:
- **Separates concerns** properly across layers
- **Scales naturally** as features grow
- **Maintains consistency** across the codebase
- **Enables testing** at every level
- **Supports AI-augmented development** workflows
