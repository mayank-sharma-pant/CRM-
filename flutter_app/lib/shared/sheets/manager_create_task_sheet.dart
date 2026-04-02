import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/manager_repository.dart';

class ManagerCreateTaskSheet extends ConsumerStatefulWidget {
  final VoidCallback? onCreated;

  const ManagerCreateTaskSheet({super.key, this.onCreated});

  @override
  ConsumerState<ManagerCreateTaskSheet> createState() =>
      _ManagerCreateTaskSheetState();
}

class _ManagerCreateTaskSheetState extends ConsumerState<ManagerCreateTaskSheet> {
  final _titleCtrl = TextEditingController();
  String _priority = 'medium';
  DateTime _due = DateTime.now().add(const Duration(days: 1));
  int? _assigneeId;
  List<Map<String, dynamic>> _roster = [];
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRoster();
  }

  Future<void> _loadRoster() async {
    try {
      final t = await ref.read(managerRepositoryProvider).getTeam();
      if (mounted) {
        setState(() {
          _roster = List<Map<String, dynamic>>.from(t['team'] ?? []);
          _loading = false;
          if (_roster.isNotEmpty) {
            _assigneeId = _roster.first['id'] as int?;
          }
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_titleCtrl.text.trim().isEmpty || _assigneeId == null) {
      setState(() => _error = 'Title and assignee required');
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(managerRepositoryProvider).createTeamTask(
            title: _titleCtrl.text.trim(),
            assigneeId: _assigneeId!,
            dueDateYyyyMmDd: DateFormat('yyyy-MM-dd').format(_due),
            priority: _priority,
          );
      widget.onCreated?.call();
      if (mounted) Navigator.pop(context);
    } on DioException catch (e) {
      setState(() => _error = ApiException.fromDioError(e).message);
    } catch (e) {
      setState(() => _error = 'Failed to create task');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
      child: _loading
          ? const SizedBox(
              height: 120,
              child: Center(child: CircularProgressIndicator()))
          : Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Assign team task',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700)),
                    IconButton(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.close)),
                  ],
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Text(_error!,
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.error)),
                  ),
                TextField(
                  controller: _titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Title *',
                    prefixIcon: Icon(Icons.task_alt, size: 20),
                  ),
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  value: _assigneeId,
                  decoration: const InputDecoration(
                    labelText: 'Assign to *',
                    prefixIcon: Icon(Icons.person_outline, size: 20),
                  ),
                  items: _roster
                      .map((m) => DropdownMenuItem(
                            value: m['id'] as int,
                            child: Text(m['full_name']?.toString() ?? ''),
                          ))
                      .toList(),
                  onChanged: (v) => setState(() => _assigneeId = v),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _priority,
                        decoration: const InputDecoration(
                            labelText: 'Priority'),
                        items: const [
                          DropdownMenuItem(value: 'low', child: Text('Low')),
                          DropdownMenuItem(
                              value: 'medium', child: Text('Medium')),
                          DropdownMenuItem(value: 'high', child: Text('High')),
                        ],
                        onChanged: (v) =>
                            setState(() => _priority = v ?? 'medium'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final d = await showDatePicker(
                            context: context,
                            initialDate: _due,
                            firstDate: DateTime.now(),
                            lastDate:
                                DateTime.now().add(const Duration(days: 365)),
                          );
                          if (d != null) setState(() => _due = d);
                        },
                        icon: const Icon(Icons.calendar_today, size: 16),
                        label: Text(DateFormat('MMM d, y').format(_due)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: FilledButton(
                    onPressed: _submitting ? null : _submit,
                    child: _submitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white))
                        : const Text('Create & notify'),
                  ),
                ),
              ],
            ),
    );
  }
}
