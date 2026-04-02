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

  // Purchase
  static const String purchaseDashboard = '/api/purchase/dashboard';
  static const String purchaseSales = '/api/purchase/sales';
  static const String purchaseStock = '/api/purchase/stock';

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

  // Documents
  static const String documents = '/api/documents';

  // Bug report
  static const String bugReport = '/api/bug-report';

  // Admin
  static const String adminDashboard = '/api/admin/dashboard';
  static const String adminApprovals = '/api/admin/approvals';
  static const String adminAudit = '/api/admin/audit';
}
