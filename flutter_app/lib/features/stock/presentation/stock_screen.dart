import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class StockScreen extends ConsumerWidget {
  const StockScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Stock')),
      body: const Center(child: Text('Stock / Inventory — TODO')),
    );
  }
}
