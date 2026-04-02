import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/router/route_names.dart';
import 'package:perioxia_crm/features/auth/presentation/login_screen.dart';
import 'package:perioxia_crm/features/shell/app_shell.dart';
import 'package:perioxia_crm/features/dashboard/presentation/dashboard_screen.dart';
import 'package:perioxia_crm/features/leads/presentation/leads_list_screen.dart';
import 'package:perioxia_crm/features/leads/presentation/lead_detail_screen.dart';
import 'package:perioxia_crm/features/clients/presentation/clients_list_screen.dart';
import 'package:perioxia_crm/features/clients/presentation/client_detail_screen.dart';
import 'package:perioxia_crm/features/tasks/presentation/tasks_screen.dart';
import 'package:perioxia_crm/features/notifications/presentation/notifications_screen.dart';
import 'package:perioxia_crm/features/stock/presentation/stock_screen.dart';
import 'package:perioxia_crm/features/invoices/presentation/invoices_screen.dart';
import 'package:perioxia_crm/features/ai_assistant/presentation/ai_assistant_screen.dart';
import 'package:perioxia_crm/features/settings/presentation/settings_screen.dart';
import 'package:perioxia_crm/features/profile/presentation/profile_screen.dart';

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
            builder: (_, __) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/leads',
            name: RouteNames.leads,
            builder: (_, __) => const LeadsListScreen(),
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
            builder: (_, __) => const ClientsListScreen(),
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
            path: '/invoices',
            name: RouteNames.invoices,
            builder: (_, __) => const InvoicesScreen(),
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
        ],
      ),
    ],
  );
});
