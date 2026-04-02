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

  // Tasks
  static const String tasks = '/api/tasks';
  static const String tasksList = '/api/tasks/list';
  static String taskById(int id) => '/api/tasks/$id';
  static String completeTask(int id) => '/api/tasks/$id/complete';

  // Clients
  static const String clients = '/api/clients';
  static String clientById(int id) => '/api/clients/$id';

  // Follow-ups
  static const String followUps = '/api/follow-ups';

  // Notifications
  static const String notifications = '/api/notifications';
  static String markRead(int id) => '/api/notifications/$id/read';
  static const String markAllRead = '/api/notifications/read-all';
  static const String notificationPreferences =
      '/api/notifications/preferences';

  // Teams
  static const String teams = '/api/teams';

  // Manager
  static const String managerDashboard = '/api/manager/dashboard';
  static const String managerLeads = '/api/manager/leads';
  static const String managerTasks = '/api/manager/tasks';
  static const String managerTeam = '/api/manager/team';

  // MD (Managing Director)
  static const String mdDashboard = '/api/md/dashboard';
  static const String mdSales = '/api/md/sales';
  static const String mdRevenue = '/api/md/revenue';
  static const String mdTeams = '/api/md/teams';
  static const String mdMonitoring = '/api/md/monitoring';

  // Purchase
  static const String purchaseDashboard = '/api/purchase/dashboard';
  static const String purchaseSales = '/api/purchase/sales';
  static const String purchaseStock = '/api/purchase/stock';

  // Invoices
  static const String invoices = '/api/invoices';
  static String invoiceById(int id) => '/api/invoices/$id';

  // Inventory
  static const String inventory = '/api/inventory';

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

  // Bug report
  static const String bugReport = '/api/bug-report';

  // Timeline
  static const String timeline = '/api/timeline';

  // Users (admin)
  static const String users = '/api/users';
  static const String adminDashboard = '/api/admin/dashboard';
  static const String adminApprovals = '/api/admin/approvals';
  static const String adminAudit = '/api/admin/audit';
}
