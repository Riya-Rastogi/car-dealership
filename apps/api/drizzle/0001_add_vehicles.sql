CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"category" text NOT NULL,
	"price_cents" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"year" smallint,
	"description" text,
	"image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_price_non_negative" CHECK ("vehicles"."price_cents" >= 0),
	CONSTRAINT "vehicles_quantity_non_negative" CHECK ("vehicles"."quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX "vehicles_make_model_idx" ON "vehicles" USING btree ("make","model");--> statement-breakpoint
CREATE INDEX "vehicles_category_idx" ON "vehicles" USING btree ("category");--> statement-breakpoint
CREATE INDEX "vehicles_price_idx" ON "vehicles" USING btree ("price_cents");--> statement-breakpoint
CREATE INDEX "vehicles_quantity_idx" ON "vehicles" USING btree ("quantity");