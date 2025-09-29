// supabase/functions/send-custom-email/_templates/notification-email.js 
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
exports.NotificationEmail = NotificationEmail;
const React = __importStar(require("npm:react@18.3.1"));
const base_email_tsx_1 = require("./base-email.tsx");
function NotificationEmail({ userName, organizationName, notificationTitle, notificationMessage, actionUrl, actionText, }) {
    return (<base_email_tsx_1.BaseEmail previewText={notificationTitle}>
      <base_email_tsx_1.EmailHeading>{notificationTitle}</base_email_tsx_1.EmailHeading>
      <base_email_tsx_1.EmailText>Hi {userName},</base_email_tsx_1.EmailText>
      <base_email_tsx_1.EmailText>{notificationMessage}</base_email_tsx_1.EmailText>

      {actionUrl && actionText && (<div style={{ textAlign: "center", margin: "32px 0" }}>
          <base_email_tsx_1.EmailButton href={actionUrl}>{actionText}</base_email_tsx_1.EmailButton>
        </div>)}

      <base_email_tsx_1.EmailText style={{ fontSize: "14px", color: "#6b7280" }}>
        From your {organizationName} team
      </base_email_tsx_1.EmailText>
    </base_email_tsx_1.BaseEmail>);
}
