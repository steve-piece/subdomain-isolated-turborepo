# Authentication Flow

## PHASE ONE: marketing/app/signup

User visits the signup page and fills out the form. This form contains the following fields:

- Company name ->> company_name as string
- Subdomain ->> subdomain as string
- Email ->> email as string
- Full name ->> full_name as string
- Password ->> password as string
- Confirm password --

Once the form is submitted, the completeSignup() function is called, which is a three step process, uses async/await operations, and uses a wrapper around both steps to ensure all data is inserted properly.

### Step 1: This data is inserted into the `auth.users` table using supabase.auth.signUp() function, with the `raw_user_meta_data` column set to the following:

```json
{
    "company_name": "company_name",
    "subdomain": "subdomain",
    "full_name": "full_name"
};
```

### Step 2: Database Function Execution for 'create_new_organization' begins, which maps the data from the new `auth.users` row to the `organizations` table with a is_active status set to false.

### Step 3: Send email verification to user. This email will use the users subdomain in the email redirect url, and will send the user to https://${subdomain}.${NEXT_PUBLIC_MARKETING_DOMAIN}/auth/confirm where the verification token is validated by the server.

## PHASE TWO: Then the server will dynamically send the user to either a 'resend verification' or 'login' page based on the result of the token validation.

If the token validation is successful, a database function 'new_org_activated' is executed to update the organization row with a is_active status set to true, which activates another function that will check if the organization has a tenant, or if the user has a user_profile, and if not, will insert the organization data into the tenants table and the user_profiles table.

## PHASE THREE: Now, the user will have all the necessary data to login to the application within their isolated subdomain app route.

**KEY FEATURES:**

- All server actions are complete either by the database, or within the protected app only which elimiates vulerabilities because each organization is isolated from the other at the url level.

:::mermaid
graph TD
%% PHASE ONE: Signup Process
A[User visits /signup] --> B[Fill form with required fields]
B --> C[Submit form - completeSignup function called]
C --> D[Step 1: supabase.auth.signUp with raw_user_meta_data]
D --> E[Step 2: Execute create_new_organization DB function]
E --> F[Organization created with is_active = false]
F --> G[Step 3: Send email verification with subdomain URL]
G --> H[Redirect to /signup/success - pending state]
H --> I[Show: Check your email message]

    %% PHASE TWO: Email Verification & Activation
    I --> J[User clicks confirmation link]
    J --> K[Redirect to subdomain.domain/auth/confirm]
    K --> L{Token validation successful?}

    L -->|No| M[Redirect to resend verification page]
    L -->|Yes| N[Execute new_org_activated DB function]
    N --> O[Update organization: is_active = true]
    O --> P[Auto-create tenant and user_profile records]
    P --> Q[Redirect to login page]

    %% PHASE THREE: Isolated Subdomain Access
    Q --> R[User can now login at subdomain.app.domain]
    R --> S[Login Successful: Redirect to dashboard]

    %% Error paths
    M --> T[User can resend verification email]
    T --> J

    class A,B,C,D,E,F,G,H,I phaseOne
    class J,K,L,N,O,P,Q phaseTwo
    class R,S phaseThree
    class M,T error

:::
