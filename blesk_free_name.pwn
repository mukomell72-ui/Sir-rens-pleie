#include <a_samp>

#define BLESK_NAME_DIALOG 29410
#define BLESK_NAME_MAX 96

new gBleskDisplayName[MAX_PLAYERS][BLESK_NAME_MAX];
new bool:gBleskHasCustomName[MAX_PLAYERS];
new bool:gBleskNameDialogShown[MAX_PLAYERS];
new Text3D:gBleskNameLabel[MAX_PLAYERS];

forward Blesk_ShowNameDialog(playerid);

stock Blesk_DestroyNameLabel(playerid)
{
    if (gBleskNameLabel[playerid] != Text3D:INVALID_3DTEXT_ID)
    {
        Delete3DTextLabel(gBleskNameLabel[playerid]);
        gBleskNameLabel[playerid] = Text3D:INVALID_3DTEXT_ID;
    }
    return 1;
}

stock Blesk_HideNativeNameTag(playerid)
{
    for (new viewer = 0; viewer < MAX_PLAYERS; viewer++)
    {
        if (IsPlayerConnected(viewer))
        {
            ShowPlayerNameTagForPlayer(viewer, playerid, false);
        }
    }
    return 1;
}

stock Blesk_ApplyDisplayName(playerid, const name[])
{
    format(gBleskDisplayName[playerid], BLESK_NAME_MAX, "%s", name);
    gBleskHasCustomName[playerid] = true;

    Blesk_DestroyNameLabel(playerid);
    gBleskNameLabel[playerid] = Create3DTextLabel(
        gBleskDisplayName[playerid],
        0xFFFFFFFF,
        0.0, 0.0, 0.35,
        28.0,
        0,
        1
    );
    Attach3DTextLabelToPlayer(gBleskNameLabel[playerid], playerid, 0.0, 0.0, 0.35);
    Blesk_HideNativeNameTag(playerid);

    new msg[160];
    format(msg, sizeof msg, "BLESK RUSSIA | Display name set: %s", gBleskDisplayName[playerid]);
    SendClientMessage(playerid, 0xFFD21FFF, msg);
    return 1;
}

public OnFilterScriptInit()
{
    print("[BLESK FREE NAME] loaded");
    for (new i = 0; i < MAX_PLAYERS; i++)
    {
        gBleskNameLabel[i] = Text3D:INVALID_3DTEXT_ID;
        gBleskHasCustomName[i] = false;
        gBleskNameDialogShown[i] = false;
    }
    return 1;
}

public OnFilterScriptExit()
{
    for (new i = 0; i < MAX_PLAYERS; i++)
    {
        Blesk_DestroyNameLabel(i);
    }
    return 1;
}

public OnPlayerConnect(playerid)
{
    gBleskNameLabel[playerid] = Text3D:INVALID_3DTEXT_ID;
    gBleskHasCustomName[playerid] = false;
    gBleskNameDialogShown[playerid] = false;
    gBleskDisplayName[playerid][0] = '\0';

    // A newly connected player must not see native tags of players
    // who already use a custom BLESK display name.
    for (new target = 0; target < MAX_PLAYERS; target++)
    {
        if (IsPlayerConnected(target) && gBleskHasCustomName[target])
        {
            ShowPlayerNameTagForPlayer(playerid, target, false);
        }
    }
    return 1;
}

public OnPlayerDisconnect(playerid, reason)
{
    Blesk_DestroyNameLabel(playerid);
    gBleskHasCustomName[playerid] = false;
    gBleskNameDialogShown[playerid] = false;
    return 1;
}

public OnPlayerSpawn(playerid)
{
    if (!gBleskNameDialogShown[playerid])
    {
        gBleskNameDialogShown[playerid] = true;
        SetTimerEx("Blesk_ShowNameDialog", 1800, false, "i", playerid);
    }
    return 1;
}

public Blesk_ShowNameDialog(playerid)
{
    if (!IsPlayerConnected(playerid)) return 0;

    ShowPlayerDialog(
        playerid,
        BLESK_NAME_DIALOG,
        DIALOG_STYLE_INPUT,
        "BLESK RUSSIA | NAME",
        "Enter any display name. Spaces, symbols and Cyrillic are allowed by this server-side display system.\nThis does not change the technical SA-MP connection nickname.",
        "SAVE",
        "LATER"
    );
    return 1;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    if (dialogid != BLESK_NAME_DIALOG) return 0;

    if (!response)
    {
        SendClientMessage(playerid, 0xFFD21FFF, "BLESK RUSSIA | Use /myname whenever you want to set a display name.");
        return 1;
    }

    if (!strlen(inputtext))
    {
        ShowPlayerDialog(playerid, BLESK_NAME_DIALOG, DIALOG_STYLE_INPUT,
            "BLESK RUSSIA | NAME",
            "Name cannot be empty. Enter any display name:",
            "SAVE", "LATER");
        return 1;
    }

    if (strlen(inputtext) >= BLESK_NAME_MAX)
    {
        ShowPlayerDialog(playerid, BLESK_NAME_DIALOG, DIALOG_STYLE_INPUT,
            "BLESK RUSSIA | NAME",
            "Name is too long. Enter a shorter display name:",
            "SAVE", "LATER");
        return 1;
    }

    Blesk_ApplyDisplayName(playerid, inputtext);
    return 1;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/myname", true) || !strcmp(cmdtext, "/nick", true))
    {
        ShowPlayerDialog(
            playerid,
            BLESK_NAME_DIALOG,
            DIALOG_STYLE_INPUT,
            "BLESK RUSSIA | NAME",
            "Enter any display name:",
            "SAVE",
            "CANCEL"
        );
        return 1;
    }
    return 0;
}
