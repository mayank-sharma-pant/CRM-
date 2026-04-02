import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/models/task.dart';
import 'package:perioxia_crm/features/auth/providers/auth_provider.dart';
import 'package:perioxia_crm/features/tasks/providers/tasks_provider.dart';
import 'package:perioxia_crm/shared/sheets/create_task_sheet.dart';
import 'package:perioxia_crm/shared/sheets/manager_create_task_sheet.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/empty_state.dart';
import 'package:timeago/timeago.dart' as timeago;

class TasksScreen extends ConsumerStatefulWidget {
  const TasksScreen({super.key});

  @override
  ConsumerState<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends ConsumerState<TasksScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;

  static const _tabs = ['Overdue', 'Today', 'Upcoming', 'Completed'];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _tabCtrl.addListener(() {
      if (!_tabCtrl.indexIsChanging) setState(() {});
    });
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  List<Task> _filterTasks(List<Task> all) {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final todayEnd = todayStart.add(const Duration(days: 1));

    switch (_tabCtrl.index) {
      case 0: // Overdue
        return all
            .where((t) =>
                !t.isCompleted &&
                t.dueDate != null &&
                t.dueDate!.isBefore(todayStart))
            .toList();
      case 1: // Today
        return all
            .where((t) =>
                !t.isCompleted &&
                t.dueDate != null &&
                (t.dueDate!.isAfter(todayStart.subtract(const Duration(seconds: 1))) &&
                    t.dueDate!.isBefore(todayEnd)))
            .toList();
      case 2: // Upcoming
        return all
            .where((t) =>
                !t.isCompleted &&
                (t.dueDate == null || t.dueDate!.isAfter(todayEnd.subtract(const Duration(seconds: 1)))))
            .toList();
      case 3: // Completed
        return all.where((t) => t.isCompleted).toList();
      default:
        return all;
    }
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(tasksProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
        bottom: TabBar(
          controller: _tabCtrl,
          labelStyle:
              const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
          tabs: _tabs.map((t) => Tab(text: t)).toList(),
          indicatorSize: TabBarIndicatorSize.label,
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {
          final isMgr = ref.read(authProvider).user?.isManager ?? false;
          showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
            builder: (_) => isMgr
                ? ManagerCreateTaskSheet(
                    onCreated: () => ref.invalidate(tasksProvider),
                  )
                : CreateTaskSheet(
                    onCreated: () => ref.invalidate(tasksProvider),
                  ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Add Task'),
      ),
      body: tasksAsync.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load tasks',
          onRetry: () => ref.invalidate(tasksProvider),
        ),
        data: (allTasks) {
          final tasks = _filterTasks(allTasks);

          if (tasks.isEmpty) {
            return EmptyState(
              icon: Icons.task_alt,
              title: 'No ${_tabs[_tabCtrl.index].toLowerCase()} tasks',
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(tasksProvider),
            child: ListView.separated(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 80),
              itemCount: tasks.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (_, i) => _TaskCard(
                task: tasks[i],
                onToggle: () => _toggleTask(tasks[i]),
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _toggleTask(Task task) async {
    final api = ref.read(apiClientProvider);
    if (task.isCompleted) {
      await api.put(ApiEndpoints.taskById(task.id),
          data: {'status': 'Pending'});
    } else {
      await api.post(ApiEndpoints.completeTask(task.id));
    }
    ref.invalidate(tasksProvider);
  }
}

class _TaskCard extends StatelessWidget {
  final Task task;
  final VoidCallback onToggle;

  const _TaskCard({required this.task, required this.onToggle});

  Color get _priorityColor {
    switch (task.priority.toLowerCase()) {
      case 'high':
        return AppColors.error;
      case 'medium':
        return AppColors.warning;
      default:
        return AppColors.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: task.isOverdue
              ? AppColors.error.withOpacity(0.3)
              : Theme.of(context).dividerColor.withOpacity(0.12),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          GestureDetector(
            onTap: onToggle,
            child: Container(
              width: 22,
              height: 22,
              margin: const EdgeInsets.only(top: 1),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: task.isCompleted ? AppColors.success : Colors.transparent,
                border: Border.all(
                  color: task.isCompleted ? AppColors.success : AppColors.textMuted,
                  width: 2,
                ),
              ),
              child: task.isCompleted
                  ? const Icon(Icons.check, size: 14, color: Colors.white)
                  : null,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    decoration:
                        task.isCompleted ? TextDecoration.lineThrough : null,
                    color: task.isCompleted ? AppColors.textMuted : null,
                  ),
                ),
                if (task.description != null &&
                    task.description!.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(task.description!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                          fontSize: 12, color: AppColors.textSecondary)),
                ],
                const SizedBox(height: 6),
                Wrap(
                  spacing: 8,
                  runSpacing: 4,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: _priorityColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(task.priority,
                          style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w700,
                              color: _priorityColor)),
                    ),
                    if (task.dueDate != null)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.schedule,
                              size: 12, color: AppColors.textMuted),
                          const SizedBox(width: 3),
                          Text(
                            timeago.format(task.dueDate!,
                                allowFromNow: true),
                            style: TextStyle(
                              fontSize: 11,
                              color: task.isOverdue
                                  ? AppColors.error
                                  : AppColors.textMuted,
                              fontWeight: task.isOverdue
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                            ),
                          ),
                        ],
                      ),
                    if (task.isManagerAssigned)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.assignment_ind,
                              size: 12, color: AppColors.accent),
                          const SizedBox(width: 3),
                          Text(task.assignedToName ?? 'Manager',
                              style: TextStyle(
                                  fontSize: 11, color: AppColors.accent)),
                        ],
                      ),
                    if (task.leadId != null)
                      GestureDetector(
                        onTap: () => context.push('/leads/${task.leadId}'),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.person_outline,
                                size: 12, color: AppColors.primary),
                            const SizedBox(width: 3),
                            Text('Lead',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.primary,
                                    decoration: TextDecoration.underline)),
                          ],
                        ),
                      ),
                    if (task.clientId != null)
                      GestureDetector(
                        onTap: () => context.push('/clients/${task.clientId}'),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.business_outlined,
                                size: 12, color: AppColors.success),
                            const SizedBox(width: 3),
                            Text('Client',
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.success,
                                    decoration: TextDecoration.underline)),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
