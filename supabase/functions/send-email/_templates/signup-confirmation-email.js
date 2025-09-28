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
exports.SignupConfirmationEmail = SignupConfirmationEmail;
const React = __importStar(require("npm:react@18.3.1"));
const base_email_tsx_1 = require("./base-email.tsx");
function SignupConfirmationEmail({ userName, organizationName, confirmationUrl, subdomain, }) {
    const previewText = `Welcome to ${organizationName}! Please confirm your email address.`;
    return (<base_email_tsx_1.BaseEmail previewText={previewText}>
      <base_email_tsx_1.EmailHeading>Welcome to {organizationName}!</base_email_tsx_1.EmailHeading>

      <base_email_tsx_1.EmailText>Hi {userName}!</base_email_tsx_1.EmailText>

      <base_email_tsx_1.EmailText>
        Thank you for creating your organization account. Please click the
        button below to verify your email address and complete your setup:
      </base_email_tsx_1.EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <base_email_tsx_1.EmailButton href={confirmationUrl}>Verify Email Address</base_email_tsx_1.EmailButton>
      </div>

      <base_email_tsx_1.EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        <strong>Organization:</strong> {organizationName}
        <br />
        <strong>Subdomain:</strong> {subdomain}
        <br />
        <strong>Your Role:</strong> Owner
      </base_email_tsx_1.EmailText>

      <base_email_tsx_1.EmailText>
        Once verified, you can access your organization workspace at your
        subdomain URL.
      </base_email_tsx_1.EmailText>

      <base_email_tsx_1.EmailText style={{
            fontSize: "14px",
            color: "#6b7280",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "16px",
            marginTop: "32px",
        }}>
        This link will expire in 24 hours. If you didn&apos;t create this
        account, you can safely ignore this email.
      </base_email_tsx_1.EmailText>
    </base_email_tsx_1.BaseEmail>);
}
