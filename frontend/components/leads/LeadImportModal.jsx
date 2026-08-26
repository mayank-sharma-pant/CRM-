'use client';

import CsvImportModal from '../shared/CsvImportModal';

export default function LeadImportModal(props) {
  return <CsvImportModal entity="leads" {...props} />;
}
