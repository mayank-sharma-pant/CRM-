import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ClientDetailScreen extends ConsumerWidget {
  final int clientId;

  const ClientDetailScreen({super.key, required this.clientId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: Text('Client #$clientId')),
      body: const Center(child: Text('Client detail — TODO')),
    );
  }
}
