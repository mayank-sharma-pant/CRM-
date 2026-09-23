'use client';

import AICompanyAssistant from '../../../components/AICompanyAssistant';

export default function MDAssistantPage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-page pb-8">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="page-subtitle">Company-wide questions for the director desk</p>
        </div>
      </div>
      <div className="page-body">
        <AICompanyAssistant title="MD AI Assistant" />
      </div>
    </div>
  );
}
