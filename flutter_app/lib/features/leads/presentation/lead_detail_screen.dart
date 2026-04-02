import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class LeadDetailScreen extends ConsumerWidget {
  final int leadId;

  const LeadDetailScreen({super.key, required this.leadId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text('Lead #$leadId')),
      body: const Center(child: Text('Lead detail — TODO')),
    );
  }
}
