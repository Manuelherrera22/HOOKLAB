import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// GET: List members of a workspace
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

    // Fetch members (no join — avoids ambiguous FK issue with accounts table)
    const { data: membersData, error } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("joined_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch account details for each member
    const userIds = (membersData || []).map((m: any) => m.user_id).filter(Boolean);
    let accountsMap: Record<string, { name: string; email: string }> = {};

    if (userIds.length > 0) {
        const { data: accounts } = await supabase
            .from("accounts")
            .select("id, name, email")
            .in("id", userIds);

        if (accounts) {
            for (const a of accounts) {
                accountsMap[a.id] = { name: a.name, email: a.email };
            }
        }
    }

    const members = (membersData || []).map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        role: m.role,
        name: accountsMap[m.user_id]?.name || m.invite_email?.split("@")[0] || "Unknown",
        email: accountsMap[m.user_id]?.email || m.invite_email || "",
        inviteStatus: m.invite_status || "accepted",
        joinedAt: m.joined_at,
    }));

    return NextResponse.json({ members });
}

// POST: Invite a new member
export async function POST(req: Request) {
    const { workspaceId, email, role = "editor" } = await req.json();
    if (!workspaceId || !email) {
        return NextResponse.json({ error: "workspaceId and email required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find user by email
    const { data: account } = await supabase
        .from("accounts")
        .select("id")
        .eq("email", cleanEmail)
        .maybeSingle();

    if (account) {
        // User exists — check if already a member
        const { data: existingMember } = await supabase
            .from("workspace_members")
            .select("id")
            .eq("workspace_id", workspaceId)
            .eq("user_id", account.id)
            .maybeSingle();

        if (existingMember) {
            return NextResponse.json({ error: "User is already a member" }, { status: 409 });
        }

        // Add directly as accepted member
        const { data, error } = await supabase
            .from("workspace_members")
            .insert({
                workspace_id: workspaceId,
                user_id: account.id,
                role,
                invite_email: cleanEmail,
                invite_status: "accepted",
            })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ member: data, status: "added" });
    } else {
        // User doesn't exist — create pending invite
        // Create a placeholder account for the invited user
        const name = cleanEmail.split("@")[0];
        const { data: newAccount } = await supabase
            .from("accounts")
            .insert([{ email: cleanEmail, name, niche: "" }])
            .select("id")
            .single();

        if (!newAccount) {
            return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
        }

        const { data, error } = await supabase
            .from("workspace_members")
            .insert({
                workspace_id: workspaceId,
                user_id: newAccount.id,
                role,
                invite_email: cleanEmail,
                invite_status: "pending",
            })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ member: data, status: "invited" });
    }
}

// PATCH: Update member role
export async function PATCH(req: Request) {
    const { memberId, role } = await req.json();
    if (!memberId || !role) {
        return NextResponse.json({ error: "memberId and role required" }, { status: 400 });
    }

    const { data, error } = await supabase
        .from("workspace_members")
        .update({ role })
        .eq("id", memberId)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ member: data });
}

// DELETE: Remove a member
export async function DELETE(req: Request) {
    const { searchParams } = new URL(req.url);
    const memberId = searchParams.get("memberId");
    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

    // Don't allow removing the owner
    const { data: member } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("id", memberId)
        .single();

    if (member?.role === "owner") {
        return NextResponse.json({ error: "Cannot remove workspace owner" }, { status: 403 });
    }

    const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("id", memberId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
