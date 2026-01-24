# Testing the Schema Migrations Parser

## Quick Test

Since Node.js isn't available in the sandbox environment, here's how to test the script on your machine:

```bash
# Make sure you have Node.js 20+ installed
node --version

# Run the conversion script
node scripts/schema-migrations-to-schema.mjs ./schema_migrations_rows.sql ./schema.sql

# Check the output
head -50 schema.sql
tail -50 schema.sql
```

## Expected Output

The script should:

1. ✅ Read the `schema_migrations_rows.sql` file
2. ✅ Parse all INSERT statements (found 46+ VALUES rows)
3. ✅ Extract SQL statements from each ARRAY column
4. ✅ Sort migrations by version (timestamp)
5. ✅ Generate a `schema.sql` file with all statements in order

## File Structure Analysis

Your file has:
- **6,830 lines** total
- **46+ migration entries** (based on VALUES count)
- Format: Single INSERT statement with multiple VALUES rows
- Each row contains: `('version', ARRAY["SQL statements..."], 'name', 'user', null)`

## Validation Checklist

After running the script, verify:

- [ ] Output file `schema.sql` is created
- [ ] File contains SQL statements (not raw ARRAY format)
- [ ] Migrations are in chronological order (by version timestamp)
- [ ] SQL statements are properly unescaped (no `\\n`, `""`, etc.)
- [ ] All migrations are included (check count matches)
- [ ] Comments and formatting are preserved

## Sample Validation

Check that the output starts with something like:

```sql
-- ============================================================================
-- DECLARATIVE DATABASE SCHEMA
-- Generated from supabase_migrations.schema_migrations table export
-- Generated: 2026-01-21T...
-- 
-- Total Migrations: 46
-- ============================================================================

-- ============================================================================
-- Migration: 20250921093310 - auth_profiles_and_roles_v2
-- ============================================================================

-- 1) Role enum with existence guard
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('superadmin','admin','member','view-only');
  END IF;
END$$;
```

## Troubleshooting

If the script fails:

1. **Check Node.js version**: Requires Node.js 20+
2. **Check file path**: Ensure `schema_migrations_rows.sql` exists
3. **Check file format**: Should be a SQL INSERT statement
4. **Enable debug mode**: Set `DEBUG=1` environment variable for verbose output

## Manual Testing

You can also test the parser logic with the test script:

```bash
node scripts/test-schema-parser.mjs
```

This validates the core parsing functions without processing the full file.
