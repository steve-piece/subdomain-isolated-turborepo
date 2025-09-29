// supabase/functions/send-email/_templates/base-email.js 
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailText = exports.EmailHeading = exports.EmailButton = void 0;
exports.BaseEmail = BaseEmail;
const React = __importStar(require("npm:react@18.3.1"));
function BaseEmail({ children, previewText, }) {
    return (<html>
      <head>
        <meta charSet="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        {previewText && (<div style={{
                display: "none",
                overflow: "hidden",
                lineHeight: "1px",
                opacity: 0,
                maxHeight: 0,
                maxWidth: 0,
            }}>
            {previewText}
          </div>)}
      </head>
      <body style={{
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            margin: 0,
            padding: 0,
            backgroundColor: "#f6f9fc",
        }}>
        <table width="100%" cellPadding="0" cellSpacing="0" style={{ backgroundColor: "#f6f9fc" }}>
          <tr>
            <td align="center" style={{ padding: "40px 20px" }}>
              <table width="600" cellPadding="0" cellSpacing="0" style={{
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            maxWidth: "600px",
        }}>
                <tr>
                  <td style={{ padding: "40px" }}>{children}</td>
                </tr>
              </table>

              <table width="600" cellPadding="0" cellSpacing="0" style={{ maxWidth: "600px", marginTop: "20px" }}>
                <tr>
                  <td align="center" style={{
            padding: "20px",
            fontSize: "12px",
            color: "#8898aa",
        }}>
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
    </html>);
}
const EmailButton = ({ href, children, style, }) => (<a href={href} style={{
        display: "inline-block",
        padding: "12px 24px",
        backgroundColor: "#2563eb",
        color: "#ffffff",
        textDecoration: "none",
        borderRadius: "6px",
        fontWeight: "600",
        fontSize: "14px",
        ...style,
    }}>
    {children}
  </a>);
exports.EmailButton = EmailButton;
const EmailHeading = ({ children, level = 1, }) => {
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
    const Tag = `h${level}`;
    return React.createElement(Tag, { style: styles[level] }, children);
};
exports.EmailHeading = EmailHeading;
const EmailText = ({ children, style }) => (<p style={{
        fontSize: "16px",
        lineHeight: "1.6",
        color: "#374151",
        margin: "0 0 16px 0",
        ...style,
    }}>
    {children}
  </p>);
exports.EmailText = EmailText;
