class Invoice {
  final int id;
  final String? invoiceNumber;
  final String status;
  final double? totalAmount;
  final int? clientId;
  final String? clientName;
  final DateTime? createdAt;
  final DateTime? dueDate;

  const Invoice({
    required this.id,
    this.invoiceNumber,
    required this.status,
    this.totalAmount,
    this.clientId,
    this.clientName,
    this.createdAt,
    this.dueDate,
  });

  factory Invoice.fromJson(Map<String, dynamic> json) => Invoice(
        id: json['id'] as int,
        invoiceNumber: json['invoice_number'] as String?,
        status: json['status']?.toString() ?? 'Draft',
        totalAmount: (json['total_amount'] as num?)?.toDouble(),
        clientId: json['client_id'] as int?,
        clientName: json['client_name'] as String?,
        createdAt: json['created_at'] != null
            ? DateTime.tryParse(json['created_at'])
            : null,
        dueDate: json['due_date'] != null
            ? DateTime.tryParse(json['due_date'])
            : null,
      );
}
