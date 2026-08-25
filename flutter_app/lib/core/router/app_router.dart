import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/router/go_router_refresh.dart';
import 'package:perioxia_crm/core/router/route_names.dart';
import 'package:perioxia_crm/core/router/sales_home.dart';
import 'package:perioxia_crm/features/auth/presentation/login_screen.dart';
import 'package:perioxia_crm/features/auth/presentation/mfa_setup_screen.dart';
import 'package:perioxia_crm/features/auth/presentation/mfa_verify_screen.dart';
import 'package:perioxia_crm/features/auth/presentation/two_factor_settings_screen.dart';
import 'package:perioxia_crm/features/auth/presentation/forgot_password_screen.dart';
import 'package:perioxia_crm/features/auth/presentation/signup_screen.dart';
import 'package:perioxia_crm/features/auth/presentation/accept_invite_screen.dart';
import 'package:perioxia_crm/features/support/presentation/bug_report_screen.dart';
import 'package:perioxia_crm/features/leaves/presentation/leave_settings_screen.dart';
import 'package:perioxia_crm/features/settings/presentation/notification_preferences_screen.dart';
import 'package:perioxia_crm/features/finance/presentation/financial_ledgers_screen.dart';
import 'package:perioxia_crm/features/finance/presentation/ledger_detail_screen.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/shell/app_shell.dart';
import 'package:perioxia_crm/features/dashboard/presentation/dashboard_entry.dart';
import 'package:perioxia_crm/features/dashboard/presentation/sales_reports_screen.dart';
import 'package:perioxia_crm/features/leads/presentation/leads_entry.dart';
import 'package:perioxia_crm/features/leads/presentation/lead_detail_screen.dart';
import 'package:perioxia_crm/features/clients/presentation/clients_entry.dart';
import 'package:perioxia_crm/features/clients/presentation/client_detail_screen.dart';
import 'package:perioxia_crm/features/tasks/presentation/tasks_screen.dart';
import 'package:perioxia_crm/features/follow_ups/presentation/follow_ups_screen.dart';
import 'package:perioxia_crm/features/orders/presentation/orders_screen.dart';
import 'package:perioxia_crm/features/orders/presentation/manager_orders_screen.dart';
import 'package:perioxia_crm/features/orders/presentation/invoice_detail_screen.dart';
import 'package:perioxia_crm/features/notifications/presentation/notifications_screen.dart';
import 'package:perioxia_crm/features/stock/presentation/stock_screen.dart';
import 'package:perioxia_crm/features/ai_assistant/presentation/ai_assistant_screen.dart';
import 'package:perioxia_crm/features/settings/presentation/settings_screen.dart';
import 'package:perioxia_crm/features/profile/presentation/profile_screen.dart';
import 'package:perioxia_crm/features/performance/presentation/performance_entry.dart';
import 'package:perioxia_crm/features/manager/presentation/team_screen.dart';
import 'package:perioxia_crm/features/manager/presentation/team_member_detail_screen.dart';
import 'package:perioxia_crm/features/manager/presentation/manager_reports_screen.dart';
import 'package:perioxia_crm/features/more/presentation/more_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_revenue_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_teams_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_employee_lookup_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_employee_detail_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_invoices_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_points_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_reports_screen.dart';
import 'package:perioxia_crm/features/md/presentation/md_access_gate.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_users_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_user_detail_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_teams_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_team_detail_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_approvals_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_hierarchy_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_audit_log_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_settings_screen.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_gate.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_companies_screen.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_company_detail_screen.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_pending_screen.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_logs_screen.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_plans_screen.dart';
import 'package:perioxia_crm/features/crm_platform/presentation/crm_platform_session_screen.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_gate.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_sales_list_screen.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_sale_detail_screen.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_invoices_screen.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_invoice_detail_screen.dart';
import 'package:perioxia_crm/features/purchase/presentation/purchase_monitoring_screen.dart';

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  final refresh = ref.watch(goRouterRefreshProvider);
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final loc = state.matchedLocation;

      bool isAuthPublicPath(String path) {
        return path == '/login' ||
            path == '/login/2fa' ||
            path == '/login/2fa-setup' ||
            path == '/signup' ||
            path == '/forgot-password' ||
            path.startsWith('/accept-invite/');
      }

      if (auth.status == AuthStatus.initial ||
          auth.status == AuthStatus.loading) {
        return null;
      }
      if (auth.status == AuthStatus.mfaChallenge) {
        return loc == '/login/2fa' ? null : '/login/2fa';
      }
      if (auth.status == AuthStatus.mfaSetup) {
        return loc == '/login/2fa-setup' ? null : '/login/2fa-setup';
      }
      if (auth.status == AuthStatus.error) {
        return isAuthPublicPath(loc) ? null : '/login';
      }
      if (auth.status == AuthStatus.unauthenticated) {
        return isAuthPublicPath(loc) ? null : '/login';
      }
      if (auth.status == AuthStatus.authenticated) {
        if (loc == '/login' || loc == '/login/2fa' || loc == '/login/2fa-setup') {
          return homePathForUser(auth.user);
        }
        if (isAuthPublicPath(loc)) {
          return homePathForUser(auth.user);
        }
      }
      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        name: RouteNames.login,
        builder: (_, __) => const LoginScreen(),
      ),
      GoRoute(
        path: '/login/2fa',
        name: RouteNames.login2fa,
        builder: (_, __) => const MfaVerifyScreen(),
      ),
      GoRoute(
        path: '/login/2fa-setup',
        name: RouteNames.login2faSetup,
        builder: (_, __) => const MfaSetupScreen(),
      ),
      GoRoute(
        path: '/forgot-password',
        name: RouteNames.forgotPassword,
        builder: (_, __) => const ForgotPasswordScreen(),
      ),
      GoRoute(
        path: '/signup',
        name: RouteNames.signup,
        builder: (_, __) => const SignupScreen(),
      ),
      GoRoute(
        path: '/accept-invite/:token',
        name: RouteNames.acceptInvite,
        builder: (_, state) => AcceptInviteScreen(
          token: state.pathParameters['token']!,
        ),
      ),
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            name: RouteNames.dashboard,
            builder: (_, __) => const DashboardEntry(),
          ),
          GoRoute(
            path: '/admin-users',
            name: RouteNames.adminUsers,
            builder: (_, __) => const AdminUsersScreen(),
            routes: [
              GoRoute(
                path: ':userId',
                name: RouteNames.adminUserDetail,
                builder: (_, state) => AdminUserDetailScreen(
                  userId: int.parse(state.pathParameters['userId']!),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/admin-teams',
            name: RouteNames.adminTeamsRoute,
            builder: (_, __) => const AdminTeamsScreen(),
            routes: [
              GoRoute(
                path: ':teamId',
                name: RouteNames.adminTeamDetail,
                builder: (_, state) => AdminTeamDetailScreen(
                  teamId: int.parse(state.pathParameters['teamId']!),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/admin-approvals',
            name: RouteNames.adminApprovalsRoute,
            builder: (_, __) => const AdminApprovalsScreen(),
          ),
          GoRoute(
            path: '/admin-hierarchy',
            name: RouteNames.adminHierarchy,
            builder: (_, __) => const AdminHierarchyScreen(),
          ),
          GoRoute(
            path: '/admin-audit-log',
            name: RouteNames.adminAuditLog,
            builder: (_, __) => const AdminAuditLogScreen(),
          ),
          GoRoute(
            path: '/admin-settings',
            name: RouteNames.adminSettings,
            builder: (_, __) => const AdminSettingsScreen(),
          ),
          GoRoute(
            path: '/platform-companies',
            name: RouteNames.platformCompanies,
            builder: (_, __) => const CrmPlatformGate(
              child: CrmPlatformCompaniesScreen(),
            ),
            routes: [
              GoRoute(
                path: ':companyId',
                name: RouteNames.platformCompanyDetail,
                builder: (_, state) => CrmPlatformGate(
                  child: CrmPlatformCompanyDetailScreen(
                    companyId: int.parse(state.pathParameters['companyId']!),
                  ),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/platform-pending',
            name: RouteNames.platformPending,
            builder: (_, __) => const CrmPlatformGate(
              child: CrmPlatformPendingScreen(),
            ),
          ),
          GoRoute(
            path: '/platform-logs',
            name: RouteNames.platformLogs,
            builder: (_, __) => const CrmPlatformGate(
              child: CrmPlatformLogsScreen(),
            ),
          ),
          GoRoute(
            path: '/platform-plans',
            name: RouteNames.platformPlans,
            builder: (_, __) => const CrmPlatformGate(
              child: CrmPlatformPlansScreen(),
            ),
          ),
          GoRoute(
            path: '/platform-session',
            name: RouteNames.platformSession,
            builder: (_, __) => const CrmPlatformGate(
              child: CrmPlatformSessionScreen(),
            ),
          ),
          GoRoute(
            path: '/purchase-sales',
            name: RouteNames.purchaseSales,
            builder: (_, __) => const PurchaseGate(
              child: PurchaseSalesListScreen(),
            ),
            routes: [
              GoRoute(
                path: ':saleId',
                name: RouteNames.purchaseSaleDetail,
                builder: (_, state) => PurchaseGate(
                  child: PurchaseSaleDetailScreen(
                    saleId: int.parse(state.pathParameters['saleId']!),
                  ),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/purchase-invoices',
            name: RouteNames.purchaseInvoices,
            builder: (_, state) => PurchaseGate(
              child: PurchaseInvoicesScreen(
                initialStatusFilter: state.extra is String
                    ? state.extra as String
                    : null,
              ),
            ),
          ),
          GoRoute(
            path: '/purchase-invoice/:invoiceId',
            name: RouteNames.purchaseInvoiceDetail,
            builder: (_, state) => PurchaseGate(
              child: PurchaseInvoiceDetailScreen(
                invoiceId: int.parse(state.pathParameters['invoiceId']!),
              ),
            ),
          ),
          GoRoute(
            path: '/purchase-monitoring',
            name: RouteNames.purchaseMonitoring,
            builder: (_, __) => const PurchaseGate(
              child: PurchaseMonitoringScreen(),
            ),
          ),
          GoRoute(
            path: '/team',
            name: RouteNames.team,
            builder: (_, __) => const TeamScreen(),
            routes: [
              GoRoute(
                path: ':id',
                name: RouteNames.teamMember,
                builder: (_, state) => TeamMemberDetailScreen(
                  userId: int.parse(state.pathParameters['id']!),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/leads',
            name: RouteNames.leads,
            builder: (_, __) => const LeadsEntry(),
            routes: [
              GoRoute(
                path: ':id',
                name: RouteNames.leadDetail,
                builder: (_, state) => LeadDetailScreen(
                  leadId: int.parse(state.pathParameters['id']!),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/clients',
            name: RouteNames.clients,
            builder: (_, __) => const ClientsEntry(),
            routes: [
              GoRoute(
                path: ':id',
                name: RouteNames.clientDetail,
                builder: (_, state) => ClientDetailScreen(
                  clientId: int.parse(state.pathParameters['id']!),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/tasks',
            name: RouteNames.tasks,
            builder: (_, __) => const TasksScreen(),
          ),
          GoRoute(
            path: '/follow-ups',
            name: RouteNames.followUps,
            builder: (_, __) => const FollowUpsScreen(),
          ),
          GoRoute(
            path: '/orders',
            name: RouteNames.orders,
            builder: (_, __) => const OrdersScreen(),
          ),
          GoRoute(
            path: '/manager-orders',
            name: RouteNames.managerOrders,
            builder: (_, __) => const ManagerOrdersScreen(),
          ),
          GoRoute(
            path: '/invoices',
            name: RouteNames.invoicesList,
            builder: (_, __) => const OrdersScreen(
              appBarTitle: 'Invoices',
            ),
            routes: [
              GoRoute(
                path: ':id',
                name: RouteNames.invoiceDetail,
                builder: (_, state) => InvoiceDetailScreen(
                  invoiceId: int.parse(state.pathParameters['id']!),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/more',
            name: RouteNames.more,
            builder: (_, __) => const MoreScreen(),
          ),
          GoRoute(
            path: '/notifications',
            name: RouteNames.notifications,
            builder: (_, __) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/stock',
            name: RouteNames.stock,
            builder: (_, __) => const StockScreen(),
          ),
          GoRoute(
            path: '/assistant',
            name: RouteNames.aiAssistant,
            builder: (_, __) => const AiAssistantScreen(),
          ),
          GoRoute(
            path: '/settings',
            name: RouteNames.settings,
            builder: (_, __) => const SettingsScreen(),
          ),
          GoRoute(
            path: '/settings/2fa',
            name: RouteNames.settings2fa,
            builder: (_, __) => const TwoFactorSettingsScreen(),
          ),
          GoRoute(
            path: '/profile',
            name: RouteNames.profile,
            builder: (_, __) => const ProfileScreen(),
          ),
          GoRoute(
            path: '/performance',
            name: RouteNames.performance,
            builder: (_, __) => const PerformanceEntry(),
          ),
          GoRoute(
            path: '/sales-reports',
            name: RouteNames.salesReports,
            builder: (_, __) => const SalesReportsScreen(),
          ),
          GoRoute(
            path: '/report-bug',
            name: RouteNames.bugReport,
            builder: (_, __) => const BugReportScreen(),
          ),
          GoRoute(
            path: '/settings/leave',
            name: RouteNames.leaveSettings,
            builder: (_, __) => const LeaveSettingsScreen(),
          ),
          GoRoute(
            path: '/settings/notification-preferences',
            name: RouteNames.notificationPreferences,
            builder: (_, __) => const NotificationPreferencesScreen(),
          ),
          GoRoute(
            path: '/finance-ledgers',
            name: RouteNames.financeLedgers,
            builder: (_, __) => const FinancialLedgersScreen(),
            routes: [
              GoRoute(
                path: ':slug',
                name: RouteNames.ledgerDetail,
                builder: (_, state) => LedgerDetailScreen(
                  slug: state.pathParameters['slug']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/platform-requests',
            name: RouteNames.platformRequests,
            redirect: (_, __) => '/platform-pending',
          ),
          GoRoute(
            path: '/revenue',
            name: RouteNames.revenue,
            builder: (_, __) => const MdGate(child: MdRevenueScreen()),
          ),
          GoRoute(
            path: '/teams',
            name: RouteNames.mdTeams,
            builder: (_, __) => const MdGate(child: MdTeamsScreen()),
          ),
          GoRoute(
            path: '/employee-lookup',
            name: RouteNames.employeeLookup,
            builder: (_, __) => const MdGate(child: MdEmployeeLookupScreen()),
            routes: [
              GoRoute(
                path: ':id',
                name: RouteNames.employeeDetail,
                builder: (_, state) => MdGate(
                  child: MdEmployeeDetailScreen(
                    userId: int.parse(state.pathParameters['id']!),
                  ),
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/md-invoices',
            name: RouteNames.mdInvoices,
            builder: (_, __) => const MdGate(child: MdInvoicesScreen()),
          ),
          GoRoute(
            path: '/md-points',
            name: RouteNames.mdPoints,
            builder: (_, __) => const MdGate(child: MdPointsScreen()),
          ),
          GoRoute(
            path: '/md-reports',
            name: RouteNames.mdReports,
            builder: (_, __) => const MdGate(child: MdReportsScreen()),
          ),
          GoRoute(
            path: '/reports',
            name: RouteNames.managerReports,
            builder: (_, __) => const ManagerReportsScreen(),
          ),
        ],
      ),
    ],
  );
});
