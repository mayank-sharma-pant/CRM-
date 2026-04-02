class AppConstants {
  AppConstants._();

  static const String appName = 'Perioxia CRM';
  static const String appVersion = '1.0.0';

  /// Default API base URL — override with env or flavor config.
  static const String defaultBaseUrl = 'https://crm.perioxia.com';

  /// Notification polling interval.
  static const Duration notificationPollInterval = Duration(seconds: 30);

  /// Token storage key.
  static const String tokenStorageKey = 'access_token';
  static const String activeTeamKey = 'active_team_id';

  /// Pagination defaults.
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
}
