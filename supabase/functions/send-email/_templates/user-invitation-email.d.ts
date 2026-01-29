// supabase/functions/send-email/_templates/user-invitation-email.d.ts
import * as React from "npm:react@18.3.1";
export interface UserInvitationEmailProps {
  organizationName: string;
  inviterName: string;
  inviterEmail: string;
  invitationUrl: string;
  userRole: string;
  recipientEmail: string;
}
export declare function UserInvitationEmail({
  organizationName,
  inviterName,
  inviterEmail,
  invitationUrl,
  userRole,
  recipientEmail,
}: UserInvitationEmailProps): React.ReactElement;
//# sourceMappingURL=user-invitation-email.d.ts.map
