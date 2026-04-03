import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';
import 'package:perioxia_crm/data/repositories/company_admin_repository.dart';
import 'package:perioxia_crm/features/company_admin/providers/company_admin_providers.dart';
import 'package:perioxia_crm/shared/widgets/error_banner.dart';
import 'package:perioxia_crm/shared/widgets/loading_indicator.dart';

class AdminSettingsScreen extends ConsumerStatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  ConsumerState<AdminSettingsScreen> createState() =>
      _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends ConsumerState<AdminSettingsScreen> {
  final _nameCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _gstCtrl = TextEditingController();
  bool _saving = false;
  bool _loaded = false;

  @override
  void dispose() {
    _nameCtrl.dispose();
    _addressCtrl.dispose();
    _gstCtrl.dispose();
    super.dispose();
  }

  void _populate(Map<String, dynamic> d) {
    if (_loaded) return;
    _loaded = true;
    _nameCtrl.text = d['company_name']?.toString() ?? '';
    _addressCtrl.text = d['address']?.toString() ?? '';
    _gstCtrl.text = d['gst']?.toString() ?? d['gst_number']?.toString() ?? '';
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ref.read(companyAdminRepositoryProvider).updateSettings({
        'company_name': _nameCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'gst': _gstCtrl.text.trim(),
      });
      ref.invalidate(companyAdminSettingsProvider);
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Settings saved')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(companyAdminSettingsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Company settings',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
      ),
      body: async.when(
        loading: () => const LoadingIndicator(),
        error: (e, _) => ErrorBanner(
          message: 'Failed to load settings',
          onRetry: () => ref.invalidate(companyAdminSettingsProvider),
        ),
        data: (d) {
          _populate(d);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _field('Company name', _nameCtrl),
              const SizedBox(height: 14),
              _field('Address', _addressCtrl, maxLines: 3),
              const SizedBox(height: 14),
              _field('GST number', _gstCtrl),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Save'),
                ),
              ),
              const SizedBox(height: 24),
              Text('Other settings',
                  style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMuted)),
              const SizedBox(height: 8),
              ..._settingTiles(d),
            ],
          );
        },
      ),
    );
  }

  Widget _field(String label, TextEditingController c, {int maxLines = 1}) {
    return TextField(
      controller: c,
      maxLines: maxLines,
      decoration: InputDecoration(
        labelText: label,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  List<Widget> _settingTiles(Map<String, dynamic> d) {
    final ignore = {'company_name', 'address', 'gst', 'gst_number'};
    return d.entries
        .where((e) => !ignore.contains(e.key))
        .map((e) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(e.key.replaceAll('_', ' '),
                        style: const TextStyle(fontSize: 13)),
                  ),
                  Text(e.value?.toString() ?? '—',
                      style: const TextStyle(
                          fontSize: 13, fontWeight: FontWeight.w600)),
                ],
              ),
            ))
        .toList();
  }
}
