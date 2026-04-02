import 'package:flutter/material.dart';
import 'package:perioxia_crm/core/theme/app_colors.dart';

class LoadingIndicator extends StatelessWidget {
  final double size;

  const LoadingIndicator({super.key, this.size = 28});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: size,
        height: size,
        child: const CircularProgressIndicator(
          strokeWidth: 2.5,
          color: AppColors.primary,
        ),
      ),
    );
  }
}
