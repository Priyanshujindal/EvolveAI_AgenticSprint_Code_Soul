import React, { useState } from 'react';
import Textarea from './ui/Textarea';
import Button from './ui/Button';

export default function HitlFeedbackForm({ onSubmit }) {
  const [text, setText] = useState('');
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSubmit?.(text);
        setText('');
      }}
      className="space-y-2"
    >
      <Textarea value={text} onChange={e => setText(e.target.value)} placeholder="Share corrections or context for clinicians" />
      <Button type="submit">Submit Feedback</Button>
    </form>
  );
}


