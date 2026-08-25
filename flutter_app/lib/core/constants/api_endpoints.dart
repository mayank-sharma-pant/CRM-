/// All backend API endpoints mirrored from FastAPI main.py
class ApiEndpoints {
  ApiEndpoints._();

  // Auth
  static const String login = '/api/auth/login';
  static const String signup = '/api/auth/signup';
  static const String logout = '/api/auth/logout';
  static const String me = '/api/auth/me';
  static const String requestOtp = '/api/auth/request-otp';
  static const String loginOtp = '/api/auth/login-otp';
  static const String changePassword = '/api/auth/change-password';
  static const String forgotPassword = '/api/auth/forgot-password';
  static const String resetPassword = '/api/auth/reset-password';
  static String acceptInvite(String token) => '/api/auth/accept-invite/$token';
  static const String twoFactorSetup = '/api/auth/2fa/setup';
  static const String twoFactorConfirm = '/api/auth/2fa/confirm';
  static const String twoFactorStatus = '/api/auth/2fa/status';
  static const String twoFactorDisable = '/api/auth/2fa/disable';
  static const String twoFactorVerify = '/api/auth/2fa/verify';

  // Leads
  static const String leads = '/api/leads';
  static String leadById(int id) => '/api/leads/$id';
  static const String leadsDashboard = '/api/leads/dashboard';
  static String leadStatus(int id) => '/api/leads/$id/status';
  static String leadConvert(int id) => '/api/leads/$id/convert';
  static String leadNotes(int id) => '/api/leads/$id/notes';

  // Tasks
  static const String tasks = '/api/tasks';
  static const String tasksList = '/api/tasks/list';
  static String taskById(int id) => '/api/tasks/$id';
  static String completeTask(int id) => '/api/tasks/$id/complete';

  // Clients
  static const String clients = '/api/clients';
  static String clientById(int id) => '/api/clients/$id';
  static String clientNotes(int id) => '/api/clients/$id/notes';

  // Follow-ups
  static const String followUps = '/api/follow-ups';
  static const String followUpsToday = '/api/follow-ups/today';
  static const String followUpsOverdue = '/api/follow-ups/overdue';
  static String followUpById(int id) => '/api/follow-ups/$id';
  static String followUpComplete(int id) => '/api/follow-ups/$id/complete';
  static String followUpReschedule(int id) => '/api/follow-ups/$id/reschedule';

  // Notifications
  static const String notifications = '/api/notifications';
  static String markRead(int id) => '/api/notifications/$id/read';
  static const String markAllRead = '/api/notifications/read-all';
  static const String notificationPreferences =
      '/api/notifications/preferences';

  // Timeline
  static String leadTimeline(int id) => '/api/timeline/lead/$id';

  // Teams
  static const String teams = '/api/teams';
  static const String myTeam = '/api/teams/mine';

  // Users
  static const String users = '/api/users';

  // Manager (requires manager/md/admin + X-Team-Id for most routes)
  static const String managerDashboard = '/api/manager/dashboard';
  static const String managerLeads = '/api/manager/leads';
  static String managerLeadReassign(int leadId) =>
      '/api/manager/leads/$leadId/reassign';
  static const String managerTasks = '/api/manager/tasks';
  static const String managerTeam = '/api/manager/team';
  static String managerTeamPerformance(int userId) =>
      '/api/manager/team/$userId/performance';
  static const String managerMonitoring = '/api/manager/monitoring';
  static String managerMonitoringUser(int userId) =>
      '/api/manager/monitoring/$userId';
  static const String managerReportsPerformance =
      '/api/manager/reports/performance';
  static const String managerInvoices = '/api/manager/invoices';
  static const String managerTeams = '/api/manager/teams';
  static const String managerTransferRequest = '/api/manager/transfer-request';
  static String managerRemoveMember(int teamId, int userId) =>
      '/api/manager/teams/$teamId/members/$userId';

  // MD (Managing Director) — requires md or admin
  static const String mdDashboard = '/api/md/dashboard';
  static const String mdSales = '/api/md/sales';
  static const String mdRevenue = '/api/md/revenue';
  static const String mdTeams = '/api/md/teams';
  static const String mdMonitoring = '/api/md/monitoring';
  static const String mdLeads = '/api/md/leads';
  static const String mdClients = '/api/md/clients';
  static const String mdEmployeeLookup = '/api/md/employee-lookup';
  static String mdEmployeeDetail(int userId) =>
      '/api/md/employee-lookup/$userId';
  static const String mdInvoices = '/api/md/invoices';
  static const String mdPoints = '/api/md/points';
  static const String mdPerformanceMonthly = '/api/md/performance/monthly';
  static const String mdTransferRequest = '/api/md/transfer-request';

  // Purchase (`purchase`, `md`, `admin` per backend)
  static const String purchaseDashboard = '/api/purchase/dashboard';
  static const String purchaseSales = '/api/purchase/sales';
  static String purchaseSale(int id) => '/api/purchase/sales/$id';
  static String purchaseSaleApprove(int id) => '/api/purchase/sales/$id/approve';
  static String purchaseSaleReject(int id) => '/api/purchase/sales/$id/reject';
  static const String purchaseInvoices = '/api/purchase/invoices';
  static String purchaseInvoice(int id) => '/api/purchase/invoices/$id';
  static String purchaseInvoiceSend(int id) => '/api/purchase/invoices/$id/send';
  static String purchaseInvoiceMarkPaid(int id) =>
      '/api/purchase/invoices/$id/mark-paid';
  static String purchaseInvoiceReminder(int id) =>
      '/api/purchase/invoices/$id/send-reminder';
  static const String purchaseMonitoring = '/api/purchase/monitoring';

  // Invoices / Orders
  static const String invoices = '/api/invoices';
  static String invoiceById(int id) => '/api/invoices/$id';

  // Inventory
  static const String inventory = '/api/inventory';
  static String inventoryAdjust(int id) => '/api/inventory/$id/adjust';

  // AI Assistant
  static const String aiAssistant = '/api/ai/company-assistant';
  static const String aiParams = '/api/ai/company-assistant/params';

  // Leaves
  static const String leaves = '/api/leaves';

  // Search
  static const String search = '/api/search';

  // Ledgers
  static const String ledgers = '/api/ledgers';
  static String ledgerBySlug(String slug) => '/api/ledgers/$slug';
  static String ledgerEntry(String slug, int entryId) =>
      '/api/ledgers/$slug/$entryId';

  // Documents
  static const String documents = '/api/documents';

  // Bug report (multipart POST: message, category, optional files[])
  static const String bugReport = '/api/bug-report';

  // Leaves (HR)
  static String leaveApprove(int id) => '/api/leaves/$id/approve';

  // Company / platform admin (`role == admin`, `/api/admin/*`)
  static const String adminDashboardStats = '/api/admin/dashboard/stats';
  static const String adminUsers = '/api/admin/users';
  static String adminUser(int id) => '/api/admin/users/$id';
  static String adminUserActivate(int id) => '/api/admin/users/$id/activate';
  static String adminUserDisable(int id) => '/api/admin/users/$id/disable';
  static String adminUserDelete(int id) => '/api/admin/users/$id';
  static const String adminTeams = '/api/admin/teams';
  static String adminTeam(int id) => '/api/admin/teams/$id';
  static String adminTeamMembers(int teamId) => '/api/admin/teams/$teamId/members';
  static String adminTeamMember(int teamId, int userId) =>
      '/api/admin/teams/$teamId/members/$userId';
  static const String adminApprovals = '/api/admin/approvals';
  static String adminApprove(int userId) =>
      '/api/admin/approvals/$userId/approve';
  static String adminReject(int userId) =>
      '/api/admin/approvals/$userId/reject';
  static const String adminHierarchy = '/api/admin/hierarchy';
  static const String adminAuditLog = '/api/admin/audit-log';
  static const String adminSettings = '/api/admin/settings';
  static const String adminInvites = '/api/admin/invites';
  static const String adminTransferRequests = '/api/admin/transfer-requests';
  static String adminTransferApprove(int id) =>
      '/api/admin/transfer-requests/$id/approve';
  static String adminTransferReject(int id) =>
      '/api/admin/transfer-requests/$id/reject';

  /// Legacy alias — prefer [adminDashboardStats].
  static const String adminDashboard = adminDashboardStats;
  static const String adminAudit = adminAuditLog;

  // CRM platform operator (`/api/platform/*`, Bearer token from platform auth)
  static const String platformAuthLogin = '/api/platform/auth/login';
  static const String platformAuthMe = '/api/platform/auth/me';
  static const String platformMetricsDashboard = '/api/platform/metrics/dashboard';
  static const String platformCompanies = '/api/platform/companies';
  static const String platformCompaniesPending = '/api/platform/companies/pending';
  static String platformCompany(int id) => '/api/platform/companies/$id';
  static String platformCompanyApprove(int id) =>
      '/api/platform/companies/$id/approve';
  static String platformCompanyReject(int id) =>
      '/api/platform/companies/$id/reject';
  static String platformCompanyStatus(int id) =>
      '/api/platform/companies/$id/status';
  static const String platformPlans = '/api/platform/plans';
  static const String platformLogs = '/api/platform/logs';
}
