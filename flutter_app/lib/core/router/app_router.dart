import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/router/go_router_refresh.dart';
import 'package:perioxia_crm/core/router/route_names.dart';
import 'package:perioxia_crm/features/auth/presentation/login_screen.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/shell/app_shell.dart';
import 'package:perioxia_crm/features/dashboard/presentation/dashboard_entry.dart';
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
import 'package:perioxia_crm/features/md/presentation/md_access_gate.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_users_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_user_detail_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_teams_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_team_detail_screen.dart';
import 'package:perioxia_crm/features/company_admin/presentation/admin_approvals_screen.dart';
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

      if (auth.status == AuthStatus.initial ||
          auth.status == AuthStatus.loading) {
        return null;
      }
      if (auth.status == AuthStatus.error) {
        return loc == '/login' ? null : '/login';
      }
      if (auth.status == AuthStatus.unauthenticated) {
        return loc == '/login' ? null : '/login';
      }
      if (auth.status == AuthStatus.authenticated) {
        if (loc == '/login') {
          return auth.user?.isPlatformAdmin == true
              ? '/platform-pending'
              : '/dashboard';
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
            builder: (_, __) => const PurchaseGate(
              child: PurchaseInvoicesScreen(),
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
            path: '/invoices/:id',
            name: RouteNames.invoiceDetail,
            builder: (_, state) => InvoiceDetailScreen(
              invoiceId: int.parse(state.pathParameters['id']!),
            ),
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
            path: '/reports',
            name: RouteNames.managerReports,
            builder: (_, __) => const ManagerReportsScreen(),
          ),
        ],
      ),
    ],
  );
});
