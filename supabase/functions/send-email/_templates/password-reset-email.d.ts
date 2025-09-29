// supabase/functions/send-email/_templates/password-reset-email.d.ts 
import * as React from "npm:react@18.3.1";
export interface PasswordResetEmailProps {
    userName?: string;
    resetUrl: string;
    organizationName?: string;
}
export declare function PasswordResetEmail({ userName, resetUrl, organizationName, }: PasswordResetEmailProps): React.ReactElement;
//# sourceMappingURL=password-reset-email.d.ts.map