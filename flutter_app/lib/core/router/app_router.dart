import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/router/route_names.dart';
import 'package:perioxia_crm/features/auth/presentation/login_screen.dart';
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

final _rootNavigatorKey = GlobalKey<NavigatorState>();
final _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/login',
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
