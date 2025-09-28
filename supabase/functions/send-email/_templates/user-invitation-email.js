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
exports.UserInvitationEmail = UserInvitationEmail;
const React = __importStar(require("npm:react@18.3.1"));
const base_email_tsx_1 = require("./base-email.tsx");
function UserInvitationEmail({ organizationName, inviterName, inviterEmail, invitationUrl, userRole, recipientEmail, }) {
    const previewText = `You've been invited to join ${organizationName} by ${inviterName}`;
    return (<base_email_tsx_1.BaseEmail previewText={previewText}>
      <base_email_tsx_1.EmailHeading>
        You&apos;re invited to join {organizationName}!
      </base_email_tsx_1.EmailHeading>

      <base_email_tsx_1.EmailText>
        Hi there! {inviterName} ({inviterEmail}) has invited you to join
        <strong> {organizationName}</strong> as a <strong>{userRole}</strong>.
      </base_email_tsx_1.EmailText>

      <base_email_tsx_1.EmailText>
        Click the button below to accept your invitation and get started:
      </base_email_tsx_1.EmailText>

      <div style={{ textAlign: "center", margin: "32px 0" }}>
        <base_email_tsx_1.EmailButton href={invitationUrl}>Accept Invitation</base_email_tsx_1.EmailButton>
      </div>

      <base_email_tsx_1.EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        <strong>Organization:</strong> {organizationName}
        <br />
        <strong>Your Role:</strong> {userRole}
        <br />
        <strong>Invited by:</strong> {inviterName} ({inviterEmail})
        <br />
        <strong>Your Email:</strong> {recipientEmail}
      </base_email_tsx_1.EmailText>

      <base_email_tsx_1.EmailText style={{
            fontSize: "14px",
            color: "#6b7280",
            borderTop: "1px solid #e5e7eb",
            paddingTop: "16px",
            marginTop: "32px",
        }}>
        This invitation will expire in 7 days. If you don&apos;t recognize this
        organization or didn&apos;t expect this invitation, you can safely
        ignore this email.
      </base_email_tsx_1.EmailText>
    </base_email_tsx_1.BaseEmail>);
}
