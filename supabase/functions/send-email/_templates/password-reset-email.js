// supabase/functions/send-email/_templates/password-reset-email.js 
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
exports.PasswordResetEmail = PasswordResetEmail;
const React = __importStar(require("npm:react@18.3.1"));
const base_email_tsx_1 = require("./base-email.tsx");
function PasswordResetEmail({ userName, resetUrl, organizationName, }) {
    const previewText = "Reset your password - action required";
    return (<base_email_tsx_1.BaseEmail previewText={previewText}>
      <base_email_tsx_1.EmailHeading>Reset Your Password</base_email_tsx_1.EmailHeading>

      {userName && <base_email_tsx_1.EmailText>Hi {userName}!</base_email_tsx_1.EmailText>}

      <base_email_tsx_1.EmailText>
        You requested to reset your password
        {organizationName ? ` for ${organizationName}` : ""}. Click the button
        below to create a new password:
      </base_email_tsx_1.EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <base_email_tsx_1.EmailButton href={resetUrl}>Reset Password</base_email_tsx_1.EmailButton>
      </div>

      <base_email_tsx_1.EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        This link will expire in 1 hour for security reasons.
      </base_email_tsx_1.EmailText>

      <base_email_tsx_1.EmailText style={{
            fontSize: "14px",
            color: "#6b7280",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "16px",
            marginTop: "32px",
        }}>
        If you didn&apos;t request this password reset, you can safely ignore
        this email. Your password will not be changed.
      </base_email_tsx_1.EmailText>
    </base_email_tsx_1.BaseEmail>);
}
