// supabase/functions/send-custom-email/_templates/base-email.d.ts 
import * as React from "npm:react@18.3.1";
export interface BaseEmailProps {
    children: React.ReactNode;
    previewText?: string;
}
export declare function BaseEmail({ children, previewText, }: BaseEmailProps): React.ReactElement;
export interface EmailButtonProps {
    href: string;
    children: React.ReactNode;
    style?: React.CSSProperties;
}
export declare const EmailButton: React.FC<EmailButtonProps>;
export interface EmailHeadingProps {
    children: React.ReactNode;
    level?: 1 | 2 | 3;
}
export declare const EmailHeading: React.FC<EmailHeadingProps>;
export interface EmailTextProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}
export declare const EmailText: React.FC<EmailTextProps>;
//# sourceMappingURL=base-email.d.ts.map