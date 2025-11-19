


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_token" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_inv_id uuid;
  v_org uuid;
  v_role text;
begin
  select id, organization_id, role into v_inv_id, v_org, v_role
  from public.organization_invitations
  where token = p_token and status = 'pending' and (expires_at is null or expires_at > now())
  limit 1;

  if v_inv_id is null then
    raise exception 'Invitation not found or expired';
  end if;

  -- add membership (if not exists)
  insert into public.organization_members (id, organization_id, user_id, role)
  values (gen_random_uuid(), v_org, auth.uid(), v_role)
  on conflict (organization_id, user_id) do update set role = excluded.role;

  -- mark invitation accepted
  update public.organization_invitations
  set status = 'accepted', invitee_user_id = auth.uid()
  where id = v_inv_id;

  return v_org;
end;
$$;


ALTER FUNCTION "public"."accept_invitation"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clean_expired_invites"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_count int := 0;
begin
  update public.organization_invitations set status = 'expired' where status = 'pending' and expires_at is not null and expires_at < now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."clean_expired_invites"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clone_template_tasks"("p_vehicle_id" "uuid", "p_template_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_count int := 0;
begin
  insert into public.maintenance_items (
    id, vehicle_id, template_task_id, title, system, interval_miles, interval_months,
    risk_level, est_cost_diy, est_cost_shop, est_time_hours, notes, created_at
  )
  select
    gen_random_uuid(),
    p_vehicle_id,
    t.id,
    t.task_name,
    t.system,
    t.interval_miles,
    t.interval_months,
    t.risk_level,
    t.est_cost_diy,
    t.est_cost_shop,
    t.est_time_hours,
    t.notes,
    now()
  from public.template_tasks t
  where t.template_id = p_template_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."clone_template_tasks"("p_vehicle_id" "uuid", "p_template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_maintenance_items_from_template"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.maintenance_items (
    vehicle_id, organization_id, template_task_id,
    title, system, interval_miles, interval_months,
    risk_level, est_cost_diy, est_cost_shop, est_time_hours,
    notes, reminder_enabled, is_recurring
  )
  SELECT 
    NEW.id, NEW.organization_id, tt.id,
    tt.task_name, tt.system, tt.interval_miles, tt.interval_months,
    tt.risk_level, tt.est_cost_diy, tt.est_cost_shop, tt.est_time_hours,
    tt.notes, true, true
  FROM public.template_tasks tt
  WHERE tt.template_id = NEW.template_id;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_maintenance_items_from_template"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_first_organization_for_user"("p_user" "uuid") RETURNS "uuid"
    LANGUAGE "sql" STABLE
    AS $$
  select organization_id from public.organization_members where user_id = p_user limit 1;
$$;


ALTER FUNCTION "public"."get_first_organization_for_user"("p_user" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_personal_org_for_user"("p_user" "uuid", "p_name" "text" DEFAULT 'My Fleet'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_org uuid;
  use_name text := NULLIF(trim(p_name), '');
BEGIN
  SELECT organization_id
    INTO existing_org
    FROM public.organization_members
   WHERE user_id = p_user
   ORDER BY created_at
   LIMIT 1;

  IF existing_org IS NOT NULL THEN
    RETURN existing_org;
  END IF;

  INSERT INTO public.organizations (name, owner_id, metadata)
  VALUES (COALESCE(use_name, 'My Fleet'), p_user, jsonb_build_object('type', 'personal', 'auto_created', true))
  RETURNING id INTO existing_org;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (existing_org, p_user, 'owner');

  RETURN existing_org;
END;
$$;


ALTER FUNCTION "public"."ensure_personal_org_for_user"("p_user" "uuid", "p_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  org_id uuid;
BEGIN
  -- Create personal organization
  INSERT INTO public.organizations (name, owner_id)
  VALUES ('My Fleet', NEW.id)
  RETURNING id INTO org_id;

  -- Add user as owner of their org
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (org_id, NEW.id, 'owner');

  -- Optional: Create profile
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_task_complete"("p_item_id" "uuid", "p_mileage" integer, "p_cost" numeric, "p_time_hours" numeric, "p_completed_at" timestamp with time zone DEFAULT "now"()) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_vehicle_id uuid;
  v_interval_miles int;
  v_interval_months int;
  v_new_log_id uuid := gen_random_uuid();
  v_last_date date := p_completed_at::date;
begin
  select vehicle_id, interval_miles, interval_months
  into v_vehicle_id, v_interval_miles, v_interval_months
  from public.maintenance_items
  where id = p_item_id;

  if v_vehicle_id is null then
    raise exception 'maintenance_item % not found', p_item_id;
  end if;

  insert into public.maintenance_logs (
    id, maintenance_item_id, vehicle_id, user_id, mileage, cost, time_spent_hours, completed_at, created_at
  ) values (
    v_new_log_id, p_item_id, v_vehicle_id, auth.uid(), p_mileage, p_cost, p_time_hours, p_completed_at, now()
  );

  update public.maintenance_items
  set
    last_completed_mileage = p_mileage,
    last_completed_date = v_last_date,
    next_due_mileage = CASE
      WHEN interval_miles is not null then p_mileage + interval_miles
      ELSE next_due_mileage
    END,
    next_due_date = CASE
      WHEN interval_months is not null then (v_last_date + (interval_months || ' months')::interval)::date
      ELSE next_due_date
    END
  where id = p_item_id;

  return v_new_log_id;
end;
$$;


ALTER FUNCTION "public"."mark_task_complete"("p_item_id" "uuid", "p_mileage" integer, "p_cost" numeric, "p_time_hours" numeric, "p_completed_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_upcoming_tasks"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- placeholder: notify users of upcoming tasks (implementation depends on notification system)
  return;
end;
$$;


ALTER FUNCTION "public"."notify_upcoming_tasks"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_next_due"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- placeholder: iterate orgs and call recalc_next_due_for_org
  perform public.recalc_next_due_for_org(org.id) from (select id from public.organizations) org;
  return;
end;
$$;


ALTER FUNCTION "public"."recalc_next_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_next_due_for_org"("p_org_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_count int := 0;
begin
  update public.maintenance_items mi
  set next_due_mileage = case when mi.interval_miles is not null and v.odometer is not null then mi.last_completed_mileage + mi.interval_miles else mi.next_due_mileage end,
      next_due_date = case when mi.interval_months is not null and mi.last_completed_date is not null then (mi.last_completed_date + (mi.interval_months || ' months')::interval)::date else mi.next_due_date end
  from (
    select v.id, v.organization_id, v.odometer from public.vehicles v where v.organization_id = p_org_id
  ) v
  where mi.vehicle_id = v.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  return v_count;
end;
$$;


ALTER FUNCTION "public"."recalc_next_due_for_org"("p_org_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_invitation"("p_invitation_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_org uuid;
begin
  select organization_id into v_org from public.organization_invitations where id = p_invitation_id;
  if v_org is null then
    raise exception 'Invitation not found';
  end if;

  update public.organization_invitations set status = 'revoked' where id = p_invitation_id;
  return true;
end;
$$;


ALTER FUNCTION "public"."revoke_invitation"("p_invitation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_next_due"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.last_completed_mileage IS NOT NULL THEN
    NEW.next_due_mileage := NEW.last_completed_mileage + COALESCE(NEW.interval_miles, 0);
  END IF;

  IF NEW.last_completed_date IS NOT NULL THEN
    NEW.next_due_date := NEW.last_completed_date + COALESCE(NEW.interval_months, 0) * INTERVAL '1 month';
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_next_due"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_role_in_org"("p_user" "uuid", "p_org" "uuid") RETURNS "text"
    LANGUAGE "sql" STABLE
    AS $$
  select role from public.organization_members where user_id = p_user and organization_id = p_org limit 1;
$$;


ALTER FUNCTION "public"."user_role_in_org"("p_user" "uuid", "p_org" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "organization_id" "uuid",
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "changes" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fuel_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "miles_driven" numeric NOT NULL,
    "gallons" numeric NOT NULL,
    "cost" numeric,
    "filled_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "organization_id" "uuid" NOT NULL,
    "mpg" numeric GENERATED ALWAYS AS (("miles_driven" / "gallons")) STORED
);


ALTER TABLE "public"."fuel_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "template_task_id" "uuid",
    "title" "text" NOT NULL,
    "system" "text",
    "interval_miles" integer,
    "interval_months" integer,
    "risk_level" "text",
    "est_cost_diy" numeric,
    "est_cost_shop" numeric,
    "est_time_hours" numeric,
    "notes" "text",
    "reminder_enabled" boolean DEFAULT true,
    "last_completed_mileage" integer,
    "last_completed_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "is_recurring" boolean DEFAULT true,
    "one_time_date" "date",
    "organization_id" "uuid" NOT NULL,
    CONSTRAINT "maintenance_items_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"])))
);


ALTER TABLE "public"."maintenance_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."maintenance_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "maintenance_item_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "mileage" integer,
    "cost" numeric,
    "time_spent_hours" numeric,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "receipt_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "provider_id" "uuid"
);


ALTER TABLE "public"."maintenance_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "inviter_id" "uuid",
    "invitee_email" "text" NOT NULL,
    "invitee_user_id" "uuid",
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_invitations_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"]))),
    CONSTRAINT "organization_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'revoked'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "organization_members_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text", 'viewer'::"text"])))
);


ALTER TABLE "public"."organization_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "owner_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text",
    "email" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminder_queue" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "maintenance_item_id" "uuid" NOT NULL,
    "due_date" "date" NOT NULL,
    "due_mileage" integer,
    "type" "text",
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "reminder_queue_type_check" CHECK (("type" = ANY (ARRAY['email'::"text", 'push'::"text", 'in_app'::"text"])))
);


ALTER TABLE "public"."reminder_queue" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."service_providers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "phone" "text",
    "address" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."service_providers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "task_name" "text" NOT NULL,
    "system" "text",
    "interval_miles" integer,
    "interval_months" integer,
    "est_cost_diy" numeric,
    "est_cost_shop" numeric,
    "est_time_hours" numeric,
    "risk_level" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "template_tasks_risk_level_check" CHECK (("risk_level" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text"])))
);


ALTER TABLE "public"."template_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "make" "text",
    "model" "text",
    "year" integer,
    "engine" "text",
    "nickname" "text",
    "vin" "public"."citext",
    "odometer" integer DEFAULT 0,
    "image_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."vehicles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."vehicle_health" AS
 SELECT "v"."id" AS "vehicle_id",
    "v"."nickname",
    "v"."odometer",
    "count"("mi"."id") FILTER (WHERE ("mi"."deleted_at" IS NULL)) AS "total_maintenance_items",
    "count"("ml"."id") AS "completed_items"
   FROM (("public"."vehicles" "v"
     LEFT JOIN "public"."maintenance_items" "mi" ON (("mi"."vehicle_id" = "v"."id")))
     LEFT JOIN "public"."maintenance_logs" "ml" ON (("ml"."maintenance_item_id" = "mi"."id")))
  WHERE ("v"."deleted_at" IS NULL)
  GROUP BY "v"."id", "v"."nickname", "v"."odometer";


ALTER VIEW "public"."vehicle_health" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vehicle_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text",
    "make" "text" NOT NULL,
    "model" "text" NOT NULL,
    "year" integer,
    "engine" "text",
    "transmission" "text",
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."vehicle_templates" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_items"
    ADD CONSTRAINT "maintenance_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."maintenance_logs"
    ADD CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_invitee_email_stat_key" UNIQUE ("organization_id", "invitee_email", "status");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_user_id_key" UNIQUE ("organization_id", "user_id");



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminder_queue"
    ADD CONSTRAINT "reminder_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."service_providers"
    ADD CONSTRAINT "service_providers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_tasks"
    ADD CONSTRAINT "template_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_templates"
    ADD CONSTRAINT "vehicle_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicle_templates"
    ADD CONSTRAINT "vehicle_templates_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_vin_key" UNIQUE ("vin");



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_vin_unique" UNIQUE ("vin");



CREATE INDEX "idx_fuel_logs_vehicle" ON "public"."fuel_logs" USING "btree" ("vehicle_id");



CREATE INDEX "idx_invites_org_email" ON "public"."organization_invitations" USING "btree" ("organization_id", "invitee_email");



CREATE INDEX "idx_maintenance_items_active" ON "public"."maintenance_items" USING "btree" ("vehicle_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_maintenance_items_org" ON "public"."maintenance_items" USING "btree" ("organization_id");



CREATE INDEX "idx_maintenance_items_vehicle" ON "public"."maintenance_items" USING "btree" ("vehicle_id");



CREATE INDEX "idx_maintenance_logs_item" ON "public"."maintenance_logs" USING "btree" ("maintenance_item_id");



CREATE INDEX "idx_org_members_user_org" ON "public"."organization_members" USING "btree" ("user_id", "organization_id");



CREATE INDEX "idx_reminder_queue_due" ON "public"."reminder_queue" USING "btree" ("due_date") WHERE ("sent_at" IS NULL);



CREATE INDEX "idx_vehicles_active" ON "public"."vehicles" USING "btree" ("organization_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_vehicles_deleted" ON "public"."vehicles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_vehicles_org" ON "public"."vehicles" USING "btree" ("organization_id");



CREATE OR REPLACE TRIGGER "trig_update_next_due" BEFORE INSERT OR UPDATE ON "public"."maintenance_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_next_due"();



CREATE OR REPLACE TRIGGER "trigger_create_maintenance_items" AFTER INSERT ON "public"."vehicles" FOR EACH ROW WHEN (("new"."template_id" IS NOT NULL)) EXECUTE FUNCTION "public"."create_maintenance_items_from_template"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."fuel_logs"
    ADD CONSTRAINT "fuel_logs_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id");



ALTER TABLE ONLY "public"."maintenance_items"
    ADD CONSTRAINT "maintenance_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."maintenance_items"
    ADD CONSTRAINT "maintenance_items_template_task_id_fkey" FOREIGN KEY ("template_task_id") REFERENCES "public"."template_tasks"("id");



ALTER TABLE ONLY "public"."maintenance_items"
    ADD CONSTRAINT "maintenance_items_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_logs"
    ADD CONSTRAINT "maintenance_logs_maintenance_item_id_fkey" FOREIGN KEY ("maintenance_item_id") REFERENCES "public"."maintenance_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."maintenance_logs"
    ADD CONSTRAINT "maintenance_logs_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id");



ALTER TABLE ONLY "public"."maintenance_logs"
    ADD CONSTRAINT "maintenance_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invitee_user_id_fkey" FOREIGN KEY ("invitee_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_members"
    ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminder_queue"
    ADD CONSTRAINT "reminder_queue_maintenance_item_id_fkey" FOREIGN KEY ("maintenance_item_id") REFERENCES "public"."maintenance_items"("id");



ALTER TABLE ONLY "public"."service_providers"
    ADD CONSTRAINT "service_providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id");



ALTER TABLE ONLY "public"."template_tasks"
    ADD CONSTRAINT "template_tasks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."vehicle_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vehicles"
    ADD CONSTRAINT "vehicles_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."vehicle_templates"("id");



CREATE POLICY "invitations_delete_by_owner" ON "public"."organization_invitations" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'owner'::"text")))));



CREATE POLICY "invitations_insert_by_admin" ON "public"."organization_invitations" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "invitations_select_for_invitee_or_org_member" ON "public"."organization_invitations" FOR SELECT USING ((("invitee_user_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "invitations_update_by_admin" ON "public"."organization_invitations" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."maintenance_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "maintenance_items_delete_by_owner" ON "public"."maintenance_items" FOR DELETE USING (("vehicle_id" IN ( SELECT "v"."id"
   FROM ("public"."vehicles" "v"
     JOIN "public"."organization_members" "m" ON (("v"."organization_id" = "m"."organization_id")))
  WHERE (("m"."user_id" = "auth"."uid"()) AND ("m"."role" = 'owner'::"text")))));



CREATE POLICY "maintenance_items_insert_by_admin" ON "public"."maintenance_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."vehicles" "v"
     JOIN "public"."organization_members" "m" ON (("v"."organization_id" = "m"."organization_id")))
  WHERE (("v"."id" = "maintenance_items"."vehicle_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "maintenance_items_select_for_members" ON "public"."maintenance_items" FOR SELECT USING (("vehicle_id" IN ( SELECT "v"."id"
   FROM ("public"."vehicles" "v"
     JOIN "public"."organization_members" "m" ON (("v"."organization_id" = "m"."organization_id")))
  WHERE ("m"."user_id" = "auth"."uid"()))));



CREATE POLICY "maintenance_items_update_by_admin" ON "public"."maintenance_items" FOR UPDATE USING (("vehicle_id" IN ( SELECT "v"."id"
   FROM ("public"."vehicles" "v"
     JOIN "public"."organization_members" "m" ON (("v"."organization_id" = "m"."organization_id")))
  WHERE (("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("vehicle_id" IN ( SELECT "v"."id"
   FROM ("public"."vehicles" "v"
     JOIN "public"."organization_members" "m" ON (("v"."organization_id" = "m"."organization_id")))
  WHERE (("m"."user_id" = "auth"."uid"()) AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."maintenance_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "maintenance_logs_delete_by_owner_admin" ON "public"."maintenance_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."maintenance_items" "mi"
     JOIN "public"."vehicles" "v" ON (("mi"."vehicle_id" = "v"."id")))
     JOIN "public"."organization_members" "om" ON (("v"."organization_id" = "om"."organization_id")))
  WHERE (("mi"."id" = "maintenance_logs"."maintenance_item_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "maintenance_logs_insert_for_members" ON "public"."maintenance_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."maintenance_items" "mi"
     JOIN "public"."vehicles" "v" ON (("mi"."vehicle_id" = "v"."id")))
     JOIN "public"."organization_members" "om" ON (("v"."organization_id" = "om"."organization_id")))
  WHERE (("mi"."id" = "maintenance_logs"."maintenance_item_id") AND ("om"."user_id" = "auth"."uid"()) AND ("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'member'::"text"]))))));



CREATE POLICY "maintenance_logs_select_for_members" ON "public"."maintenance_logs" FOR SELECT USING ((("deleted_at" IS NULL) AND (EXISTS ( SELECT 1
   FROM (("public"."maintenance_items" "mi"
     JOIN "public"."vehicles" "v" ON (("mi"."vehicle_id" = "v"."id")))
     JOIN "public"."organization_members" "om" ON (("v"."organization_id" = "om"."organization_id")))
  WHERE (("mi"."id" = "maintenance_logs"."maintenance_item_id") AND ("mi"."deleted_at" IS NULL) AND ("v"."deleted_at" IS NULL) AND ("om"."user_id" = "auth"."uid"()))))));



CREATE POLICY "maintenance_logs_update_by_owner_admin_or_self" ON "public"."maintenance_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."maintenance_items" "mi"
     JOIN "public"."vehicles" "v" ON (("mi"."vehicle_id" = "v"."id")))
     JOIN "public"."organization_members" "om" ON (("v"."organization_id" = "om"."organization_id")))
  WHERE (("mi"."id" = "maintenance_logs"."maintenance_item_id") AND ("om"."user_id" = "auth"."uid"()) AND (("om"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])) OR ("maintenance_logs"."user_id" = "auth"."uid"()))))));



CREATE POLICY "org access" ON "public"."vehicles" USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organization_members_delete_by_owner" ON "public"."organization_members" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = 'owner'::"text")))));



CREATE POLICY "organization_members_insert_by_admin" ON "public"."organization_members" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "organization_members_select" ON "public"."organization_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE ("organization_members_1"."user_id" = "auth"."uid"())))));



CREATE POLICY "organization_members_update_by_admin" ON "public"."organization_members" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members_1"."organization_id"
   FROM "public"."organization_members" "organization_members_1"
  WHERE (("organization_members_1"."user_id" = "auth"."uid"()) AND ("organization_members_1"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "organizations_delete_by_owner" ON "public"."organizations" FOR DELETE USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'owner'::"text")))));



CREATE POLICY "organizations_insert_by_owner" ON "public"."organizations" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "organizations_select_member" ON "public"."organizations" FOR SELECT USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "organizations_update_by_owner_admin" ON "public"."organizations" FOR UPDATE USING (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_insert_self" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "profiles_select_self" ON "public"."profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vehicles_delete_by_owner" ON "public"."vehicles" FOR DELETE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = 'owner'::"text")))));



CREATE POLICY "vehicles_insert_by_admin" ON "public"."vehicles" FOR INSERT WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));



CREATE POLICY "vehicles_select_for_members" ON "public"."vehicles" FOR SELECT USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE ("organization_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "vehicles_update_by_admin" ON "public"."vehicles" FOR UPDATE USING (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"])))))) WITH CHECK (("organization_id" IN ( SELECT "organization_members"."organization_id"
   FROM "public"."organization_members"
  WHERE (("organization_members"."user_id" = "auth"."uid"()) AND ("organization_members"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text"]))))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextin"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextout"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextrecv"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citextsend"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"(character) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "anon";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"(character) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext"("inet") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "anon";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext"("inet") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_token" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_eq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_hash_extended"("public"."citext", bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_larger"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_ne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_cmp"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_ge"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_gt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_le"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_pattern_lt"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."citext_smaller"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."clean_expired_invites"() TO "anon";
GRANT ALL ON FUNCTION "public"."clean_expired_invites"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clean_expired_invites"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clone_template_tasks"("p_vehicle_id" "uuid", "p_template_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."clone_template_tasks"("p_vehicle_id" "uuid", "p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."clone_template_tasks"("p_vehicle_id" "uuid", "p_template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_maintenance_items_from_template"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_maintenance_items_from_template"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_maintenance_items_from_template"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_first_organization_for_user"("p_user" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_first_organization_for_user"("p_user" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_first_organization_for_user"("p_user" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."ensure_personal_org_for_user"("p_user" "uuid", "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_personal_org_for_user"("p_user" "uuid", "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_personal_org_for_user"("p_user" "uuid", "p_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_task_complete"("p_item_id" "uuid", "p_mileage" integer, "p_cost" numeric, "p_time_hours" numeric, "p_completed_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."mark_task_complete"("p_item_id" "uuid", "p_mileage" integer, "p_cost" numeric, "p_time_hours" numeric, "p_completed_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_task_complete"("p_item_id" "uuid", "p_mileage" integer, "p_cost" numeric, "p_time_hours" numeric, "p_completed_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_upcoming_tasks"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_upcoming_tasks"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_upcoming_tasks"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_next_due"() TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_next_due"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_next_due"() TO "service_role";



GRANT ALL ON FUNCTION "public"."recalc_next_due_for_org"("p_org_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalc_next_due_for_org"("p_org_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."recalc_next_due_for_org"("p_org_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_match"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_matches"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_replace"("public"."citext", "public"."citext", "text", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_array"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."regexp_split_to_table"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."replace"("public"."citext", "public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_invitation"("p_invitation_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_invitation"("p_invitation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_invitation"("p_invitation_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "anon";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."split_part"("public"."citext", "public"."citext", integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."strpos"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticnlike"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexeq"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."texticregexne"("public"."citext", "public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "postgres";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "anon";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."translate"("public"."citext", "public"."citext", "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_next_due"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_next_due"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_next_due"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_role_in_org"("p_user" "uuid", "p_org" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_role_in_org"("p_user" "uuid", "p_org" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_role_in_org"("p_user" "uuid", "p_org" "uuid") TO "service_role";












GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."max"("public"."citext") TO "service_role";



GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "postgres";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "anon";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "authenticated";
GRANT ALL ON FUNCTION "public"."min"("public"."citext") TO "service_role";









GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."fuel_logs" TO "anon";
GRANT ALL ON TABLE "public"."fuel_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."fuel_logs" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_items" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_items" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_items" TO "service_role";



GRANT ALL ON TABLE "public"."maintenance_logs" TO "anon";
GRANT ALL ON TABLE "public"."maintenance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."maintenance_logs" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organization_members" TO "anon";
GRANT ALL ON TABLE "public"."organization_members" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_members" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "anon";
GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reminder_queue" TO "anon";
GRANT ALL ON TABLE "public"."reminder_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."reminder_queue" TO "service_role";



GRANT ALL ON TABLE "public"."service_providers" TO "anon";
GRANT ALL ON TABLE "public"."service_providers" TO "authenticated";
GRANT ALL ON TABLE "public"."service_providers" TO "service_role";



GRANT ALL ON TABLE "public"."template_tasks" TO "anon";
GRANT ALL ON TABLE "public"."template_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."template_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."vehicles" TO "anon";
GRANT ALL ON TABLE "public"."vehicles" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicles" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_health" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_health" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_health" TO "service_role";



GRANT ALL ON TABLE "public"."vehicle_templates" TO "anon";
GRANT ALL ON TABLE "public"."vehicle_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."vehicle_templates" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































