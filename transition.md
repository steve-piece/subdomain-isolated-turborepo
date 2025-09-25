Of course. Here is a sequential, step-by-step plan to implement the new authentication flow, including validation tests and steps to remove old functionality.

This plan integrates the goals from `auth.md` with the technical details from your existing plan. We will proceed by first updating the database schema and logic, then adjusting the application code, and finally, testing the complete flow before cleaning up deprecated code.

---

### \#\# Phase 1: Database Migration 🚀

The first step is to create the database foundation for the new two-phase organization creation process. This involves a single SQL migration file.

1.  **Add `is_active` Column**: Modify the `organizations` table to include a status flag. This column will distinguish between organizations that have completed email verification and those that have not.

    ```sql
    ALTER TABLE public.organizations
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT FALSE;
    ```

2.  **Create `create_new_organization` Function**: This function will be called automatically when a new user signs up. It creates the initial, _inactive_ organization record.

    ```sql
    CREATE OR REPLACE FUNCTION public.create_new_organization()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Validate required metadata
      IF NOT (NEW.raw_user_meta_data ? 'company_name' AND NEW.raw_user_meta_data ? 'subdomain' AND NEW.raw_user_meta_data->>'user_role' = 'owner') THEN
        RETURN NEW;
      END IF;

      -- Insert a new inactive organization
      INSERT INTO public.organizations (name, subdomain, owner_id)
      VALUES (
        NEW.raw_user_meta_data->>'company_name',
        NEW.raw_user_meta_data->>'subdomain',
        NEW.id
      );
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ```

3.  **Create User Creation Trigger**: This trigger will automatically execute the `create_new_organization` function every time a new user is added to `auth.users`, ensuring the process is seamless.

    ```sql
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.create_new_organization();
    ```

4.  **Create `bootstrap_organization` Function**: This function activates the organization. It will be called from our application after the user successfully verifies their email. It's designed to be **idempotent**, meaning it can be run multiple times without causing issues.

    ```sql
    CREATE OR REPLACE FUNCTION public.bootstrap_organization(p_user_id UUID, p_subdomain TEXT)
    RETURNS UUID AS $$
    DECLARE
      v_org_id UUID;
      v_company_name TEXT;
    BEGIN
      -- Find the pending organization for the user and subdomain
      SELECT id, name INTO v_org_id, v_company_name
      FROM public.organizations
      WHERE owner_id = p_user_id AND subdomain = p_subdomain AND is_active = FALSE;

      IF v_org_id IS NULL THEN
        -- Org might already be active, or doesn't exist. Return existing org_id if active.
        SELECT id INTO v_org_id FROM public.organizations WHERE owner_id = p_user_id AND subdomain = p_subdomain AND is_active = TRUE;
        RETURN v_org_id;
      END IF;

      -- 1. Activate the organization
      UPDATE public.organizations SET is_active = TRUE WHERE id = v_org_id;

      -- 2. Create user profile (if not exists)
      INSERT INTO public.user_profiles (id, full_name, org_id, role)
      VALUES (p_user_id, (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = p_user_id), v_org_id, 'owner')
      ON CONFLICT (id) DO NOTHING;

      -- 3. Create the tenant (if not exists)
      INSERT INTO public.tenants (org_id, subdomain, name)
      VALUES (v_org_id, p_subdomain, v_company_name)
      ON CONFLICT (org_id) DO NOTHING;

      RETURN v_org_id;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    ```

5.  **Set Permissions**: Grant usage rights to the `authenticated` role for the function that will be called from the application.

    ```sql
    GRANT EXECUTE ON FUNCTION public.bootstrap_organization(UUID, TEXT) TO authenticated;
    ```

---

### \#\# Phase 2: Application Code Updates 💻

With the database ready, we'll now update the marketing and protected apps to use the new flow.

1.  **Update Marketing App Signup Form**: Modify `apps/marketing/components/organization-signup-form.tsx`. The goal is to stop creating the organization from the client-side and instead tell Supabase where to redirect the user for email confirmation.
    - **Add `emailRedirectTo`**: Update the `supabase.auth.signUp` call to include the correctly formatted redirect URL.
      ```typescript
      // In organization-signup-form.tsx
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: userName,
            company_name: organizationName,
            subdomain: normalizedSubdomain,
            user_role: "owner",
          },
          // Add this line
          emailRedirectTo: `https://${normalizedSubdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN}/auth/confirm`,
        },
      });
      ```
    - **Remove Old Logic**: Delete the server action call (`createOrgAction`) that previously called the `handle_owner_signup` RPC. The database trigger now handles this automatically.

2.  **Update Protected App Confirmation Route**: Adjust `apps/protected/app/s/[subdomain]/auth/confirm/route.ts` to call our new `bootstrap_organization` function.
    - **Call New RPC**: After `verifyOtp` succeeds, get the user's session and call the new function. The code already has a retry loop, which is great. We just need to ensure it calls the correct function with the correct parameters.
      ```typescript
      // In confirm/route.ts, within the retry loop
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session) {
        // This is the updated part
        await supabase.rpc("bootstrap_organization", {
          p_user_id: sessionData.session.user.id,
          p_subdomain: subdomain, // The subdomain from the URL
        });
        break; // Exit loop on success
      }
      ```

---

### \#\# Phase 3: Validation and Testing ✅

Before removing old code, we must verify the new flow works end-to-end.

1.  **Database Function Tests**:
    - **Trigger Test**: Manually insert a test user into `auth.users` with the required metadata (`company_name`, `subdomain`, `user_role: 'owner'`). Immediately query the `organizations` table to confirm a new row was created with `is_active = false`.
    - **Bootstrap Test**: Manually call `SELECT bootstrap_organization('test_user_id', 'test_subdomain')` and verify that the corresponding organization is set to `is_active = true`, and that rows are created in `user_profiles` and `tenants`.

2.  **End-to-End (E2E) User Flow Test**:
    - Navigate to the signup page in the marketing app.
    - Fill out the form with new test credentials.
    - After submission, check your test email inbox for the confirmation link.
    - **Assert**: The link's URL should be `https://<subdomain>.<your-app-domain>/auth/confirm`.
    - Click the confirmation link.
    - **Assert**: You should be redirected to the login page on the protected app with a "Verification successful" message.
    - Log in using the credentials you signed up with.
    - **Assert**: You should be successfully logged in and redirected to the application dashboard within your specified subdomain.

---

### \#\# Phase 4: Cleanup and Deprecation 🧹

Once all tests pass and the new flow is confirmed to be working correctly, we can safely remove the old, now-unused components.

1.  **Remove Old Database Function**: Drop the now-deprecated RPC function to prevent it from being used accidentally.

    ```sql
    DROP FUNCTION IF EXISTS public.handle_owner_signup(uuid, jsonb);
    ```

2.  **Remove Old Server Action**: Delete the `createOrgAction` server action file (`apps/marketing/app/actions.ts`) from the marketing app codebase.

3.  **Remove Obsolete Tests**: Go through the test suite and delete any unit or integration tests that were specifically written to validate the old `handle_owner_signup` flow. This ensures your test suite remains relevant and fast.
