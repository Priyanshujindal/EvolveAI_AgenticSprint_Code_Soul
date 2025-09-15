import React from 'react';
import ChatbotConsole from '../components/ChatbotConsole';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function ChatbotPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Chatbot</h1>
      <Card>
        <CardHeader>
          <CardTitle>Assistive Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ChatbotConsole />
          <p className="text-xs text-slate-500 mt-3">Requires GEMINI_API_KEY set on backend.</p>
        </CardContent>
      </Card>
    </div>
  );
}


