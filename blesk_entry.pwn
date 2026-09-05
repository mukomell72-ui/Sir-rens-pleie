#include <a_samp>

/*
    BLESK RUSSIA - interactive entry menu
    ------------------------------------------------------------
    This is NOT a static picture. The screen is made entirely
    with SA-MP PlayerTextDraws and appears once after first spawn.

    Features:
    - dark / cyan glitch-style entry interface
    - clickable PLAY / NEWS / SETTINGS / EXIT
    - player is frozen while the entry menu is open
    - /entrymenu can reopen the screen for testing
*/

#define BLESK_CYAN          0x42D9E9FF
#define BLESK_CYAN_SOFT     0x42D9E988
#define BLESK_WHITE         0xF2F5F6FF
#define BLESK_GREY          0x87969FFF
#define BLESK_DARK          0x05090DE8
#define BLESK_DARK_2        0x0B151BEA
#define BLESK_RED_SOFT      0xE54B4B99

#define DIALOG_BLESK_NEWS       8750
#define DIALOG_BLESK_SETTINGS   8751

#define TD_COUNT 24

new PlayerText:gEntryTD[MAX_PLAYERS][TD_COUNT];
new bool:gEntryCreated[MAX_PLAYERS];
new bool:gEntryVisible[MAX_PLAYERS];
new bool:gEntrySeen[MAX_PLAYERS];
new gGlitchPhase[MAX_PLAYERS];
new gGlitchTimer = -1;

forward ShowBleskEntry(playerid);
forward BleskGlitchTick();
forward DelayedKick(playerid);

stock PTD_Setup(playerid, index, Float:x, Float:y, const text[], Float:lsx, Float:lsy, color, font = 1)
{
    gEntryTD[playerid][index] = CreatePlayerTextDraw(playerid, x, y, text);
    PlayerTextDrawLetterSize(playerid, gEntryTD[playerid][index], lsx, lsy);
    PlayerTextDrawColor(playerid, gEntryTD[playerid][index], color);
    PlayerTextDrawFont(playerid, gEntryTD[playerid][index], font);
    PlayerTextDrawSetOutline(playerid, gEntryTD[playerid][index], 0);
    PlayerTextDrawSetShadow(playerid, gEntryTD[playerid][index], 0);
    PlayerTextDrawSetProportional(playerid, gEntryTD[playerid][index], 1);
}

stock PTD_Box(playerid, index, Float:x, Float:y, Float:right, Float:height, color)
{
    gEntryTD[playerid][index] = CreatePlayerTextDraw(playerid, x, y, "_");
    PlayerTextDrawLetterSize(playerid, gEntryTD[playerid][index], 0.0, height);
    PlayerTextDrawTextSize(playerid, gEntryTD[playerid][index], right, 0.0);
    PlayerTextDrawUseBox(playerid, gEntryTD[playerid][index], 1);
    PlayerTextDrawBoxColor(playerid, gEntryTD[playerid][index], color);
    PlayerTextDrawFont(playerid, gEntryTD[playerid][index], 1);
}

stock PTD_Button(playerid, index, Float:x, Float:y, Float:right, const text[])
{
    gEntryTD[playerid][index] = CreatePlayerTextDraw(playerid, x, y, text);
    PlayerTextDrawLetterSize(playerid, gEntryTD[playerid][index], 0.315, 1.48);
    PlayerTextDrawTextSize(playerid, gEntryTD[playerid][index], right, 16.0);
    PlayerTextDrawColor(playerid, gEntryTD[playerid][index], BLESK_WHITE);
    PlayerTextDrawUseBox(playerid, gEntryTD[playerid][index], 1);
    PlayerTextDrawBoxColor(playerid, gEntryTD[playerid][index], 0x0D171DBB);
    PlayerTextDrawFont(playerid, gEntryTD[playerid][index], 2);
    PlayerTextDrawSetOutline(playerid, gEntryTD[playerid][index], 0);
    PlayerTextDrawSetShadow(playerid, gEntryTD[playerid][index], 0);
    PlayerTextDrawSetProportional(playerid, gEntryTD[playerid][index], 1);
    PlayerTextDrawSetSelectable(playerid, gEntryTD[playerid][index], 1);
}

stock CreateBleskEntry(playerid)
{
    if (gEntryCreated[playerid]) return 1;

    PTD_Box(playerid, 0, 0.0, 0.0, 640.0, 50.0, BLESK_DARK);
    PTD_Box(playerid, 1, 405.0, 0.0, 640.0, 50.0, 0x0A171CCF);
    PTD_Box(playerid, 2, 447.0, 0.0, 465.0, 50.0, 0x17333A99);
    PTD_Box(playerid, 3, 516.0, 0.0, 525.0, 50.0, 0x275B6399);
    PTD_Box(playerid, 4, 586.0, 0.0, 590.0, 50.0, 0x5BE8E84A);
    PTD_Box(playerid, 5, 400.0, 91.0, 615.0, 0.18, BLESK_CYAN_SOFT);
    PTD_Box(playerid, 6, 432.0, 143.0, 640.0, 0.12, BLESK_RED_SOFT);
    PTD_Box(playerid, 7, 386.0, 214.0, 560.0, 0.16, BLESK_CYAN_SOFT);
    PTD_Box(playerid, 8, 475.0, 287.0, 638.0, 0.12, 0xFFFFFFFF);
    PTD_Box(playerid, 9, 419.0, 351.0, 610.0, 0.15, BLESK_CYAN_SOFT);

    PTD_Setup(playerid, 10, 58.0, 73.0, "BLESK", 0.92, 4.20, 0x2FD9E966, 2);
    PTD_Setup(playerid, 11, 61.0, 75.0, "BLESK", 0.92, 4.20, BLESK_RED_SOFT, 2);
    PTD_Setup(playerid, 12, 59.0, 74.0, "BLESK", 0.92, 4.20, BLESK_WHITE, 2);
    PTD_Setup(playerid, 13, 64.0, 127.0, "R  U  S  S  I  A", 0.26, 1.16, BLESK_GREY, 2);
    PTD_Setup(playerid, 14, 463.0, 43.0, "BLESK // NODE 01", 0.18, 0.88, BLESK_GREY, 1);
    PTD_Setup(playerid, 15, 501.0, 59.0, "> SERVER ONLINE_", 0.18, 0.88, BLESK_CYAN, 1);

    PTD_Button(playerid, 16, 66.0, 187.0, 262.0, "PLAY");
    PTD_Button(playerid, 17, 66.0, 219.0, 262.0, "NEWS");
    PTD_Button(playerid, 18, 66.0, 251.0, 262.0, "SETTINGS");
    PTD_Button(playerid, 19, 66.0, 283.0, 262.0, "EXIT");
    PTD_Box(playerid, 20, 53.0, 187.0, 59.0, 1.50, BLESK_CYAN);

    PTD_Setup(playerid, 21, 57.0, 373.0, "BLESK RUSSIA // MULTIPLAYER", 0.18, 0.88, BLESK_GREY, 1);
    PTD_Setup(playerid, 22, 57.0, 390.0, "SELECT AN OPTION TO CONTINUE", 0.18, 0.88, BLESK_WHITE, 1);
    PTD_Setup(playerid, 23, 475.0, 386.0, "THE CITY REMEMBERS", 0.16, 0.80, BLESK_GREY, 1);

    gEntryCreated[playerid] = true;
    return 1;
}

stock ShowEntryTextdraws(playerid)
{
    CreateBleskEntry(playerid);
    for (new i = 0; i < TD_COUNT; i++)
    {
        PlayerTextDrawShow(playerid, gEntryTD[playerid][i]);
    }
    return 1;
}

stock HideBleskEntry(playerid, bool:unlock = true)
{
    if (!gEntryCreated[playerid]) return 1;
    for (new i = 0; i < TD_COUNT; i++)
    {
        PlayerTextDrawHide(playerid, gEntryTD[playerid][i]);
    }
    CancelSelectTextDraw(playerid);
    if (unlock) TogglePlayerControllable(playerid, 1);
    gEntryVisible[playerid] = false;
    return 1;
}

public OnFilterScriptInit()
{
    print("[BLESK] Interactive entry menu loaded.");
    gGlitchTimer = SetTimer("BleskGlitchTick", 280, true);
    return 1;
}

public OnFilterScriptExit()
{
    if (gGlitchTimer != -1) KillTimer(gGlitchTimer);
    for (new playerid = 0; playerid < MAX_PLAYERS; playerid++)
    {
        if (!IsPlayerConnected(playerid)) continue;
        if (gEntryVisible[playerid]) HideBleskEntry(playerid, true);
        if (gEntryCreated[playerid])
        {
            for (new i = 0; i < TD_COUNT; i++)
            {
                PlayerTextDrawDestroy(playerid, gEntryTD[playerid][i]);
            }
        }
    }
    return 1;
}

public OnPlayerConnect(playerid)
{
    gEntryCreated[playerid] = false;
    gEntryVisible[playerid] = false;
    gEntrySeen[playerid] = false;
    gGlitchPhase[playerid] = 0;
    return 1;
}

public OnPlayerDisconnect(playerid, reason)
{
    #pragma unused reason
    if (gEntryCreated[playerid])
    {
        for (new i = 0; i < TD_COUNT; i++)
        {
            PlayerTextDrawDestroy(playerid, gEntryTD[playerid][i]);
        }
    }
    gEntryCreated[playerid] = false;
    gEntryVisible[playerid] = false;
    gEntrySeen[playerid] = false;
    return 1;
}

public OnPlayerSpawn(playerid)
{
    if (!gEntrySeen[playerid])
    {
        SetTimerEx("ShowBleskEntry", 800, false, "i", playerid);
    }
    return 1;
}

public ShowBleskEntry(playerid)
{
    if (!IsPlayerConnected(playerid)) return 0;
    if (gEntryVisible[playerid]) return 1;
    gEntrySeen[playerid] = true;
    gEntryVisible[playerid] = true;
    TogglePlayerControllable(playerid, 0);
    ShowEntryTextdraws(playerid);
    SelectTextDraw(playerid, BLESK_CYAN);
    return 1;
}

public OnPlayerClickPlayerTextDraw(playerid, PlayerText:playertextid)
{
    if (!gEntryVisible[playerid]) return 0;

    if (playertextid == gEntryTD[playerid][16])
    {
        HideBleskEntry(playerid, true);
        GameTextForPlayer(playerid, "~w~WELCOME TO ~b~BLESK RUSSIA", 2500, 3);
        return 1;
    }
    if (playertextid == gEntryTD[playerid][17])
    {
        ShowPlayerDialog(playerid, DIALOG_BLESK_NEWS, DIALOG_STYLE_MSGBOX,
            "BLESK RUSSIA // NEWS",
            "Welcome to BLESK RUSSIA.\nThe server is online.\nUse PLAY to enter the game.",
            "BACK", "");
        return 1;
    }
    if (playertextid == gEntryTD[playerid][18])
    {
        ShowPlayerDialog(playerid, DIALOG_BLESK_SETTINGS, DIALOG_STYLE_MSGBOX,
            "BLESK RUSSIA // SETTINGS",
            "Client settings can be changed from the game pause menu.\nPress BACK to return.",
            "BACK", "");
        return 1;
    }
    if (playertextid == gEntryTD[playerid][19])
    {
        SendClientMessage(playerid, BLESK_GREY, "BLESK RUSSIA: disconnecting...");
        HideBleskEntry(playerid, false);
        SetTimerEx("DelayedKick", 250, false, "i", playerid);
        return 1;
    }
    return 1;
}

public OnDialogResponse(playerid, dialogid, response, listitem, inputtext[])
{
    #pragma unused response
    #pragma unused listitem
    #pragma unused inputtext
    if ((dialogid == DIALOG_BLESK_NEWS || dialogid == DIALOG_BLESK_SETTINGS) && gEntryVisible[playerid])
    {
        SelectTextDraw(playerid, BLESK_CYAN);
        return 1;
    }
    return 0;
}

public OnPlayerCommandText(playerid, cmdtext[])
{
    if (!strcmp(cmdtext, "/entrymenu", true))
    {
        ShowBleskEntry(playerid);
        return 1;
    }
    return 0;
}

public BleskGlitchTick()
{
    for (new playerid = 0; playerid < MAX_PLAYERS; playerid++)
    {
        if (!IsPlayerConnected(playerid) || !gEntryVisible[playerid] || !gEntryCreated[playerid]) continue;
        gGlitchPhase[playerid]++;
        if (gGlitchPhase[playerid] > 5) gGlitchPhase[playerid] = 0;
        switch (gGlitchPhase[playerid])
        {
            case 1: PlayerTextDrawSetString(playerid, gEntryTD[playerid][10], "BL_SK");
            case 2: PlayerTextDrawSetString(playerid, gEntryTD[playerid][10], "BLESK");
            case 4: PlayerTextDrawSetString(playerid, gEntryTD[playerid][11], "BLES_");
            case 5: PlayerTextDrawSetString(playerid, gEntryTD[playerid][11], "BLESK");
        }
    }
    return 1;
}

public DelayedKick(playerid)
{
    if (IsPlayerConnected(playerid)) Kick(playerid);
    return 1;
}
