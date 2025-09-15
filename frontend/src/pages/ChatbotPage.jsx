import React from 'react';
import ChatbotConsole from '../components/ChatbotConsole';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function ChatbotPage() {
  return (
    <div className="min-h-[75vh]">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Chatbot</h1>
      <Card className="h-full">
        <CardHeader className="sticky top-0 z-10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardTitle>Assistive Chat</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <ChatbotConsole />
          <p className="text-xs text-slate-500 mt-3">Requires GEMINI_API_KEY set on backend.</p>
        </CardContent>
      </Card>
    </div>
  );
}


