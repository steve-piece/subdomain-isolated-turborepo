// packages/ui/src/components/emails/base-email.tsx
import React from "react";

export interface BaseEmailProps {
  children: React.ReactNode;
  previewText?: string;
}

export function BaseEmail({ children, previewText }: BaseEmailProps) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {previewText && (
          <div
            style={{
              display: "none",
              overflow: "hidden",
              lineHeight: "1px",
              opacity: 0,
              maxHeight: 0,
              maxWidth: 0,
            }}
          >
            {previewText}
          </div>
        )}
      </head>
      <body
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          margin: 0,
          padding: 0,
          backgroundColor: "#f6f9fc",
        }}
      >
        <table
          width="100%"
          cellPadding="0"
          cellSpacing="0"
          style={{ backgroundColor: "#f6f9fc" }}
        >
          <tr>
            <td align="center" style={{ padding: "40px 20px" }}>
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "8px",
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                  maxWidth: "600px",
                }}
              >
                <tr>
                  <td style={{ padding: "40px" }}>{children}</td>
                </tr>
              </table>

              {/* Footer */}
              <table
                width="600"
                cellPadding="0"
                cellSpacing="0"
                style={{ maxWidth: "600px", marginTop: "20px" }}
              >
                <tr>
                  <td
                    align="center"
                    style={{
                      padding: "20px",
                      fontSize: "12px",
                      color: "#8898aa",
                    }}
                  >
                    <p style={{ margin: 0 }}>
                      This email was sent by your application. If you have any
                      questions, please contact support.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

export const EmailButton: React.FC<{
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ href, children, style }) => (
  <a
    href={href}
    style={{
      display: "inline-block",
      padding: "12px 24px",
      backgroundColor: "#2563eb",
      color: "#ffffff",
      textDecoration: "none",
      borderRadius: "6px",
      fontWeight: "600",
      fontSize: "14px",
      ...style,
    }}
  >
    {children}
  </a>
);

export const EmailHeading: React.FC<{
  children: React.ReactNode;
  level?: 1 | 2 | 3;
}> = ({ children, level = 1 }) => {
  const styles = {
    1: {
      fontSize: "28px",
      fontWeight: "700",
      color: "#1f2937",
      margin: "0 0 20px 0",
    },
    2: {
      fontSize: "24px",
      fontWeight: "600",
      color: "#1f2937",
      margin: "0 0 16px 0",
    },
    3: {
      fontSize: "20px",
      fontWeight: "600",
      color: "#1f2937",
      margin: "0 0 12px 0",
    },
  };

  const Tag = `h${level}` as "h1" | "h2" | "h3";

  return React.createElement(Tag, { style: styles[level] }, children);
};

export const EmailText: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <p
    style={{
      fontSize: "16px",
      lineHeight: "1.6",
      color: "#374151",
      margin: "0 0 16px 0",
      ...style,
    }}
  >
    {children}
  </p>
);
