export type Pagination = {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

export type TenantListItem = {
    id: string
    name: string
    slug: string
    legalName: string | null
    document: string
    email: string
    phone: string
    isActive: boolean
    planId: string | null
    subscriptionStatusId: string | null
    subscriptionExpireDate: string | null
    createdAt: string
    updatedAt: string
    deletedAt: string | null
}

export type TenantDetail = {
    tenant: TenantListItem & {
        zipcode: string | null
        street: string | null
        state: string | null
        district: string | null
        city: string | null
        number: string | null
        country: string | null
        logoUrl: string | null
        primaryColor: string | null
        timezone: string
        currency: string
    }
    database: boolean
    userCount: number
    users: Array<{
        id: string
        login: string
        isActive: boolean
        createdAt: string
        lastLogin: string | null
    }>
    stats: TenantStats | null
}

export type TenantStats = {
    products: number
    sales: number
    salesAmount: number
    settledSales: number
    salesToday: number
    salesTodayAmount: number
    clients: number
    payments: number
    openCashes: number
    recentSales: Array<{
        id: string
        totalAmount: number
        createdAt: string
        settledAt: string | null
    }>
}

export type OverviewData = {
    metrics: {
        totalTenants: number
        activeTenants: number
        inactiveTenants: number
        newTenants30d: number
        totalUsers: number
        activeUsers: number
        totalProducts: number
        totalSales: number
        totalSalesAmount: number
        salesToday: number
        salesTodayAmount: number
        openCashes: number
        errors24h: number
        errors1h: number
    }
    planDistribution: Array<{ label: string, value: number }>
    subscriptionStatusDistribution: Array<{ label: string, value: number }>
    needsAttention: Array<{
        severity: "high" | "medium" | "low"
        kind: string
        message: string
        tenantId?: string
        tenantName?: string
    }>
    recentErrors: SystemError[]
    recentFiscalFailures: never[]
}

export type SystemError = {
    id: string
    tenantId: string | null
    method: string | null
    path: string | null
    statusCode: number | null
    errorCode: string | null
    message: string | null
    stack: string | null
    createdAt: string
}

export type AdminUserListItem = {
    id: string
    name: string
    login: string
    role: "owner" | "admin"
    isActive: boolean
    createdAt: string
}

export type UserListItem = {
    id: string
    login: string
    tenantId: string
    tenantName: string
    tenantSlug: string
    isActive: boolean
    createdAt: string
    lastLogin: string | null
}

export type AuditEvent = {
    id: string
    adminUserId: string | null
    adminLogin: string | null
    adminName: string | null
    action: string
    targetType: string | null
    targetId: string | null
    tenantId: string | null
    metadata: Record<string, unknown> | null
    result: "success" | "failure"
    createdAt: string
}

export type HealthData = {
    api: "ok"
    masterDatabase: "ok" | "error"
    tenantDatabases: {
        total: number
        missing: number
        missingTenants: Array<{ id: string, name: string, slug: string | null }>
    }
    errors: { last1h: number, last24h: number }
    recent5xx: SystemError[]
    services: {
        backgroundJobs: string
        queues: string
        webhooks: string
        fiscal: string
    }
    timestamp: string
}

export type BillingSummary = {
    mrr: null
    activeSubscriptions: number
    planDistribution: Array<{ label: string, value: number }>
    statusDistribution: Array<{ label: string, value: number }>
    expired: Array<{ id: string, name: string, slug: string, planId: string | null, subscriptionStatusId: string | null, subscriptionExpireDate: string | null, isActive: boolean }>
    dueSoon: Array<{ id: string, name: string, slug: string, planId: string | null, subscriptionStatusId: string | null, subscriptionExpireDate: string | null, isActive: boolean }>
    withoutPlan: Array<{ id: string, name: string, slug: string, planId: string | null, subscriptionStatusId: string | null, subscriptionExpireDate: string | null, isActive: boolean }>
}

export type FiscalOverview = {
    configured: boolean
    documentsIssued: number
    authorized: number
    rejected: number
    cancelled: number
    contingency: number
    failureRate: number
    rejectionCodes: never[]
    recentErrors: never[]
}

export type FiscalDocuments = {
    configured: boolean
    documents: never[]
    pagination: Pagination
}

export type FeatureFlag = {
    id: string
    key: string
    description: string | null
    scope: "global" | "tenant"
    tenantId: string | null
    enabled: boolean
    createdAt: string
    updatedAt: string
}

export type Announcement = {
    id: string
    title: string
    body: string
    scope: "global" | "tenant"
    tenantId: string | null
    isActive: boolean
    startsAt: string | null
    endsAt: string | null
    createdByAdminId: string | null
    createdAt: string
    updatedAt: string
}

export type SearchResults = {
    tenants: Array<{ id: string, name: string, slug: string, document: string, email: string, isActive: boolean, deletedAt: string | null }>
    users: Array<{ id: string, login: string, tenantId: string, tenantName: string, tenantSlug: string, isActive: boolean }>
    admins: Array<{ id: string, name: string, login: string, role: string, isActive: boolean }>
    fiscalDocuments: never[]
}