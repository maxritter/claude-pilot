import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface SpecContentProps {
  content: string;
}

export function SpecContent({ content }: SpecContentProps) {
  return (
    <div className="spec-markdown">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h3: ({ children }) => {
            const text = String(children ?? "");
            const taskMatch = text.match(/Task\s+(\d+)/);
            const id = taskMatch ? `task-${taskMatch[1]}` : undefined;
            return (
              <h3
                id={id}
                className="text-lg font-semibold mt-6 mb-3 pb-2 border-b border-base-300/50 first:mt-0 scroll-mt-4"
              >
                {children}
              </h3>
            );
          },
          h4: ({ children }) => (
            <h4 className="text-base font-medium mt-4 mb-2 text-base-content/90">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-sm text-base-content/80 mb-3 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="text-sm space-y-1.5 mb-4 ml-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="text-sm space-y-1.5 mb-4 ml-1 list-decimal list-inside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-base-content/80 flex items-start gap-2">
              <span className="text-primary mt-0.5 text-xs select-none">▸</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-base-300 text-primary px-1.5 py-0.5 rounded text-xs font-mono">
                  {children}
                </code>
              );
            }
            return (
              <code className="block bg-base-300 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-4 border border-base-content/10">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="bg-base-300 p-3 rounded-lg text-xs font-mono overflow-x-auto mb-4 border border-base-content/10">
              {children}
            </pre>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-base-content">
              {children}
            </strong>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="table table-sm w-full">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-base-200">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left text-xs font-medium text-base-content/70 p-2">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="text-sm p-2 border-t border-base-300/50">
              {children}
            </td>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary/50 pl-4 py-1 my-3 text-sm text-base-content/70 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-6 border-base-300" />,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
