import 'package:flutter/material.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String label;
  final Color? color;

  const StatusBadge({super.key, required this.label, this.color});

  Color get _color {
    if (color != null) return color!;
    switch (label.toLowerCase()) {
      case 'new':
        return AppColors.info;
      case 'active':
      case 'contacted':
        return AppColors.primary;
      case 'converted':
      case 'completed':
      case 'approved':
        return AppColors.success;
      case 'lost':
      case 'rejected':
        return AppColors.error;
      case 'pending':
        return AppColors.warning;
      default:
        return AppColors.textMuted;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: _color,
          fontSize: 11,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}
