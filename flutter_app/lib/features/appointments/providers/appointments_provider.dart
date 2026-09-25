import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:perioxia_crm/data/models/meeting_item.dart';
import 'package:perioxia_crm/data/repositories/meeting_repository.dart';

/// Null means no bucket filter (all meetings in scope).
final appointmentBucketProvider = StateProvider<String?>((ref) => 'today');

final appointmentsProvider =
    FutureProvider.autoDispose<List<MeetingItem>>((ref) async {
  final bucket = ref.watch(appointmentBucketProvider);
  return ref.read(meetingRepositoryProvider).list(bucket: bucket);
});
