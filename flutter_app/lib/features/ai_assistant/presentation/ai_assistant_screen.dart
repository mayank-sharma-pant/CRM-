import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AiAssistantScreen extends ConsumerWidget {
  const AiAssistantScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('AI Assistant')),
      body: const Center(child: Text('AI Assistant — TODO')),
    );
  }
}
