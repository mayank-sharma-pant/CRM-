import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class InvoicesScreen extends ConsumerWidget {
  const InvoicesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Invoices')),
      body: const Center(child: Text('Invoices — TODO')),
    );
  }
}
