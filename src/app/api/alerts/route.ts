import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// GET: Fetch alerts for an account
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId");
    if (!accountId) {
        return NextResponse.json({ error: "accountId required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("smart_alerts")
        .select("*")
        .eq("account_id", accountId)
        .order("created_at", { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const unreadCount = (data || []).filter((a: any) => !a.is_read).length;
    return NextResponse.json({ alerts: data || [], unreadCount });
}

// PATCH: Mark alert(s) as read
export async function PATCH(req: Request) {
    const { ids, markAllRead, accountId } = await req.json();

    if (markAllRead && accountId) {
        await supabase
            .from("smart_alerts")
            .update({ is_read: true })
            .eq("account_id", accountId)
            .eq("is_read", false);
        return NextResponse.json({ success: true });
    }

    if (ids?.length) {
        await supabase
            .from("smart_alerts")
            .update({ is_read: true })
            .in("id", ids);
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "ids or markAllRead required" }, { status: 400 });
}
