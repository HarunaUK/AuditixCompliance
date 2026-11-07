import ReactMarkdown from "react-markdown";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose-auditix">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
