import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:perioxia_crm/core/constants/api_endpoints.dart';
import 'package:perioxia_crm/core/network/api_client.dart';
import 'package:perioxia_crm/core/network/api_exception.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';

/// POST `/api/bug-report` — message + category (optional attachments can be added later).
class BugReportScreen extends ConsumerStatefulWidget {
  const BugReportScreen({super.key});

  @override
  ConsumerState<BugReportScreen> createState() => _BugReportScreenState();
}

class _BugReportScreenState extends ConsumerState<BugReportScreen> {
  final _messageCtrl = TextEditingController();
  String _category = 'Bug';
  bool _sending = false;
  String? _error;
  String? _success;

  static const _categories = ['Bug', 'Feature', 'UI', 'Performance', 'Other'];

  @override
  void dispose() {
    _messageCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final msg = _messageCtrl.text.trim();
    if (msg.length < 10) {
      setState(() => _error = 'Please enter at least 10 characters.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _success = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final form = FormData.fromMap({
        'message': msg,
        'category': _category,
      });
      await api.post(ApiEndpoints.bugReport, data: form);
      if (!mounted) return;
      setState(() {
        _success = 'Report sent. Thank you!';
        _messageCtrl.clear();
      });
    } on DioException catch (e) {
      setState(() => _error = ApiException.fromDioError(e).message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        title: const Text('Report an issue'),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Describe what went wrong or what you need. Reports are emailed to the product team.',
            style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 16),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!,
                  style: const TextStyle(color: AppColors.error, fontSize: 13)),
            ),
          if (_success != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_success!,
                  style: const TextStyle(color: AppColors.success, fontSize: 13)),
            ),
          DropdownButtonFormField<String>(
            value: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            items: _categories
                .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                .toList(),
            onChanged: (v) => setState(() => _category = v ?? 'Bug'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _messageCtrl,
            minLines: 6,
            maxLines: 12,
            decoration: const InputDecoration(
              labelText: 'Details',
              alignLabelWithHint: true,
              hintText: 'Steps to reproduce, expected vs actual…',
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _sending ? null : _submit,
            child: _sending
                ? const SizedBox(
                    width: 22,
                    height: 22,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Text('Submit report'),
          ),
        ],
      ),
    );
  }
}
