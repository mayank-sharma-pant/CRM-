import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ClientsListScreen extends ConsumerWidget {
  const ClientsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Clients')),
      body: const Center(child: Text('Clients list — TODO')),
    );
  }
}
